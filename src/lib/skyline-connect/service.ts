import { prisma } from "@/lib/db"
import {
  DEFAULT_MONTHLY_RULE_PARAMS,
  DEFAULT_YEARLY_RULE_PARAMS,
  SLC_DEFAULT_GRADES,
  SLC_DEFAULT_PURPOSES,
  SLC_DEFAULT_SUBJECTS,
  SLC_IDEA_STAR_DESCRIPTIONS,
  SLC_PRODUCT_STAR_DESCRIPTIONS,
  SlcRuleParameters,
} from "./constants"
import {
  canEditOrDeleteComment,
  canPinOrMarkFeedbackOnPost,
  canUserAccessFeatureFlag,
  canUserRateTarget,
  canViewPost,
  hasSlcRoleInScope,
  isEligibleForAudienceHallOfFame,
  isSuperOrCommunityAdmin,
  PostAccessTarget,
  SlcUserContext,
} from "./permissions"
import {
  calculateReviewDeadlineUtc,
  computeDiscoveryRankScore,
  computeExpertScoreE,
  doPeriodRangesOverlap,
  evaluateCandidateForPeriod,
  filterRankedCandidatesKeepingOriginalRank,
  getVietnamMonthBoundsUtc,
  isWithinHalfOpenPeriod,
  rankHallOfFameCandidates,
  selectValidPeriodRatingRevisions,
  selectValidPeriodVerifiedApplications,
} from "./scoring"
import { ensureSlcSchema } from "./schema-init"
import { sanitizeRichText, validateSafeExternalUrl } from "./security"

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Khởi tạo ngữ cảnh quyền hạn và thông tin giáo viên của người dùng hiện tại.
 */
export async function resolveSlcUserContext(sessionUser?: {
  id?: string
  name?: string | null
  email?: string | null
  role?: string | null
  campusIds?: string[]
} | null): Promise<SlcUserContext | null> {
  if (!sessionUser?.id) return null
  await ensureSlcSchema()

  const userId = sessionUser.id
  const pAny = prisma as any

  const [teacher, groupMemberships, ownedGroups, roleAssignments] = await Promise.all([
    prisma.teacher
      .findUnique({
        where: { userId },
        include: {
          campus: true,
          mainSubjectRel: true,
        },
      })
      .catch(() => null),
    pAny.slcGroupMember
      ?.findMany({
        where: { userId, status: "APPROVED" },
      })
      .catch(() => []) ?? [],
    pAny.slcGroup
      ?.findMany({
        where: { ownerId: userId, status: "ACTIVE" },
        select: { id: true },
      })
      .catch(() => []) ?? [],
    pAny.slcUserRoleAssignment
      ?.findMany({
        where: { userId, isActive: true },
      })
      .catch(() => []) ?? [],
  ])

  const approvedGroupIds = Array.from(
    new Set<string>([
      ...groupMemberships.map((m: any) => String(m.groupId)),
      ...ownedGroups.map((g: any) => String(g.id)),
    ])
  )
  const ownedGroupIds = ownedGroups.map((g: any) => String(g.id))
  const moderatedGroupIds = groupMemberships
    .filter((m: any) => m.role === "OWNER" || m.role === "MODERATOR")
    .map((m: any) => String(m.groupId))

  const campusId = teacher?.campusId || sessionUser.campusIds?.[0] || null
  const campusName = teacher?.campus?.campusName || null

  return {
    userId,
    fullName: teacher?.teacherName || sessionUser.name || "Giáo viên Sky-Line",
    email: teacher?.email || sessionUser.email || undefined,
    systemRole: sessionUser.role || "TEACHER",
    teacherId: teacher?.id || null,
    campusId,
    campusName,
    campusIds: Array.from(
      new Set([
        ...(sessionUser.campusIds || []),
        ...(campusId ? [campusId] : []),
      ])
    ),
    mainSubjectCode: teacher?.mainSubjectRel?.subjectCode || null,
    mainSubjectName: teacher?.mainSubjectRel?.subjectName || null,
    approvedGroupIds,
    ownedGroupIds,
    moderatedGroupIds,
    roleAssignments: roleAssignments.map((r: any) => ({
      userId: r.userId,
      role: r.role,
      scopeType: r.scopeType,
      scopeId: r.scopeId,
      isActive: Boolean(r.isActive),
    })),
  }
}

/**
 * Ghi nhận nhật ký kiểm toán (Audit Log) cho các thao tác trong Sky-Line Connect.
 */
export async function recordSlcAuditLog(
  ctx: SlcUserContext,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, any> = {}
) {
  try {
    const pAny = prisma as any
    await pAny.slcAuditLog?.create({
      data: {
        actorId: ctx.userId,
        actorName: ctx.fullName,
        actorRole: ctx.systemRole,
        action,
        targetType,
        targetId,
        detailsJson: JSON.stringify(details),
      },
    })
  } catch (err) {
    console.error("[SkyLineConnect] Audit log error:", err)
  }
}

/**
 * Gửi thông báo nội bộ SSM có chống tự nhắc chính mình và chống lặp lại do retry (idempotencyKey).
 * Tôn trọng quyền truy cập bài và tùy chọn tắt thông báo của người nhận.
 */
export async function dispatchSlcNotification(params: {
  idempotencyKey: string
  recipientId: string
  actorId: string
  eventType:
    | "MENTION"
    | "COMMENT_REPLY"
    | "FEEDBACK_STATUS"
    | "CONTRIBUTOR_CREDIT"
    | "PROJECT_INVITE"
    | "PROJECT_APPROVED"
    | "FOLLOW_UPDATE"
    | "EVIDENCE_DECISION"
    | "MODERATION_NOTICE"
    | "AWARD_RESULT"
  targetType: string
  targetId: string
  postId?: string | null
  title: string
  message: string
  deepLink: string
}): Promise<{ sent: boolean; reason?: string }> {
  // 1. Không tạo thông báo tự nhắc chính mình
  if (!params.recipientId || params.recipientId === params.actorId) {
    return { sent: false, reason: "SELF_NOTIFICATION_SKIPPED" }
  }

  const pAny = prisma as any

  // 2. Kiểm tra tùy chọn thông báo của người nhận và trạng thái tắt thông báo bài
  const [profile, postFollow] = await Promise.all([
    pAny.slcCommunityProfile
      ?.findUnique({ where: { userId: params.recipientId } })
      .catch(() => null),
    params.postId
      ? pAny.slcFollow
          ?.findUnique({
            where: {
              followerId_targetType_targetId: {
                followerId: params.recipientId,
                targetType: "POST",
                targetId: params.postId,
              },
            },
          })
          .catch(() => null)
      : null,
  ])

  if (postFollow?.muteNotifications) {
    return { sent: false, reason: "MUTED_TARGET" }
  }

  if (profile) {
    if (profile.digestMode === "OFF" && params.eventType !== "MODERATION_NOTICE") {
      return { sent: false, reason: "NOTIFICATIONS_OFF" }
    }
    if (params.eventType === "MENTION" && profile.notifyOnMention === false) {
      return { sent: false, reason: "MENTION_DISABLED" }
    }
    if (params.eventType === "COMMENT_REPLY" && profile.notifyOnReply === false) {
      return { sent: false, reason: "REPLY_DISABLED" }
    }
    if (params.eventType === "PROJECT_INVITE" && profile.notifyOnInvite === false) {
      return { sent: false, reason: "INVITE_DISABLED" }
    }
    if (params.eventType === "FOLLOW_UPDATE" && profile.notifyOnFollowedUpdate === false) {
      return { sent: false, reason: "FOLLOW_UPDATE_DISABLED" }
    }
  }

  // 3. Nếu gắn với một bài đăng, kiểm tra người nhận có quyền xem bài đó không (tránh lộ dữ liệu qua thông báo)
  if (params.postId) {
    const post = await pAny.slcPost?.findUnique({ where: { id: params.postId } }).catch(() => null)
    if (post && post.status !== "PUBLISHED" && params.eventType !== "MODERATION_NOTICE") {
      return { sent: false, reason: "POST_NOT_PUBLISHED" }
    }
    if (post && post.visibility === "GROUP" && post.groupId) {
      const group = await pAny.slcGroup?.findUnique({ where: { id: post.groupId } }).catch(() => null)
      const member = await pAny.slcGroupMember
        ?.findUnique({
          where: { groupId_userId: { groupId: post.groupId, userId: params.recipientId } },
        })
        .catch(() => null)
      const isOwner = group?.ownerId === params.recipientId
      if (!isOwner && member?.status !== "APPROVED") {
        return { sent: false, reason: "RECIPIENT_NO_GROUP_ACCESS" }
      }
    }
  }

  // 4. Ghi nhận idempotent log để retry không gửi lặp
  try {
    const existing = await pAny.slcNotificationLog?.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    })
    if (existing) {
      return { sent: false, reason: "DUPLICATE_IDEMPOTENCY_KEY" }
    }

    await pAny.slcNotificationLog?.create({
      data: {
        idempotencyKey: params.idempotencyKey,
        recipientId: params.recipientId,
        actorId: params.actorId,
        eventType: params.eventType,
        targetType: params.targetType,
        targetId: params.targetId,
        title: params.title,
        message: params.message,
        deepLink: params.deepLink,
      },
    })

    // Đồng bộ sang bảng Notification chuẩn của SSM để hiển thị trên chuông thông báo
    await prisma.notification
      .create({
        data: {
          userId: params.recipientId,
          title: params.title,
          message: params.message,
          link: params.deepLink,
          type: "INFORMATION",
          category: "SKYLINE_CONNECT",
          sourceModule: "SKYLINE_CONNECT",
          sourceId: params.targetId,
        },
      })
      .catch(() => null)

    return { sent: true }
  } catch (err: any) {
    if (String(err?.message || "").includes("Unique constraint")) {
      return { sent: false, reason: "DUPLICATE_IDEMPOTENCY_KEY" }
    }
    return { sent: false, reason: "ERROR" }
  }
}

/**
 * Đếm chính xác số bình luận đang hiển thị và còn hoạt động của một bài đăng:
 * - Tính cả bình luận cấp đầu và trả lời (depth 0 và depth 1)
 * - KHÔNG tính placeholder ("Bình luận đã được xóa", isDeleted = true) hoặc nội dung bị ẩn (status !== "ACTIVE").
 */
export async function recalculateActiveCommentCount(postId: string): Promise<number> {
  const pAny = prisma as any
  const count =
    (await pAny.slcComment?.count({
      where: {
        postId,
        isDeleted: false,
        status: "ACTIVE",
      },
    })) ?? 0

  await pAny.slcPost
    ?.update({
      where: { id: postId },
      data: { commentCount: count },
    })
    .catch(() => null)

  return count
}

/**
 * Lấy cấu hình Feature Flag hiện hành của Sky-Line Connect.
 */
export async function getSlcFeatureConfig() {
  await ensureSlcSchema()
  const pAny = prisma as any
  const row = await pAny.slcFeatureConfig
    ?.findUnique({ where: { key: "DEFAULT" } })
    .catch(() => null)

  if (!row) {
    return {
      isEnabled: true,
      pilotMode: false,
      allowedCampusIds: ["ALL"],
      allowedUserIds: [] as string[],
      allowedRoles: ["ALL"],
      maxImageSizeMb: 10,
      maxDocSizeMb: 25,
      maxFilesPerPost: 5,
      workingDays: [1, 2, 3, 4, 5],
      holidays: [] as string[],
    }
  }

  return {
    isEnabled: Boolean(row.isEnabled),
    pilotMode: Boolean(row.pilotMode),
    allowedCampusIds: safeJsonParse<string[]>(row.allowedCampusIdsJson, ["ALL"]),
    allowedUserIds: safeJsonParse<string[]>(row.allowedUserIdsJson, []),
    allowedRoles: safeJsonParse<string[]>(row.allowedRolesJson, ["ALL"]),
    maxImageSizeMb: Number(row.maxImageSizeMb || 10),
    maxDocSizeMb: Number(row.maxDocSizeMb || 25),
    maxFilesPerPost: Number(row.maxFilesPerPost || 5),
    workingDays: safeJsonParse<number[]>(row.workingDaysJson, [1, 2, 3, 4, 5]),
    holidays: safeJsonParse<string[]>(row.holidaysJson, []),
  }
}

/**
 * Lấy danh mục SSM (Cơ sở, Năm học, Môn học, Khối lớp, Nhãn, Nhóm) phục vụ bộ lọc và biểu mẫu.
 */
export async function getSlcCatalogs(ctx: SlcUserContext) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const [campuses, academicYears, dbSubjects, customTags, groups, awardPeriods, ruleSets] =
    await Promise.all([
      prisma.campus
        .findMany({
          where: { status: "ACTIVE" },
          select: { id: true, campusCode: true, campusName: true },
          orderBy: { campusName: "asc" },
        })
        .catch(() => []),
      prisma.academicYear
        .findMany({
          where: { isOff: false },
          select: { id: true, name: true, startDate: true, endDate: true, status: true },
          orderBy: { startDate: "desc" },
        })
        .catch(() => []),
      prisma.subject
        .findMany({
          where: { status: "ACTIVE" },
          select: { id: true, subjectCode: true, subjectName: true, level: true },
          orderBy: { subjectName: "asc" },
        })
        .catch(() => []),
      pAny.slcTag
        ?.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { usageCount: "desc" }],
        })
        .catch(() => []) ?? [],
      pAny.slcGroup
        ?.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []) ?? [],
      pAny.slcAwardPeriod
        ?.findMany({
          orderBy: [{ startDateUtc: "desc" }],
        })
        .catch(() => []) ?? [],
      pAny.slcAwardRuleSet
        ?.findMany({
          orderBy: [{ version: "desc" }],
        })
        .catch(() => []) ?? [],
    ])

  const subjects =
    dbSubjects.length > 0
      ? dbSubjects.map((s) => ({ code: s.subjectCode, name: s.subjectName }))
      : [...SLC_DEFAULT_SUBJECTS]

  return {
    campuses,
    academicYears,
    subjects,
    grades: [...SLC_DEFAULT_GRADES],
    purposes: [...SLC_DEFAULT_PURPOSES],
    customTags,
    groups: groups.map((g: any) => ({
      ...g,
      isMember:
        ctx.approvedGroupIds.includes(g.id) ||
        ctx.ownedGroupIds.includes(g.id) ||
        g.ownerId === ctx.userId,
      isOwner: g.ownerId === ctx.userId,
    })),
    awardPeriods,
    ruleSets,
    userPermissions: {
      isAdmin: isSuperOrCommunityAdmin(ctx),
      isCoordinator: hasSlcRoleInScope(ctx, "COORDINATOR"),
      isEvidenceVerifier: hasSlcRoleInScope(ctx, "EVIDENCE_VERIFIER"),
      isExpertReviewer: hasSlcRoleInScope(ctx, "EXPERT_REVIEWER"),
      isAwardFinalizer: hasSlcRoleInScope(ctx, "AWARD_FINALIZER"),
    },
  }
}

/**
 * Tạo hoặc cập nhật bài đăng (Chia sẻ thông thường, Ý tưởng dạy học, Sản phẩm AI, Dự án, Học liệu/Trải nghiệm).
 * Đảm bảo quy tắc:
 * - Làm sạch rich text, kiểm tra URL HTTPS chống SSRF.
 * - Khi sửa bài đã đăng: lưu bản ghi lịch sử SlcPostRevision.
 * - Khi đổi loại từ Ý tưởng đã có đánh giá sao sang Sản phẩm AI / Dự án: mở đối tượng liên kết mới,
 *   KHÔNG chuyển hoặc cộng dồn sao cũ sang đối tượng mới.
 */
export async function createOrUpdateSlcPost(
  ctx: SlcUserContext,
  input: {
    id?: string
    postType: "GENERAL" | "IDEA" | "AI_PRODUCT" | "PROJECT" | "EXPERIENCE"
    title?: string
    summary?: string
    content: string
    coverImageUrl?: string | null
    visibility?: "SYSTEM" | "CAMPUS" | "GROUP"
    groupId?: string | null
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
    subjectCodes?: string[]
    gradeLevels?: string[]
    purposeTags?: string[]
    tags?: string[]
    mentionedUserIds?: string[]
    hasStudentDataPiiChecked?: boolean
    // Idea specific fields
    problemStatement?: string
    proposedSolution?: string
    beneficiaries?: string
    aiSupportStep?: string
    feedbackQuestions?: string
    usageCautionNote?: string
    ideaStatus?: "NEW_PROPOSED" | "SEEKING_COLLABORATORS" | "PROJECT_OPENED"
    // Product specific fields
    productName?: string
    utilitySummary?: string
    productUrl?: string
    guideText?: string
    version?: string
    pricingType?: "FREE" | "PAID" | "FREEMIUM"
    accountRequirement?: "NONE" | "SCHOOL_EMAIL" | "PERSONAL_ACCOUNT" | "API_KEY"
    productStatus?: "TRIAL" | "READY" | "MAINTENANCE" | "DISCONTINUED"
    linkedIdeaId?: string
    linkedProjectId?: string
    // Project specific fields
    projectGoal?: string
    neededRoles?: string[]
    projectStatus?: "SEEKING_COLLABORATORS" | "IN_PROGRESS" | "HAS_PRODUCT" | "PAUSED"
    // Attachments
    attachments?: Array<{
      fileName: string
      safeFileName?: string
      mimeType: string
      fileSize: number
      fileUrl: string
      attachmentType?: "IMAGE" | "DOCUMENT" | "VIDEO_LINK" | "EXTERNAL_LINK"
    }>
    changeNote?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const cleanTitle = sanitizeRichText(input.title || input.productName || "")
  const cleanContent = sanitizeRichText(input.content || input.proposedSolution || "")
  const cleanSummary = sanitizeRichText(input.summary || input.utilitySummary || "")

  if (input.postType === "IDEA" && !cleanTitle) {
    throw new Error("Vui lòng nhập tiêu đề cho ý tưởng dạy học.")
  }
  if (input.postType === "AI_PRODUCT" && (!cleanTitle || !cleanSummary)) {
    throw new Error("Sản phẩm AI cần có tên sản phẩm và mô tả công dụng chính.")
  }
  if (input.postType === "PROJECT" && (!cleanTitle || !sanitizeRichText(input.projectGoal || cleanContent))) {
    throw new Error("Dự án cần có tiêu đề và mục tiêu hợp tác.")
  }
  if (!cleanContent && (!input.attachments || input.attachments.length === 0)) {
    throw new Error("Bài đăng cần có nội dung có ý nghĩa hoặc tệp đính kèm hợp lệ.")
  }

  if (input.productUrl && input.productUrl.trim()) {
    const urlCheck = validateSafeExternalUrl(input.productUrl, { requireHttps: true })
    if (!urlCheck.valid) {
      throw new Error(urlCheck.error || "Liên kết sản phẩm không hợp lệ.")
    }
  }

  const visibility = input.visibility || (input.groupId ? "GROUP" : "SYSTEM")
  if (visibility === "GROUP") {
    if (!input.groupId) {
      throw new Error("Vui lòng chọn nhóm khi đăng bài ở phạm vi nhóm.")
    }
    const isMember =
      ctx.approvedGroupIds.includes(input.groupId) ||
      ctx.ownedGroupIds.includes(input.groupId) ||
      isSuperOrCommunityAdmin(ctx)
    if (!isMember) {
      throw new Error("Thầy/Cô chưa là thành viên được duyệt của nhóm này.")
    }
  }

  const status = input.status || "PUBLISHED"
  const subjectCodesJson = JSON.stringify(input.subjectCodes || (ctx.mainSubjectCode ? [ctx.mainSubjectCode] : []))
  const gradeLevelsJson = JSON.stringify(input.gradeLevels || [])
  const purposeTagsJson = JSON.stringify(input.purposeTags || [])
  const tagsJson = JSON.stringify(input.tags || [])
  const mentionedUserIds = Array.from(new Set(input.mentionedUserIds || [])).filter(
    (uid) => uid && uid !== ctx.userId
  )
  const mentionedUserIdsJson = JSON.stringify(mentionedUserIds)

  // Editing existing post
  if (input.id) {
    const existingPost = await pAny.slcPost.findUnique({
      where: { id: input.id },
      include: { revisions: true },
    })
    if (!existingPost) {
      throw new Error("Không tìm thấy bài đăng cần chỉnh sửa.")
    }
    if (existingPost.authorId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Chỉ tác giả mới có quyền chỉnh sửa bài đăng này.")
    }

    const existingIdea = existingPost.linkedIdeaId
      ? await pAny.slcIdea.findUnique({ where: { id: existingPost.linkedIdeaId } })
      : await pAny.slcIdea.findUnique({ where: { postId: existingPost.id } }).catch(() => null)

    const existingProduct = existingPost.linkedProductId
      ? await pAny.slcProduct.findUnique({ where: { id: existingPost.linkedProductId } })
      : await pAny.slcProduct.findUnique({ where: { postId: existingPost.id } }).catch(() => null)

    // Rule IX.2 & XI.12:
    // "đổi loại khi đã có sao phải mở đối tượng liên kết mới, không đổi ý nghĩa điểm cũ"
    // "chuyển từ ý tưởng sang sản phẩm không chuyển sao hoặc xóa lịch sử góp ý"
    let linkedIdeaId = existingPost.linkedIdeaId || existingIdea?.id || null
    let linkedProductId = existingPost.linkedProductId || existingProduct?.id || null
    let linkedProjectId = existingPost.linkedProjectId || null

    if (
      existingPost.postType === "IDEA" &&
      input.postType === "AI_PRODUCT" &&
      existingIdea &&
      !linkedProductId
    ) {
      const newProd = await pAny.slcProduct.create({
        data: {
          postId: existingPost.id,
          authorId: existingPost.authorId,
          authorName: existingPost.authorName,
          campusId: existingPost.campusId,
          campusName: existingPost.campusName,
          groupId: visibility === "GROUP" ? input.groupId : null,
          linkedIdeaId: existingIdea.id,
          name: cleanTitle || existingIdea.title,
          coverImageUrl: input.coverImageUrl ?? existingPost.coverImageUrl,
          utilitySummary: cleanSummary || cleanContent.slice(0, 180),
          description: cleanContent,
          productUrl: input.productUrl?.trim() || null,
          guideText: sanitizeRichText(input.guideText),
          usageCautionNote: sanitizeRichText(input.usageCautionNote ?? existingIdea.usageCautionNote),
          currentVersion: input.version || "1.0",
          majorVersion: 1,
          subjectCodesJson,
          gradeLevelsJson,
          tagsJson,
          pricingType: input.pricingType || "FREE",
          accountRequirement: input.accountRequirement || "NONE",
          status: input.productStatus || "READY",
          visibility,
          // Stars are NOT copied from Idea (validRatingCount = 0, avgRating = 0)
          avgRating: 0,
          validRatingCount: 0,
          collaboratorIdsJson: existingIdea.collaboratorIdsJson || "[]",
        },
      })
      linkedProductId = newProd.id
      await pAny.slcIdea.update({
        where: { id: existingIdea.id },
        data: { linkedProductId: newProd.id, visibility, groupId: visibility === "GROUP" ? input.groupId : null },
      })
    } else if (input.postType === "IDEA" && existingIdea) {
      await pAny.slcIdea.update({
        where: { id: existingIdea.id },
        data: {
          title: cleanTitle || existingIdea.title,
          problemStatement: sanitizeRichText(input.problemStatement ?? existingIdea.problemStatement),
          proposedSolution: cleanContent,
          beneficiaries: sanitizeRichText(input.beneficiaries ?? existingIdea.beneficiaries),
          aiSupportStep: sanitizeRichText(input.aiSupportStep ?? existingIdea.aiSupportStep),
          feedbackQuestions: sanitizeRichText(input.feedbackQuestions ?? existingIdea.feedbackQuestions),
          usageCautionNote: sanitizeRichText(input.usageCautionNote ?? existingIdea.usageCautionNote),
          status: input.ideaStatus || existingIdea.status,
          subjectCodesJson,
          gradeLevelsJson,
          tagsJson,
          visibility,
          groupId: visibility === "GROUP" ? input.groupId : null,
        },
      })
    } else if (input.postType === "AI_PRODUCT" && existingProduct) {
      await pAny.slcProduct.update({
        where: { id: existingProduct.id },
        data: {
          name: cleanTitle || existingProduct.name,
          coverImageUrl: input.coverImageUrl ?? existingProduct.coverImageUrl,
          utilitySummary: cleanSummary || existingProduct.utilitySummary,
          description: cleanContent,
          productUrl: input.productUrl !== undefined ? (input.productUrl?.trim() || null) : existingProduct.productUrl,
          guideText: sanitizeRichText(input.guideText ?? existingProduct.guideText),
          usageCautionNote: sanitizeRichText(input.usageCautionNote ?? existingProduct.usageCautionNote),
          currentVersion: input.version || existingProduct.currentVersion,
          pricingType: input.pricingType || existingProduct.pricingType,
          accountRequirement: input.accountRequirement || existingProduct.accountRequirement,
          status: input.productStatus || existingProduct.status,
          subjectCodesJson,
          gradeLevelsJson,
          tagsJson,
          visibility,
          groupId: visibility === "GROUP" ? input.groupId : null,
        },
      })
    }

    const nextVersionNumber = (existingPost.revisions?.length || 0) + 1
    await pAny.slcPostRevision.create({
      data: {
        postId: existingPost.id,
        editorId: ctx.userId,
        editorName: ctx.fullName,
        versionNumber: nextVersionNumber,
        title: existingPost.title,
        content: existingPost.content,
        postType: existingPost.postType,
        visibility: existingPost.visibility,
        snapshotJson: JSON.stringify({
          title: existingPost.title,
          summary: existingPost.summary,
          content: existingPost.content,
          postType: existingPost.postType,
          visibility: existingPost.visibility,
          groupId: existingPost.groupId,
        }),
        changeNote: sanitizeRichText(input.changeNote || "Cập nhật nội dung bài đăng"),
      },
    })

    const updatedPost = await pAny.slcPost.update({
      where: { id: existingPost.id },
      data: {
        postType: input.postType,
        title: cleanTitle || existingPost.title,
        summary: cleanSummary || existingPost.summary,
        content: cleanContent,
        coverImageUrl: input.coverImageUrl !== undefined ? input.coverImageUrl : existingPost.coverImageUrl,
        visibility,
        groupId: visibility === "GROUP" ? input.groupId : null,
        status,
        subjectCodesJson,
        gradeLevelsJson,
        purposeTagsJson,
        tagsJson,
        mentionedUserIdsJson,
        linkedIdeaId,
        linkedProductId,
        linkedProjectId,
      },
    })

    return updatedPost
  }

  // Creating new post
  const createdPost = await pAny.slcPost.create({
    data: {
      authorId: ctx.userId,
      authorName: ctx.fullName,
      authorRole: ctx.mainSubjectName ? `GV ${ctx.mainSubjectName}` : "Giáo viên",
      campusId: ctx.campusId,
      campusName: ctx.campusName || "Hệ thống Sky-Line",
      mainSubject: ctx.mainSubjectName,
      postType: input.postType,
      title: cleanTitle || null,
      summary: cleanSummary || cleanContent.slice(0, 180),
      content: cleanContent,
      coverImageUrl: input.coverImageUrl || null,
      visibility,
      groupId: visibility === "GROUP" ? input.groupId : null,
      status,
      subjectCodesJson,
      gradeLevelsJson,
      purposeTagsJson,
      tagsJson,
      mentionedUserIdsJson,
      hasStudentDataPiiChecked: input.hasStudentDataPiiChecked !== false,
      linkedIdeaId: input.linkedIdeaId || null,
      linkedProjectId: input.linkedProjectId || null,
      publishedAt: new Date(),
    },
  })

  let linkedIdeaId = input.linkedIdeaId || null
  let linkedProductId: string | null = null
  let linkedProjectId = input.linkedProjectId || null

  if (input.postType === "IDEA") {
    const idea = await pAny.slcIdea.create({
      data: {
        postId: createdPost.id,
        authorId: ctx.userId,
        authorName: ctx.fullName,
        campusId: ctx.campusId,
        campusName: ctx.campusName || "Hệ thống Sky-Line",
        title: cleanTitle,
        problemStatement: sanitizeRichText(input.problemStatement),
        proposedSolution: cleanContent,
        beneficiaries: sanitizeRichText(input.beneficiaries),
        aiSupportStep: sanitizeRichText(input.aiSupportStep),
        feedbackQuestions: sanitizeRichText(input.feedbackQuestions),
        usageCautionNote: sanitizeRichText(input.usageCautionNote),
        subjectCodesJson,
        gradeLevelsJson,
        tagsJson,
        status: input.ideaStatus || "NEW_PROPOSED",
        visibility,
        groupId: visibility === "GROUP" ? input.groupId : null,
      },
    })
    linkedIdeaId = idea.id
  } else if (input.postType === "AI_PRODUCT") {
    const product = await pAny.slcProduct.create({
      data: {
        postId: createdPost.id,
        authorId: ctx.userId,
        authorName: ctx.fullName,
        campusId: ctx.campusId,
        campusName: ctx.campusName || "Hệ thống Sky-Line",
        groupId: visibility === "GROUP" ? input.groupId : null,
        linkedIdeaId: input.linkedIdeaId || null,
        linkedProjectId: input.linkedProjectId || null,
        name: cleanTitle,
        coverImageUrl: input.coverImageUrl || null,
        utilitySummary: cleanSummary || cleanContent.slice(0, 180),
        description: cleanContent,
        productUrl: input.productUrl?.trim() || null,
        guideText: sanitizeRichText(input.guideText),
        usageCautionNote: sanitizeRichText(input.usageCautionNote),
        currentVersion: input.version || "1.0",
        majorVersion: 1,
        subjectCodesJson,
        gradeLevelsJson,
        tagsJson,
        pricingType: input.pricingType || "FREE",
        accountRequirement: input.accountRequirement || "NONE",
        status: input.productStatus || "READY",
        visibility,
      },
    })
    linkedProductId = product.id

    await pAny.slcProductVersion.create({
      data: {
        productId: product.id,
        version: input.version || "1.0",
        majorVersion: 1,
        releaseNotes: "Phiên bản khởi tạo sản phẩm",
        productUrl: input.productUrl?.trim() || null,
        createdById: ctx.userId,
      },
    })

    if (input.linkedIdeaId) {
      await pAny.slcIdea
        .update({
          where: { id: input.linkedIdeaId },
          data: { linkedProductId: product.id },
        })
        .catch(() => null)
    }
  } else if (input.postType === "PROJECT") {
    const project = await pAny.slcProject.create({
      data: {
        postId: createdPost.id,
        ownerId: ctx.userId,
        ownerName: ctx.fullName,
        campusId: ctx.campusId,
        campusName: ctx.campusName || "Hệ thống Sky-Line",
        groupId: visibility === "GROUP" ? input.groupId : null,
        linkedIdeaId: input.linkedIdeaId || null,
        title: cleanTitle,
        goal: sanitizeRichText(input.projectGoal || cleanSummary || cleanContent),
        description: cleanContent,
        coverImageUrl: input.coverImageUrl || null,
        neededRolesJson: JSON.stringify(input.neededRoles || ["Giáo viên thẩm định học liệu", "Giáo viên dạy thử nghiệm"]),
        subjectCodesJson,
        gradeLevelsJson,
        tagsJson,
        status: input.projectStatus || "SEEKING_COLLABORATORS",
        visibility,
        memberCount: 1,
      },
    })
    linkedProjectId = project.id

    await pAny.slcProjectMember.create({
      data: {
        projectId: project.id,
        userId: ctx.userId,
        userName: ctx.fullName,
        campusName: ctx.campusName || "Hệ thống Sky-Line",
        roleName: "Chủ nhiệm dự án",
        memberRole: "LEAD",
        status: "APPROVED",
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
    })

    if (input.linkedIdeaId) {
      await pAny.slcIdea
        .update({
          where: { id: input.linkedIdeaId },
          data: { status: "PROJECT_OPENED", linkedProjectId: project.id },
        })
        .catch(() => null)
    }
  }

  if (linkedIdeaId || linkedProductId || linkedProjectId) {
    await pAny.slcPost.update({
      where: { id: createdPost.id },
      data: {
        linkedIdeaId,
        linkedProductId,
        linkedProjectId,
      },
    })
  }

  // Save initial revision
  await pAny.slcPostRevision.create({
    data: {
      postId: createdPost.id,
      editorId: ctx.userId,
      editorName: ctx.fullName,
      versionNumber: 1,
      title: cleanTitle || null,
      content: cleanContent,
      postType: input.postType,
      visibility,
      snapshotJson: JSON.stringify({
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        postType: input.postType,
        visibility,
      }),
      changeNote: "Khởi tạo bài đăng",
    },
  })

  // Save attachments if any
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments.slice(0, 5)) {
      await pAny.slcAttachment.create({
        data: {
          postId: createdPost.id,
          productId: linkedProductId,
          uploaderId: ctx.userId,
          fileName: att.fileName,
          safeFileName: att.safeFileName || att.fileName,
          mimeType: att.mimeType,
          fileSize: att.fileSize || 0,
          fileUrl: att.fileUrl,
          attachmentType: att.attachmentType || "IMAGE",
        },
      })
    }
  }

  // Send @mention notifications if published
  if (status === "PUBLISHED" && mentionedUserIds.length > 0) {
    for (const mentionedUid of mentionedUserIds) {
      await dispatchSlcNotification({
        idempotencyKey: `post_mention:${createdPost.id}:${mentionedUid}`,
        recipientId: mentionedUid,
        actorId: ctx.userId,
        eventType: "MENTION",
        targetType: "POST",
        targetId: createdPost.id,
        postId: createdPost.id,
        title: "Nhắc tên trên Sky-Line Connect",
        message: `${ctx.fullName} đã nhắc đến Thầy/Cô trong bài "${cleanTitle || "Chia sẻ mới"}".`,
        deepLink: `/teacher/skyline-connect/posts/${createdPost.id}`,
      })
    }
  }

  return {
    ...createdPost,
    linkedIdeaId,
    linkedProductId,
    linkedProjectId,
  }
}

/**
 * Chia sẻ lại bài đăng (Repost):
 * - Giữ nguyên nguồn (sharedFromPostId), không sao chép nội dung thành sản phẩm mới.
 * - Không mở rộng quyền bài gốc (nếu bài gốc ở phạm vi GROUP hoặc CAMPUS thì bài chia sẻ không được mở rộng ra SYSTEM).
 */
export async function shareSlcPost(
  ctx: SlcUserContext,
  input: {
    sourcePostId: string
    commentary?: string
    visibility?: "SYSTEM" | "CAMPUS" | "GROUP"
    groupId?: string | null
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const sourcePost = await pAny.slcPost.findUnique({ where: { id: input.sourcePostId } })
  if (!sourcePost) {
    throw new Error("Không tìm thấy bài đăng gốc để chia sẻ.")
  }

  let groupVisibility: string | null = null
  if (sourcePost.groupId) {
    const g = await pAny.slcGroup.findUnique({ where: { id: sourcePost.groupId } })
    groupVisibility = g?.visibility || "PRIVATE"
  }

  if (
    !canViewPost(ctx, {
      id: sourcePost.id,
      authorId: sourcePost.authorId,
      status: sourcePost.status,
      visibility: sourcePost.visibility,
      campusId: sourcePost.campusId,
      groupId: sourcePost.groupId,
      groupVisibility,
    })
  ) {
    throw new Error("Thầy/Cô không có quyền xem hoặc chia sẻ bài đăng này.")
  }

  // Không mở rộng quyền bài gốc
  let targetVisibility = input.visibility || sourcePost.visibility
  let targetGroupId = input.groupId || sourcePost.groupId || null

  if (sourcePost.visibility === "GROUP") {
    targetVisibility = "GROUP"
    targetGroupId = sourcePost.groupId
  } else if (sourcePost.visibility === "CAMPUS" && targetVisibility === "SYSTEM") {
    targetVisibility = "CAMPUS"
  }

  const sharedPost = await pAny.slcPost.create({
    data: {
      authorId: ctx.userId,
      authorName: ctx.fullName,
      authorRole: ctx.mainSubjectName ? `GV ${ctx.mainSubjectName}` : "Giáo viên",
      campusId: sourcePost.visibility === "CAMPUS" ? sourcePost.campusId : ctx.campusId,
      campusName: ctx.campusName || "Hệ thống Sky-Line",
      mainSubject: ctx.mainSubjectName,
      postType: "GENERAL",
      title: `Chia sẻ từ ${sourcePost.authorName}: ${sourcePost.title || ""}`.trim(),
      summary: sanitizeRichText(input.commentary || ""),
      content: sanitizeRichText(input.commentary || `Chia sẻ nội dung từ ${sourcePost.authorName}`),
      visibility: targetVisibility,
      groupId: targetGroupId,
      status: "PUBLISHED",
      sharedFromPostId: sourcePost.id,
      subjectCodesJson: sourcePost.subjectCodesJson,
      gradeLevelsJson: sourcePost.gradeLevelsJson,
    },
  })

  await pAny.slcPost.update({
    where: { id: sourcePost.id },
    data: { shareCount: { increment: 1 } },
  })

  return sharedPost
}

/**
 * Thả hoặc đổi cảm xúc (USEFUL | LOVE | INSPIRED | SUPPORT) trên bài đăng hoặc bình luận.
 * Mỗi người tối đa 1 cảm xúc hiện hành cho 1 đối tượng (unique constraint: [targetType, targetId, userId]).
 */
export async function toggleSlcReaction(
  ctx: SlcUserContext,
  input: {
    targetType: "POST" | "COMMENT"
    targetId: string
    reactionType: "USEFUL" | "LOVE" | "INSPIRED" | "SUPPORT"
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const postId =
    input.targetType === "POST"
      ? input.targetId
      : (await pAny.slcComment.findUnique({ where: { id: input.targetId } }))?.postId

  if (!postId) {
    throw new Error("Không tìm thấy nội dung tương tác.")
  }

  const post = await pAny.slcPost.findUnique({ where: { id: postId } })
  if (!post || !canViewPost(ctx, post)) {
    throw new Error("Thầy/Cô không có quyền tương tác với nội dung này.")
  }

  const existing = await pAny.slcReaction.findUnique({
    where: {
      targetType_targetId_userId: {
        targetType: input.targetType,
        targetId: input.targetId,
        userId: ctx.userId,
      },
    },
  })

  let currentReaction: string | null = null
  if (existing) {
    if (existing.reactionType === input.reactionType) {
      await pAny.slcReaction.delete({ where: { id: existing.id } })
      currentReaction = null
    } else {
      const updated = await pAny.slcReaction.update({
        where: { id: existing.id },
        data: { reactionType: input.reactionType },
      })
      currentReaction = updated.reactionType
    }
  } else {
    const created = await pAny.slcReaction.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        postId: input.targetType === "POST" ? input.targetId : postId,
        commentId: input.targetType === "COMMENT" ? input.targetId : null,
        userId: ctx.userId,
        userName: ctx.fullName,
        reactionType: input.reactionType,
      },
    })
    currentReaction = created.reactionType
  }

  const totalReactions = await pAny.slcReaction.count({
    where: { targetType: input.targetType, targetId: input.targetId },
  })

  if (input.targetType === "POST") {
    await pAny.slcPost.update({
      where: { id: input.targetId },
      data: { reactionCount: totalReactions },
    })
  } else {
    await pAny.slcComment.update({
      where: { id: input.targetId },
      data: { reactionCount: totalReactions },
    })
  }

  return { currentReaction, reactionCount: totalReactions }
}

/**
 * Lưu hoặc bỏ lưu bài đăng / ý tưởng / sản phẩm / dự án.
 */
export async function toggleSlcSaveItem(
  ctx: SlcUserContext,
  input: {
    targetType: "POST" | "IDEA" | "PRODUCT" | "PROJECT"
    targetId: string
    postId?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const existing = await pAny.slcSavedItem.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: ctx.userId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  })

  let isSaved = false
  if (existing) {
    await pAny.slcSavedItem.delete({ where: { id: existing.id } })
    isSaved = false
  } else {
    await pAny.slcSavedItem.create({
      data: {
        userId: ctx.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        postId: input.postId || (input.targetType === "POST" ? input.targetId : null),
      },
    })
    isSaved = true
  }

  const postIdToUpdate = input.postId || (input.targetType === "POST" ? input.targetId : null)
  if (postIdToUpdate) {
    const count = await pAny.slcSavedItem.count({
      where: { postId: postIdToUpdate },
    })
    await pAny.slcPost
      .update({
        where: { id: postIdToUpdate },
        data: { saveCount: count },
      })
      .catch(() => null)
  }

  return { isSaved }
}

/**
 * Theo dõi / bỏ theo dõi hoặc bật / tắt thông báo cho GV, bài đăng, nhóm, dự án.
 */
export async function toggleSlcFollow(
  ctx: SlcUserContext,
  input: {
    targetType: "USER" | "POST" | "GROUP" | "PROJECT"
    targetId: string
    muteNotifications?: boolean
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const existing = await pAny.slcFollow.findUnique({
    where: {
      followerId_targetType_targetId: {
        followerId: ctx.userId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  })

  if (existing) {
    if (input.muteNotifications !== undefined) {
      const updated = await pAny.slcFollow.update({
        where: { id: existing.id },
        data: { muteNotifications: input.muteNotifications },
      })
      return { isFollowing: true, muteNotifications: updated.muteNotifications }
    }
    await pAny.slcFollow.delete({ where: { id: existing.id } })
    return { isFollowing: false, muteNotifications: false }
  }

  const created = await pAny.slcFollow.create({
    data: {
      followerId: ctx.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      muteNotifications: Boolean(input.muteNotifications),
    },
  })

  return { isFollowing: true, muteNotifications: created.muteNotifications }
}

/**
 * Tạo bình luận đóng góp hoặc trả lời bình luận:
 * - Chống gửi lặp retry qua clientRequestId.
 * - Giới hạn hiển thị 2 cấp: nếu trả lời một bình luận cấp 1 (depth=1), đưa về cùng luồng parentId cấp 0
 *   và ghi nhận replyToCommentId + replyToUserId + replyToUserName, không lồng vô hạn.
 * - Tính lại bộ đếm commentCount chính xác.
 * - Gửi thông báo cho tác giả bài, người được trả lời và người được @nhắc tên (không tự nhắc chính mình).
 */
export async function createSlcComment(
  ctx: SlcUserContext,
  input: {
    postId: string
    content: string
    parentCommentId?: string | null
    mentionedUserIds?: string[]
    clientRequestId?: string
    attachments?: Array<{
      fileName: string
      safeFileName?: string
      mimeType: string
      fileSize: number
      fileUrl: string
      attachmentType?: "IMAGE" | "DOCUMENT" | "VIDEO_LINK" | "EXTERNAL_LINK"
    }>
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const post = await pAny.slcPost.findUnique({ where: { id: input.postId } })
  if (!post || !canViewPost(ctx, post) || post.status !== "PUBLISHED") {
    throw new Error("Thầy/Cô không có quyền bình luận trên bài đăng này.")
  }

  const cleanContent = sanitizeRichText(input.content)
  if (!cleanContent && (!input.attachments || input.attachments.length === 0)) {
    throw new Error("Nội dung bình luận không được để trống.")
  }

  // Idempotency check against duplicate retries
  if (input.clientRequestId) {
    const existingRetry = await pAny.slcComment
      .findUnique({
        where: {
          authorId_clientRequestId: {
            authorId: ctx.userId,
            clientRequestId: input.clientRequestId,
          },
        },
      })
      .catch(() => null)

    if (existingRetry) {
      const commentCount = await recalculateActiveCommentCount(input.postId)
      return { comment: existingRetry, commentCount, deduplicated: true }
    }
  }

  let effectiveParentId: string | null = null
  let replyToCommentId: string | null = null
  let replyToUserId: string | null = null
  let replyToUserName: string | null = null
  let depth = 0

  if (input.parentCommentId) {
    const targetParent = await pAny.slcComment.findUnique({
      where: { id: input.parentCommentId },
    })
    if (!targetParent || targetParent.postId !== input.postId) {
      throw new Error("Không tìm thấy bình luận gốc để trả lời.")
    }
    depth = 1
    replyToCommentId = targetParent.id
    replyToUserId = targetParent.authorId
    replyToUserName = targetParent.authorName
    // Enforce max 2 display levels: if targetParent is already depth 1, flatten under its root parentId
    effectiveParentId = targetParent.depth === 0 ? targetParent.id : targetParent.parentId
  }

  const mentionedUserIds = Array.from(new Set(input.mentionedUserIds || [])).filter(
    (uid) => uid && uid !== ctx.userId
  )

  const createdComment = await pAny.slcComment.create({
    data: {
      postId: input.postId,
      authorId: ctx.userId,
      authorName: ctx.fullName,
      authorRole: ctx.mainSubjectName ? `GV ${ctx.mainSubjectName}` : "Giáo viên",
      campusName: ctx.campusName || "Hệ thống Sky-Line",
      parentId: effectiveParentId,
      replyToCommentId,
      replyToUserId,
      replyToUserName,
      depth,
      content: cleanContent,
      mentionedUserIdsJson: JSON.stringify(mentionedUserIds),
      clientRequestId: input.clientRequestId || null,
    },
  })

  if (input.attachments && input.attachments.length > 0) {
    const attIds: string[] = []
    for (const att of input.attachments.slice(0, 3)) {
      const createdAtt = await pAny.slcAttachment.create({
        data: {
          postId: input.postId,
          commentId: createdComment.id,
          uploaderId: ctx.userId,
          fileName: att.fileName,
          safeFileName: att.safeFileName || att.fileName,
          mimeType: att.mimeType,
          fileSize: att.fileSize || 0,
          fileUrl: att.fileUrl,
          attachmentType: att.attachmentType || "IMAGE",
        },
      })
      attIds.push(createdAtt.id)
    }
    await pAny.slcComment.update({
      where: { id: createdComment.id },
      data: { attachmentIdsJson: JSON.stringify(attIds) },
    })
  }

  const commentCount = await recalculateActiveCommentCount(input.postId)

  // Notify post author
  if (post.authorId !== ctx.userId) {
    await dispatchSlcNotification({
      idempotencyKey: `comment_post:${createdComment.id}:${post.authorId}`,
      recipientId: post.authorId,
      actorId: ctx.userId,
      eventType: "COMMENT_REPLY",
      targetType: "COMMENT",
      targetId: createdComment.id,
      postId: post.id,
      title: "Góp ý mới trên bài đăng của Thầy/Cô",
      message: `${ctx.fullName} đã bình luận vào "${post.title || "bài chia sẻ"}".`,
      deepLink: `/teacher/skyline-connect/posts/${post.id}?commentId=${createdComment.id}`,
    })
  }

  // Notify replied user
  if (replyToUserId && replyToUserId !== ctx.userId && replyToUserId !== post.authorId) {
    await dispatchSlcNotification({
      idempotencyKey: `comment_reply:${createdComment.id}:${replyToUserId}`,
      recipientId: replyToUserId,
      actorId: ctx.userId,
      eventType: "COMMENT_REPLY",
      targetType: "COMMENT",
      targetId: createdComment.id,
      postId: post.id,
      title: "Phản hồi bình luận trên Sky-Line Connect",
      message: `${ctx.fullName} đã trả lời bình luận của Thầy/Cô.`,
      deepLink: `/teacher/skyline-connect/posts/${post.id}?commentId=${createdComment.id}`,
    })
  }

  // Notify @mentioned users
  for (const uid of mentionedUserIds) {
    await dispatchSlcNotification({
      idempotencyKey: `comment_mention:${createdComment.id}:${uid}`,
      recipientId: uid,
      actorId: ctx.userId,
      eventType: "MENTION",
      targetType: "COMMENT",
      targetId: createdComment.id,
      postId: post.id,
      title: "Nhắc tên trong thảo luận chuyên môn",
      message: `${ctx.fullName} đã nhắc đến Thầy/Cô trong một bình luận đóng góp.`,
      deepLink: `/teacher/skyline-connect/posts/${post.id}?commentId=${createdComment.id}`,
    })
  }

  return { comment: createdComment, commentCount, deduplicated: false }
}

/**
 * Sửa hoặc xóa bình luận:
 * - Tác giả bình luận được sửa/xóa bình luận của chính mình; khi sửa có dấu isEdited = true.
 * - Tác giả bài đăng KHÔNG được sửa hoặc xóa bình luận hợp lệ của người khác.
 * - Khi xóa bình luận đã có trả lời: giữ bản ghi với isDeleted=true, content="Bình luận đã được xóa",
 *   xóa/ẩn toàn bộ tệp đính kèm của bình luận đó để không lộ tệp, và cập nhật lại bộ đếm commentCount.
 */
export async function updateOrDeleteSlcComment(
  ctx: SlcUserContext,
  input: {
    commentId: string
    action: "EDIT" | "DELETE"
    content?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const comment = await pAny.slcComment.findUnique({ where: { id: input.commentId } })
  if (!comment) {
    throw new Error("Không tìm thấy bình luận.")
  }

  const permCheck = canEditOrDeleteComment(ctx, comment, input.action)
  if (!permCheck.allowed) {
    throw new Error(permCheck.reason)
  }

  if (input.action === "EDIT") {
    const cleanContent = sanitizeRichText(input.content)
    if (!cleanContent) {
      throw new Error("Nội dung bình luận sau chỉnh sửa không được để trống.")
    }
    const updated = await pAny.slcComment.update({
      where: { id: comment.id },
      data: {
        content: cleanContent,
        isEdited: true,
        editedAt: new Date(),
      },
    })
    return { comment: updated }
  }

  // DELETE action: mark attachments as deleted so they cannot be accessed
  await pAny.slcAttachment
    .updateMany({
      where: { commentId: comment.id },
      data: { isDeleted: true },
    })
    .catch(() => null)

  const activeReplyCount = await pAny.slcComment.count({
    where: {
      parentId: comment.id,
      isDeleted: false,
      status: "ACTIVE",
    },
  })

  if (activeReplyCount > 0) {
    // Keep placeholder to preserve reply thread
    const updated = await pAny.slcComment.update({
      where: { id: comment.id },
      data: {
        content: "Bình luận đã được xóa",
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
        attachmentIdsJson: "[]",
        isPinned: false,
      },
    })
    const commentCount = await recalculateActiveCommentCount(comment.postId)
    return { comment: updated, placeholderPreserved: true, commentCount }
  } else {
    const updated = await pAny.slcComment.update({
      where: { id: comment.id },
      data: {
        content: "Bình luận đã được xóa",
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
        attachmentIdsJson: "[]",
        isPinned: false,
      },
    })
    const commentCount = await recalculateActiveCommentCount(comment.postId)
    return { comment: updated, placeholderPreserved: false, commentCount }
  }
}

/**
 * Tác giả bài đăng ghim hoặc bỏ ghim bình luận (tối đa 3 bình luận ghim trên mỗi bài).
 */
export async function togglePinSlcComment(ctx: SlcUserContext, commentId: string) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const comment = await pAny.slcComment.findUnique({ where: { id: commentId } })
  if (!comment || comment.isDeleted || comment.status !== "ACTIVE") {
    throw new Error("Không thể ghim bình luận đã xóa hoặc bị ẩn.")
  }

  const post = await pAny.slcPost.findUnique({ where: { id: comment.postId } })
  if (!post || !canPinOrMarkFeedbackOnPost(ctx, post)) {
    throw new Error("Chỉ tác giả bài đăng hoặc điều phối viên mới có quyền ghim bình luận.")
  }

  if (!comment.isPinned) {
    const pinnedCount = await pAny.slcComment.count({
      where: {
        postId: post.id,
        isPinned: true,
        isDeleted: false,
        status: "ACTIVE",
      },
    })
    if (pinnedCount >= 3) {
      throw new Error("Mỗi bài đăng chỉ được ghim tối đa 3 bình luận tiêu biểu.")
    }
  }

  const updated = await pAny.slcComment.update({
    where: { id: comment.id },
    data: {
      isPinned: !comment.isPinned,
      pinnedAt: !comment.isPinned ? new Date() : null,
      pinnedById: !comment.isPinned ? ctx.userId : null,
    },
  })

  return updated
}

/**
 * Tác giả bài đăng đánh dấu trạng thái góp ý cải tiến trên bình luận:
 * RECEIVED (Đã tiếp nhận) | IN_PROGRESS (Đang thực hiện) | APPLIED (Đã áp dụng) | NOT_IMPLEMENTED (Chưa triển khai kèm lý do).
 * QUY TẮC BẮT BUỘC: Trạng thái góp ý "Đã áp dụng" (APPLIED) KHÔNG tự tính là minh chứng sử dụng sản phẩm (U) của GV!
 */
export async function markCommentFeedbackStatus(
  ctx: SlcUserContext,
  input: {
    commentId: string
    feedbackStatus: "NONE" | "RECEIVED" | "IN_PROGRESS" | "APPLIED" | "NOT_IMPLEMENTED"
    feedbackReason?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const comment = await pAny.slcComment.findUnique({ where: { id: input.commentId } })
  if (!comment || comment.isDeleted) {
    throw new Error("Không tìm thấy bình luận.")
  }

  const post = await pAny.slcPost.findUnique({ where: { id: comment.postId } })
  if (!post || !canPinOrMarkFeedbackOnPost(ctx, post)) {
    throw new Error("Chỉ tác giả bài đăng mới có quyền cập nhật trạng thái tiếp nhận góp ý.")
  }

  if (input.feedbackStatus === "NOT_IMPLEMENTED" && !sanitizeRichText(input.feedbackReason)) {
    throw new Error("Vui lòng nhập lý do khi đánh dấu góp ý là 'Chưa triển khai'.")
  }

  const updated = await pAny.slcComment.update({
    where: { id: comment.id },
    data: {
      feedbackStatus: input.feedbackStatus,
      feedbackReason: sanitizeRichText(input.feedbackReason) || null,
      feedbackUpdatedAt: new Date(),
      feedbackUpdatedById: ctx.userId,
    },
  })

  if (comment.authorId !== ctx.userId && input.feedbackStatus !== "NONE") {
    const statusLabels: Record<string, string> = {
      RECEIVED: "Đã tiếp nhận",
      IN_PROGRESS: "Đang thực hiện",
      APPLIED: "Đã áp dụng",
      NOT_IMPLEMENTED: "Chưa triển khai",
    }
    await dispatchSlcNotification({
      idempotencyKey: `feedback_status:${comment.id}:${input.feedbackStatus}`,
      recipientId: comment.authorId,
      actorId: ctx.userId,
      eventType: "FEEDBACK_STATUS",
      targetType: "COMMENT",
      targetId: comment.id,
      postId: post.id,
      title: `Góp ý của Thầy/Cô: ${statusLabels[input.feedbackStatus] || input.feedbackStatus}`,
      message: `${ctx.fullName} đã đánh dấu góp ý của Thầy/Cô là "${statusLabels[input.feedbackStatus]}" trên bài "${post.title || "Chia sẻ"}".`,
      deepLink: `/teacher/skyline-connect/posts/${post.id}?commentId=${comment.id}`,
    })
  }

  return updated
}

/**
 * Cập nhật phiên bản mới của Sản phẩm AI liên kết với bình luận góp ý nguồn (sourceCommentId):
 * - Ghi nhận người góp ý (contributorUserId, contributorName) trên bản cập nhật.
 * - Thông báo cho người góp ý và cho phép người góp ý bỏ nhắc tên trên bản ghi công khai (contributorOptOutPublic).
 * - Đóng góp qua comment KHÔNG tự biến người đó thành đồng tác giả (collaboratorIdsJson giữ nguyên),
 *   do đó họ vẫn giữ quyền chấm sao độc lập.
 */
export async function releaseProductVersionWithCredit(
  ctx: SlcUserContext,
  input: {
    productId: string
    version: string
    majorVersion?: number
    releaseNotes: string
    productUrl?: string
    sourceCommentId?: string | null
    reopenEvaluation?: boolean
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const product = await pAny.slcProduct.findUnique({ where: { id: input.productId } })
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm AI.")
  }

  const collaborators = safeJsonParse<string[]>(product.collaboratorIdsJson, [])
  if (
    product.authorId !== ctx.userId &&
    !collaborators.includes(ctx.userId) &&
    !isSuperOrCommunityAdmin(ctx)
  ) {
    throw new Error("Chỉ tác giả hoặc đồng tác giả của sản phẩm mới có quyền phát hành bản cập nhật.")
  }

  if (input.productUrl && input.productUrl.trim()) {
    const urlCheck = validateSafeExternalUrl(input.productUrl, { requireHttps: true })
    if (!urlCheck.valid) {
      throw new Error(urlCheck.error || "Liên kết sản phẩm phải dùng HTTPS hợp lệ.")
    }
  }

  let contributorUserId: string | null = null
  let contributorName: string | null = null
  let sourceComment: any = null

  if (input.sourceCommentId) {
    sourceComment = await pAny.slcComment.findUnique({ where: { id: input.sourceCommentId } })
    if (sourceComment && !sourceComment.isDeleted) {
      contributorUserId = sourceComment.authorId
      contributorName = sourceComment.authorName
    }
  }

  const nextMajor = input.majorVersion ?? product.majorVersion
  const createdVersion = await pAny.slcProductVersion.create({
    data: {
      productId: product.id,
      version: sanitizeRichText(input.version) || "1.1",
      majorVersion: nextMajor,
      releaseNotes: sanitizeRichText(input.releaseNotes),
      productUrl: input.productUrl?.trim() || product.productUrl,
      sourceCommentId: sourceComment?.id || null,
      contributorUserId,
      contributorName,
      contributorOptOutPublic: Boolean(sourceComment?.contributorOptOutPublic),
      reopenEvaluation: Boolean(input.reopenEvaluation),
      createdById: ctx.userId,
    },
  })

  await pAny.slcProduct.update({
    where: { id: product.id },
    data: {
      currentVersion: createdVersion.version,
      majorVersion: nextMajor,
      productUrl: createdVersion.productUrl,
    },
  })

  if (sourceComment) {
    await pAny.slcComment.update({
      where: { id: sourceComment.id },
      data: {
        feedbackStatus: "APPLIED",
        linkedProductVersionId: createdVersion.id,
        contributorAcknowledged: true,
        feedbackUpdatedAt: new Date(),
        feedbackUpdatedById: ctx.userId,
      },
    })

    if (contributorUserId && contributorUserId !== ctx.userId) {
      await dispatchSlcNotification({
        idempotencyKey: `contributor_credit:${createdVersion.id}:${contributorUserId}`,
        recipientId: contributorUserId,
        actorId: ctx.userId,
        eventType: "CONTRIBUTOR_CREDIT",
        targetType: "PRODUCT_VERSION",
        targetId: createdVersion.id,
        postId: product.postId,
        title: "Ghi nhận đóng góp cải tiến sản phẩm AI",
        message: `${ctx.fullName} đã cập nhật sản phẩm "${product.name}" (v${createdVersion.version}) từ góp ý của Thầy/Cô và ghi nhận tên đóng góp.`,
        deepLink: product.postId
          ? `/teacher/skyline-connect/posts/${product.postId}`
          : `/teacher/skyline-connect/products/${product.id}`,
      })
    }
  }

  return createdVersion
}

/**
 * Cho phép người góp ý bật/tắt việc hiển thị tên mình công khai trên bản ghi cập nhật sản phẩm.
 */
export async function toggleContributorPublicCreditOptOut(
  ctx: SlcUserContext,
  versionId: string,
  optOut: boolean
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const version = await pAny.slcProductVersion.findUnique({ where: { id: versionId } })
  if (!version) {
    throw new Error("Không tìm thấy bản ghi phiên bản sản phẩm.")
  }
  if (version.contributorUserId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
    throw new Error("Chỉ giáo viên được ghi nhận đóng góp mới có thể thay đổi tùy chọn hiển thị tên của mình.")
  }

  const updated = await pAny.slcProductVersion.update({
    where: { id: version.id },
    data: { contributorOptOutPublic: optOut },
  })

  if (version.sourceCommentId) {
    await pAny.slcComment
      .update({
        where: { id: version.sourceCommentId },
        data: { contributorOptOutPublic: optOut },
      })
      .catch(() => null)
  }

  return updated
}

/**
 * Mở liên kết dùng thử sản phẩm:
 * QUY TẮC BẮT BUỘC (Mục V & XI.4):
 * "Mở liên kết là lượt mở, không tự tính đã trải nghiệm hoặc áp dụng."
 */
export async function recordProductTrialLinkOpen(ctx: SlcUserContext, productId: string) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const product = await pAny.slcProduct.findUnique({ where: { id: productId } })
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm.")
  }
  if (product.status === "DISCONTINUED") {
    throw new Error("Sản phẩm này đã ngừng hỗ trợ dùng thử.")
  }

  const updated = await pAny.slcProduct.update({
    where: { id: productId },
    data: { openLinkCount: { increment: 1 } },
  })

  return {
    openLinkCount: updated.openLinkCount,
    productUrl: updated.productUrl,
    countedAsExperienced: false,
    countedAsApplied: false,
  }
}

/**
 * Đánh giá sao (1–5) cho Ý tưởng (mức độ tiềm năng) hoặc Sản phẩm AI (mức độ hữu dụng):
 * - Chặn ở backend đánh giá của tác giả và đồng tác giả / cộng sự đã xác nhận.
 * - Với Sản phẩm AI: bắt buộc xác nhận đã trải nghiệm (confirmedExperienced === true).
 * - Mỗi GV chỉ có 1 đánh giá hiện hành cho 1 đối tượng (unique constraint), cập nhật được nhưng lưu lịch sử bất biến SlcRatingRevision.
 */
export async function submitOrUpdateSlcRating(
  ctx: SlcUserContext,
  input: {
    targetType: "IDEA" | "PRODUCT"
    targetId: string
    stars: number
    criteriaTags?: string[]
    reviewText?: string
    confirmedExperienced?: boolean
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const stars = Math.round(Number(input.stars))
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new Error("Điểm đánh giá sao phải là số nguyên từ 1 đến 5.")
  }

  let authorId = ""
  let collaboratorIds: string[] = []
  let productVersion: string | null = null
  let majorVersion = 1

  if (input.targetType === "IDEA") {
    const idea = await pAny.slcIdea.findUnique({ where: { id: input.targetId } })
    if (!idea) throw new Error("Không tìm thấy ý tưởng để đánh giá.")
    authorId = idea.authorId
    collaboratorIds = safeJsonParse<string[]>(idea.collaboratorIdsJson, [])
  } else {
    const product = await pAny.slcProduct.findUnique({ where: { id: input.targetId } })
    if (!product) throw new Error("Không tìm thấy sản phẩm để đánh giá.")
    if (!input.confirmedExperienced) {
      throw new Error("Vui lòng xác nhận Thầy/Cô đã trực tiếp trải nghiệm sản phẩm trước khi chấm sao hữu dụng.")
    }
    authorId = product.authorId
    collaboratorIds = safeJsonParse<string[]>(product.collaboratorIdsJson, [])
    productVersion = product.currentVersion || "1.0"
    majorVersion = product.majorVersion || 1
  }

  const rateCheck = canUserRateTarget(ctx, { authorId, collaboratorIds })
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason)
  }

  const starLabel =
    input.targetType === "IDEA"
      ? SLC_IDEA_STAR_DESCRIPTIONS[stars]?.label || `${stars} sao`
      : SLC_PRODUCT_STAR_DESCRIPTIONS[stars]?.label || `${stars} sao`

  const criteriaTagsJson = JSON.stringify(input.criteriaTags || [])
  const cleanReviewText = sanitizeRichText(input.reviewText)

  // Upsert current rating and append immutable revision
  const existing = await pAny.slcRating.findUnique({
    where: {
      targetType_targetId_reviewerId: {
        targetType: input.targetType,
        targetId: input.targetId,
        reviewerId: ctx.userId,
      },
    },
  })

  let rating: any
  if (existing) {
    rating = await pAny.slcRating.update({
      where: { id: existing.id },
      data: {
        stars,
        starLabel,
        criteriaTagsJson,
        reviewText: cleanReviewText || null,
        confirmedExperienced: input.targetType === "PRODUCT" ? true : Boolean(input.confirmedExperienced),
        productVersion,
        majorVersion,
        isValid: true,
        invalidReason: null,
        revisionCount: { increment: 1 },
        lastRevisedAt: new Date(),
      },
    })
  } else {
    try {
      rating = await pAny.slcRating.create({
        data: {
          targetType: input.targetType,
          targetId: input.targetId,
          reviewerId: ctx.userId,
          reviewerName: ctx.fullName,
          reviewerCampusId: ctx.campusId,
          stars,
          starLabel,
          criteriaTagsJson,
          reviewText: cleanReviewText || null,
          confirmedExperienced: input.targetType === "PRODUCT" ? true : Boolean(input.confirmedExperienced),
          productVersion,
          majorVersion,
          isValid: true,
          revisionCount: 1,
          lastRevisedAt: new Date(),
        },
      })
    } catch (err: any) {
      // Handle concurrent request race condition gracefully via unique constraint
      const raceExisting = await pAny.slcRating.findUnique({
        where: {
          targetType_targetId_reviewerId: {
            targetType: input.targetType,
            targetId: input.targetId,
            reviewerId: ctx.userId,
          },
        },
      })
      if (!raceExisting) throw err
      rating = await pAny.slcRating.update({
        where: { id: raceExisting.id },
        data: {
          stars,
          starLabel,
          criteriaTagsJson,
          reviewText: cleanReviewText || null,
          confirmedExperienced: input.targetType === "PRODUCT" ? true : Boolean(input.confirmedExperienced),
          productVersion,
          majorVersion,
          isValid: true,
          revisionCount: { increment: 1 },
          lastRevisedAt: new Date(),
        },
      })
    }
  }

  await pAny.slcRatingRevision.create({
    data: {
      ratingId: rating.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reviewerId: ctx.userId,
      reviewerName: ctx.fullName,
      stars,
      criteriaTagsJson,
      reviewText: cleanReviewText || null,
      confirmedExperienced: input.targetType === "PRODUCT" ? true : Boolean(input.confirmedExperienced),
      productVersion,
      majorVersion,
      isValidAtCreation: true,
    },
  })

  // Recalculate current valid R and n on target
  const excludedSet = new Set([authorId, ...collaboratorIds])
  const allValidRatings = (
    await pAny.slcRating.findMany({
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        isValid: true,
      },
    })
  ).filter((r: any) => !excludedSet.has(r.reviewerId))

  const validRatingCount = allValidRatings.length
  const avgRating =
    validRatingCount > 0
      ? allValidRatings.reduce((sum: number, r: any) => sum + Number(r.stars), 0) / validRatingCount
      : 0

  if (input.targetType === "IDEA") {
    await pAny.slcIdea.update({
      where: { id: input.targetId },
      data: { avgRating, validRatingCount },
    })
  } else {
    await pAny.slcProduct.update({
      where: { id: input.targetId },
      data: { avgRating, validRatingCount },
    })
  }

  return { rating, avgRating, validRatingCount }
}

/**
 * Nộp báo cáo áp dụng thực tế ("Tôi đã áp dụng") cho Sản phẩm AI:
 * - Tách bạch Tự xác nhận (SELF_DECLARED / PENDING_VERIFICATION) với Đã được xác nhận (VERIFIED).
 * - Không đòi danh sách HS hoặc điểm cá nhân.
 */
export async function submitProductApplication(
  ctx: SlcUserContext,
  input: {
    productId: string
    appliedAt?: string | Date
    subjectOrTask: string
    gradeLevel?: string
    howApplied: string
    observedResult: string
    evidenceText?: string
    evidenceUrls?: string[]
    requestVerification?: boolean
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const product = await pAny.slcProduct.findUnique({ where: { id: input.productId } })
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm AI.")
  }

  const collaborators = safeJsonParse<string[]>(product.collaboratorIdsJson, [])
  if (product.authorId === ctx.userId || collaborators.includes(ctx.userId)) {
    throw new Error("Tác giả và đồng tác giả không thể tự nộp minh chứng áp dụng cho sản phẩm của chính mình.")
  }

  const cleanSubjectOrTask = sanitizeRichText(input.subjectOrTask)
  const cleanHowApplied = sanitizeRichText(input.howApplied)
  const cleanObservedResult = sanitizeRichText(input.observedResult)

  if (!cleanSubjectOrTask || !cleanHowApplied || !cleanObservedResult) {
    throw new Error("Vui lòng nhập môn học/công việc, cách áp dụng và kết quả quan sát thực tế.")
  }

  const hasEvidence =
    Boolean(sanitizeRichText(input.evidenceText)) ||
    Boolean(input.evidenceUrls && input.evidenceUrls.length > 0)

  const verificationStatus =
    input.requestVerification || hasEvidence ? "PENDING_VERIFICATION" : "SELF_DECLARED"

  const application = await pAny.slcProductApplication.create({
    data: {
      productId: product.id,
      productVersion: product.currentVersion || "1.0",
      applicantId: ctx.userId,
      applicantName: ctx.fullName,
      campusId: ctx.campusId,
      campusName: ctx.campusName || "Hệ thống Sky-Line",
      appliedAt: input.appliedAt ? new Date(input.appliedAt) : new Date(),
      subjectOrTask: cleanSubjectOrTask,
      gradeLevel: sanitizeRichText(input.gradeLevel) || null,
      howApplied: cleanHowApplied,
      observedResult: cleanObservedResult,
      evidenceText: sanitizeRichText(input.evidenceText) || null,
      evidenceUrlsJson: JSON.stringify(input.evidenceUrls || []),
      hasStudentPiiRedacted: true,
      verificationStatus,
    },
  })

  await recalculateProductApplicationCounts(product.id)

  return application
}

/**
 * Người có quyền chuyên môn (EVIDENCE_VERIFIER / COORDINATOR / ADMIN) duyệt minh chứng áp dụng:
 * VERIFIED (Đã xác nhận) | SUPPLEMENT_REQUESTED (Yêu cầu bổ sung) | REJECTED (Từ chối), kèm lý do.
 */
export async function verifyProductApplication(
  ctx: SlcUserContext,
  input: {
    applicationId: string
    decision: "VERIFIED" | "SUPPLEMENT_REQUESTED" | "REJECTED"
    reason: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const application = await pAny.slcProductApplication.findUnique({
    where: { id: input.applicationId },
  })
  if (!application) {
    throw new Error("Không tìm thấy hồ sơ áp dụng thực tế.")
  }

  const canVerify =
    hasSlcRoleInScope(ctx, "EVIDENCE_VERIFIER", { campusId: application.campusId }) ||
    hasSlcRoleInScope(ctx, "COORDINATOR", { campusId: application.campusId }) ||
    isSuperOrCommunityAdmin(ctx)

  if (!canVerify) {
    throw new Error("Thầy/Cô không có quyền xác nhận minh chứng áp dụng thực tế.")
  }

  if (application.applicantId === ctx.userId) {
    throw new Error("Người nộp minh chứng không thể tự duyệt minh chứng của chính mình.")
  }

  const cleanReason = sanitizeRichText(input.reason)
  if (!cleanReason) {
    throw new Error("Vui lòng nhập nhận xét / lý do xác nhận hoặc yêu cầu bổ sung minh chứng.")
  }

  const updated = await pAny.slcProductApplication.update({
    where: { id: application.id },
    data: {
      verificationStatus: input.decision,
      verifierId: ctx.userId,
      verifierName: ctx.fullName,
      verificationReason: cleanReason,
      verifiedAt: new Date(),
    },
  })

  await recalculateProductApplicationCounts(application.productId)

  await recordSlcAuditLog(ctx, `VERIFY_EVIDENCE_${input.decision}`, "PRODUCT_APPLICATION", application.id, {
    productId: application.productId,
    applicantId: application.applicantId,
    decision: input.decision,
    reason: cleanReason,
  })

  await dispatchSlcNotification({
    idempotencyKey: `evidence_decision:${application.id}:${input.decision}:${Date.now()}`,
    recipientId: application.applicantId,
    actorId: ctx.userId,
    eventType: "EVIDENCE_DECISION",
    targetType: "PRODUCT_APPLICATION",
    targetId: application.id,
    title:
      input.decision === "VERIFIED"
        ? "Minh chứng áp dụng sản phẩm đã được xác nhận"
        : input.decision === "SUPPLEMENT_REQUESTED"
        ? "Yêu cầu bổ sung minh chứng áp dụng"
        : "Kết quả rà soát minh chứng áp dụng",
    message: `${ctx.fullName}: ${cleanReason}`,
    deepLink: `/teacher/skyline-connect/products/${application.productId}`,
  })

  return updated
}

export async function recalculateProductApplicationCounts(productId: string) {
  const pAny = prisma as any
  const allApps = await pAny.slcProductApplication.findMany({
    where: { productId },
  })
  const product = await pAny.slcProduct.findUnique({ where: { id: productId } })
  const excluded = new Set<string>([
    product?.authorId || "",
    ...safeJsonParse<string[]>(product?.collaboratorIdsJson, []),
  ])

  const selfSet = new Set<string>()
  const verifiedSet = new Set<string>()

  for (const app of allApps) {
    if (excluded.has(app.applicantId)) continue
    if (app.verificationStatus !== "REJECTED") {
      selfSet.add(app.applicantId)
    }
    if (app.verificationStatus === "VERIFIED") {
      verifiedSet.add(app.applicantId)
    }
  }

  await pAny.slcProduct.update({
    where: { id: productId },
    data: {
      selfAppliedCount: selfSet.size,
      verifiedEvidenceCount: verifiedSet.size,
    },
  })

  return {
    selfAppliedCount: selfSet.size,
    verifiedEvidenceCount: verifiedSet.size,
  }
}

/**
 * Luồng Dự án & Tìm cộng sự (Mục V & VI):
 * - Đăng ký tham gia (PENDING_REQUEST) -> Chủ dự án duyệt (APPROVED) -> Thành viên.
 * - Hoặc Chủ dự án mời (INVITED) -> Người được mời chấp nhận (APPROVED) -> Thành viên (không tự thêm khi chưa chấp nhận).
 * - Khi thành viên mới trở thành đồng tác giả (APPROVED), cập nhật collaboratorIdsJson và vô hiệu hóa điểm đánh giá sao
 *   mà người đó đã chấm trước đó cho các kỳ chưa chốt (bản đã chốt giữ nguyên).
 */
export async function handleProjectCollaboration(
  ctx: SlcUserContext,
  input: {
    projectId: string
    action: "REQUEST_JOIN" | "INVITE_MEMBER" | "APPROVE_REQUEST" | "REJECT_REQUEST" | "ACCEPT_INVITE" | "UPDATE_CONTRIBUTION"
    targetUserId?: string
    targetUserName?: string
    roleName?: string
    message?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const project = await pAny.slcProject.findUnique({ where: { id: input.projectId } })
  if (!project) {
    throw new Error("Không tìm thấy dự án.")
  }

  if (input.action === "REQUEST_JOIN") {
    if (project.ownerId === ctx.userId) {
      throw new Error("Thầy/Cô đã là chủ nhiệm của dự án này.")
    }
    const existing = await pAny.slcProjectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: ctx.userId } },
    })
    if (existing && existing.status === "APPROVED") {
      throw new Error("Thầy/Cô đã là thành viên chính thức của dự án.")
    }

    const member = existing
      ? await pAny.slcProjectMember.update({
          where: { id: existing.id },
          data: {
            status: "PENDING_REQUEST",
            roleName: sanitizeRichText(input.roleName || "Cộng sự chuyên môn"),
            requestMessage: sanitizeRichText(input.message),
          },
        })
      : await pAny.slcProjectMember.create({
          data: {
            projectId: project.id,
            userId: ctx.userId,
            userName: ctx.fullName,
            campusName: ctx.campusName || "Hệ thống Sky-Line",
            roleName: sanitizeRichText(input.roleName || "Cộng sự chuyên môn"),
            memberRole: "CO_AUTHOR",
            status: "PENDING_REQUEST",
            requestMessage: sanitizeRichText(input.message),
          },
        })

    await dispatchSlcNotification({
      idempotencyKey: `proj_req:${project.id}:${ctx.userId}:${Date.now()}`,
      recipientId: project.ownerId,
      actorId: ctx.userId,
      eventType: "PROJECT_INVITE",
      targetType: "PROJECT",
      targetId: project.id,
      postId: project.postId,
      title: "Đăng ký tham gia dự án mới",
      message: `${ctx.fullName} đăng ký tham gia dự án "${project.title}" với vai trò ${member.roleName}.`,
      deepLink: `/teacher/skyline-connect/groups-projects?projectId=${project.id}`,
    })

    return member
  }

  if (input.action === "INVITE_MEMBER") {
    if (project.ownerId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Chỉ chủ nhiệm dự án mới có thể gửi lời mời cộng sự.")
    }
    if (!input.targetUserId) {
      throw new Error("Vui lòng chọn giáo viên cần mời.")
    }
    // Không tự thêm người khi chưa chấp nhận lời mời -> trạng thái INVITED
    const invited = await pAny.slcProjectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: input.targetUserId } },
      update: {
        status: "INVITED",
        roleName: sanitizeRichText(input.roleName || "Cộng sự chuyên môn"),
      },
      create: {
        projectId: project.id,
        userId: input.targetUserId,
        userName: sanitizeRichText(input.targetUserName || "Giáo viên Sky-Line"),
        roleName: sanitizeRichText(input.roleName || "Cộng sự chuyên môn"),
        memberRole: "CO_AUTHOR",
        status: "INVITED",
      },
    })

    await dispatchSlcNotification({
      idempotencyKey: `proj_invite:${project.id}:${input.targetUserId}:${Date.now()}`,
      recipientId: input.targetUserId,
      actorId: ctx.userId,
      eventType: "PROJECT_INVITE",
      targetType: "PROJECT",
      targetId: project.id,
      postId: project.postId,
      title: "Lời mời tham gia dự án sáng tạo",
      message: `${ctx.fullName} mời Thầy/Cô cùng phát triển dự án "${project.title}".`,
      deepLink: `/teacher/skyline-connect/groups-projects?projectId=${project.id}`,
    })

    return invited
  }

  if (input.action === "APPROVE_REQUEST" || input.action === "REJECT_REQUEST") {
    if (project.ownerId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Chỉ chủ nhiệm dự án mới có quyền duyệt thành viên.")
    }
    const targetUserId = input.targetUserId
    if (!targetUserId) throw new Error("Thiếu thông tin thành viên cần duyệt.")

    const existing = await pAny.slcProjectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: targetUserId } },
    })
    if (!existing) throw new Error("Không tìm thấy yêu cầu tham gia dự án.")

    if (existing.status === "INVITED" && input.action === "APPROVE_REQUEST") {
      throw new Error("Giáo viên được mời cần trực tiếp chấp nhận lời mời trước khi trở thành thành viên.")
    }

    const newStatus = input.action === "APPROVE_REQUEST" ? "APPROVED" : "REJECTED"
    const updated = await pAny.slcProjectMember.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
    })

    if (newStatus === "APPROVED") {
      await syncProjectCollaboratorsAndInvalidateRatings(project.id, targetUserId)
      await dispatchSlcNotification({
        idempotencyKey: `proj_approved:${project.id}:${targetUserId}`,
        recipientId: targetUserId,
        actorId: ctx.userId,
        eventType: "PROJECT_APPROVED",
        targetType: "PROJECT",
        targetId: project.id,
        postId: project.postId,
        title: "Đã được duyệt tham gia dự án",
        message: `${ctx.fullName} đã duyệt Thầy/Cô vào dự án "${project.title}".`,
        deepLink: `/teacher/skyline-connect/groups-projects?projectId=${project.id}`,
      })
    }

    return updated
  }

  if (input.action === "ACCEPT_INVITE") {
    const existing = await pAny.slcProjectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: ctx.userId } },
    })
    if (!existing || existing.status !== "INVITED") {
      throw new Error("Không tìm thấy lời mời tham gia dự án dành cho Thầy/Cô.")
    }

    const updated = await pAny.slcProjectMember.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    })

    await syncProjectCollaboratorsAndInvalidateRatings(project.id, ctx.userId)
    return updated
  }

  if (input.action === "UPDATE_CONTRIBUTION") {
    const targetUid = input.targetUserId || ctx.userId
    const existing = await pAny.slcProjectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: targetUid } },
    })
    if (!existing || existing.status !== "APPROVED") {
      throw new Error("Chỉ thành viên chính thức mới có thể cập nhật đóng góp.")
    }
    if (targetUid !== ctx.userId && project.ownerId !== ctx.userId && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Thầy/Cô không có quyền cập nhật đóng góp của thành viên khác.")
    }

    return pAny.slcProjectMember.update({
      where: { id: existing.id },
      data: {
        contributionSummary: sanitizeRichText(input.message),
        roleName: input.roleName ? sanitizeRichText(input.roleName) : existing.roleName,
      },
    })
  }

  throw new Error("Thao tác dự án không hợp lệ.")
}

/**
 * Đồng bộ danh sách đồng tác giả (collaboratorIdsJson) trên Ý tưởng & Sản phẩm liên kết với Dự án,
 * và tự động vô hiệu hóa điểm đánh giá sao của thành viên mới tham gia đối với các kỳ chưa chốt:
 * "Nếu thành viên mới tham gia sau khi đánh giá, điểm đó không còn hợp lệ cho các kỳ chưa chốt;
 * bản đã chốt giữ nguyên kèm cơ chế xem lại có nhật ký khi cần."
 */
export async function syncProjectCollaboratorsAndInvalidateRatings(
  projectId: string,
  newCollaboratorUserId: string
) {
  const pAny = prisma as any
  const project = await pAny.slcProject.findUnique({ where: { id: projectId } })
  if (!project) return

  const approvedMembers = await pAny.slcProjectMember.findMany({
    where: { projectId, status: "APPROVED" },
  })
  const collaboratorIds = Array.from(
    new Set<string>(approvedMembers.map((m: any) => String(m.userId)))
  )

  await pAny.slcProject.update({
    where: { id: projectId },
    data: { memberCount: collaboratorIds.length },
  })

  const linkedIdeaId = project.linkedIdeaId
  const linkedProductIds = safeJsonParse<string[]>(project.linkedProductIdsJson, [])
  const productsByProject = await pAny.slcProduct.findMany({
    where: { linkedProjectId: projectId },
    select: { id: true },
  })
  const allProductIds = Array.from(
    new Set([...linkedProductIds, ...productsByProject.map((p: any) => String(p.id))])
  )

  if (linkedIdeaId) {
    await pAny.slcIdea
      .update({
        where: { id: linkedIdeaId },
        data: { collaboratorIdsJson: JSON.stringify(collaboratorIds) },
      })
      .catch(() => null)

    await invalidateCollaboratorRatingOnTarget("IDEA", linkedIdeaId, newCollaboratorUserId, [
      project.ownerId,
      ...collaboratorIds,
    ])
  }

  for (const prodId of allProductIds) {
    await pAny.slcProduct
      .update({
        where: { id: prodId },
        data: { collaboratorIdsJson: JSON.stringify(collaboratorIds) },
      })
      .catch(() => null)

    await invalidateCollaboratorRatingOnTarget("PRODUCT", prodId, newCollaboratorUserId, [
      project.ownerId,
      ...collaboratorIds,
    ])
  }
}

export async function invalidateCollaboratorRatingOnTarget(
  targetType: "IDEA" | "PRODUCT",
  targetId: string,
  collaboratorUserId: string,
  allExcludedIds: string[]
) {
  const pAny = prisma as any
  const existingRating = await pAny.slcRating
    ?.findUnique({
      where: {
        targetType_targetId_reviewerId: {
          targetType,
          targetId,
          reviewerId: collaboratorUserId,
        },
      },
    })
    .catch(() => null)

  if (existingRating && existingRating.isValid) {
    await pAny.slcRating.update({
      where: { id: existingRating.id },
      data: {
        isValid: false,
        invalidReason: "BECAME_COLLABORATOR",
        invalidatedAt: new Date(),
      },
    })

    // Recalculate current valid R and n
    const excludedSet = new Set(allExcludedIds)
    const validRatings = (
      await pAny.slcRating.findMany({
        where: { targetType, targetId, isValid: true },
      })
    ).filter((r: any) => !excludedSet.has(r.reviewerId))

    const validRatingCount = validRatings.length
    const avgRating =
      validRatingCount > 0
        ? validRatings.reduce((s: number, r: any) => s + Number(r.stars), 0) / validRatingCount
        : 0

    if (targetType === "IDEA") {
      await pAny.slcIdea
        .update({ where: { id: targetId }, data: { avgRating, validRatingCount } })
        .catch(() => null)
    } else {
      await pAny.slcProduct
        .update({ where: { id: targetId }, data: { avgRating, validRatingCount } })
        .catch(() => null)
    }
  }
}

/**
 * Chấm điểm chuyên môn độc lập (SlcExpertEvaluation):
 * - Người chấm phải được phân công (hoặc có quyền EXPERT_REVIEWER trong phạm vi).
 * - Chặn tuyệt đối tác giả và cộng tác viên tự chấm chuyên môn cho đối tượng của mình.
 * - Chấm 3 tiêu chí 1–5 trọng số bằng nhau.
 */
export async function submitSlcExpertEvaluation(
  ctx: SlcUserContext,
  input: {
    periodId?: string
    targetType: "IDEA" | "PRODUCT"
    targetId: string
    criterion1Score: number
    criterion2Score: number
    criterion3Score: number
    comments?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any
  const periodId = input.periodId || "GLOBAL"

  const scores = [
    Number(input.criterion1Score),
    Number(input.criterion2Score),
    Number(input.criterion3Score),
  ]
  if (scores.some((s) => !Number.isFinite(s) || s < 1 || s > 5)) {
    throw new Error("Điểm từng tiêu chí chuyên môn phải nằm trong khoảng từ 1 đến 5.")
  }

  let authorId = ""
  let collaboratorIds: string[] = []
  let campusId: string | null = null

  if (input.targetType === "IDEA") {
    const idea = await pAny.slcIdea.findUnique({ where: { id: input.targetId } })
    if (!idea) throw new Error("Không tìm thấy ý tưởng cần chấm chuyên môn.")
    authorId = idea.authorId
    campusId = idea.campusId
    collaboratorIds = safeJsonParse<string[]>(idea.collaboratorIdsJson, [])
  } else {
    const product = await pAny.slcProduct.findUnique({ where: { id: input.targetId } })
    if (!product) throw new Error("Không tìm thấy sản phẩm cần chấm chuyên môn.")
    authorId = product.authorId
    campusId = product.campusId
    collaboratorIds = safeJsonParse<string[]>(product.collaboratorIdsJson, [])
  }

  if (authorId === ctx.userId || collaboratorIds.includes(ctx.userId)) {
    throw new Error("Tác giả và cộng tác viên không được chấm điểm chuyên môn cho đối tượng của chính mình.")
  }

  const existingAssignment = await pAny.slcExpertEvaluation
    .findUnique({
      where: {
        periodId_targetType_targetId_expertId: {
          periodId,
          targetType: input.targetType,
          targetId: input.targetId,
          expertId: ctx.userId,
        },
      },
    })
    .catch(() => null)

  const hasExpertRole =
    Boolean(existingAssignment) ||
    hasSlcRoleInScope(ctx, "EXPERT_REVIEWER", { campusId, periodId }) ||
    isSuperOrCommunityAdmin(ctx)

  if (!hasExpertRole) {
    throw new Error("Thầy/Cô chưa được phân công quyền chấm điểm chuyên môn cho đối tượng này.")
  }

  const averageStars = (scores[0] + scores[1] + scores[2]) / 3
  const evaluation = await pAny.slcExpertEvaluation.upsert({
    where: {
      periodId_targetType_targetId_expertId: {
        periodId,
        targetType: input.targetType,
        targetId: input.targetId,
        expertId: ctx.userId,
      },
    },
    update: {
      status: "SUBMITTED",
      criterion1Score: scores[0],
      criterion2Score: scores[1],
      criterion3Score: scores[2],
      averageStars,
      comments: sanitizeRichText(input.comments) || null,
      submittedAt: new Date(),
    },
    create: {
      periodId,
      targetType: input.targetType,
      targetId: input.targetId,
      expertId: ctx.userId,
      expertName: ctx.fullName,
      status: "SUBMITTED",
      criterion1Score: scores[0],
      criterion2Score: scores[1],
      criterion3Score: scores[2],
      averageStars,
      comments: sanitizeRichText(input.comments) || null,
      submittedAt: new Date(),
    },
  })

  await recordSlcAuditLog(ctx, "SUBMIT_EXPERT_EVALUATION", input.targetType, input.targetId, {
    periodId,
    criterion1Score: scores[0],
    criterion2Score: scores[1],
    criterion3Score: scores[2],
    averageStars,
  })

  return evaluation
}

/**
 * Đăng ký dự kỳ Bảng vàng (SlcAwardNomination):
 * - Ý tưởng cần đăng ký dự kỳ trước hạn (khi kỳ đang ở trạng thái OPEN).
 * - Tháng sau chỉ dự lại nếu có cải tiến đáng kể được điều phối xác nhận (isReEntry -> coordinatorConfirmed).
 */
export async function registerAwardNomination(
  ctx: SlcUserContext,
  input: {
    periodId: string
    targetType: "IDEA" | "PRODUCT"
    targetId: string
    improvementSummary?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const period = await pAny.slcAwardPeriod.findUnique({ where: { id: input.periodId } })
  if (!period) {
    throw new Error("Không tìm thấy kỳ xét giải Bảng vàng.")
  }
  if (period.status !== "OPEN" && !isSuperOrCommunityAdmin(ctx)) {
    throw new Error("Kỳ xét giải hiện không trong thời gian mở nhận đăng ký.")
  }
  if (new Date().getTime() >= new Date(period.endDateUtc).getTime() && !isSuperOrCommunityAdmin(ctx)) {
    throw new Error("Đã quá thời hạn đăng ký dự kỳ xét giải này.")
  }

  // Check if target already entered a previous period
  const previousNominations = await pAny.slcAwardNomination.findMany({
    where: {
      targetType: input.targetType,
      targetId: input.targetId,
      periodId: { not: period.id },
    },
  })

  const isReEntry = previousNominations.length > 0
  if (input.targetType === "IDEA" && isReEntry && !sanitizeRichText(input.improvementSummary)) {
    throw new Error("Ý tưởng đăng ký dự xét lại ở kỳ mới bắt buộc nêu rõ nội dung cải tiến đáng kể để điều phối viên xác nhận.")
  }

  const nomination = await pAny.slcAwardNomination.upsert({
    where: {
      periodId_targetType_targetId: {
        periodId: period.id,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
    update: {
      isReEntry,
      improvementSummary: sanitizeRichText(input.improvementSummary) || null,
      coordinatorConfirmed: input.targetType === "IDEA" && isReEntry ? false : true,
    },
    create: {
      periodId: period.id,
      targetType: input.targetType,
      targetId: input.targetId,
      nominatorId: ctx.userId,
      isReEntry,
      improvementSummary: sanitizeRichText(input.improvementSummary) || null,
      coordinatorConfirmed: input.targetType === "IDEA" && isReEntry ? false : true,
    },
  })

  return nomination
}

/**
 * Tính toán bảng xếp hạng Bảng vàng (Tạm tính / Đang rà soát / Đã chốt) cho một kỳ:
 * - Nếu kỳ đã FINALIZED: trả về đúng snapshot OFFICIAL (hoặc AMENDMENT mới nhất) đã lưu bất biến,
 *   đảm bảo đánh giá/chỉnh sửa sau hạn KHÔNG làm thay đổi kết quả đã chốt!
 * - Nếu kỳ đang OPEN / DATA_LOCKED / REVIEWING: tính toán theo đúng công thức thí điểm và quy chế gắn với kỳ.
 */
export async function computeOrLoadPeriodHallOfFame(
  periodId: string,
  filters?: {
    campusId?: string
    subjectCode?: string
    gradeLevel?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const period = await pAny.slcAwardPeriod.findUnique({ where: { id: periodId } })
  if (!period) {
    throw new Error("Không tìm thấy kỳ Bảng vàng.")
  }

  // If FINALIZED, load from immutable snapshots (AMENDMENT overrides OFFICIAL if present)
  if (period.status === "FINALIZED") {
    const snapshots = await pAny.slcAwardSnapshot.findMany({
      where: {
        periodId: period.id,
        snapshotType: { in: ["OFFICIAL", "AMENDMENT"] },
      },
      orderBy: [{ createdAt: "desc" }],
    })

    // Pick latest snapshot per (targetType, targetId)
    const latestMap = new Map<string, any>()
    for (const s of snapshots) {
      const key = `${s.targetType}:${s.targetId}`
      if (!latestMap.has(key)) {
        latestMap.set(key, s)
      }
    }

    const toRankedFormat = (type: "IDEA" | "PRODUCT") => {
      const list = Array.from(latestMap.values())
        .filter((s) => s.targetType === type)
        .map((s) => ({
          candidate: {
            targetType: s.targetType as "IDEA" | "PRODUCT",
            targetId: s.targetId,
            targetTitle: s.targetTitle,
            targetCoverImage: s.targetCoverImage,
            authorId: s.authorId,
            authorName: s.authorName,
            campusId: s.campusId,
            campusName: s.campusName,
            subjectCodes: safeJsonParse<string[]>(s.subjectCodesJson, []),
            gradeLevels: safeJsonParse<string[]>(s.gradeLevelsJson, []),
            isEligible: Boolean(s.isEligible),
            ineligibleReasons: safeJsonParse<string[]>(s.ineligibleReasonsJson, []),
            validRatingCountN: Number(s.validRatingCountN),
            avgRatingR: Number(s.avgRatingR),
            scoreC: Number(s.scoreC),
            expertCount: Number(s.expertCount),
            avgExpertStars: s.avgExpertStars !== null ? Number(s.avgExpertStars) : null,
            scoreE: s.scoreE !== null ? Number(s.scoreE) : null,
            verifiedAppsCountA: Number(s.verifiedAppsCountA || 0),
            scoreU: s.scoreU !== null ? Number(s.scoreU) : null,
            totalScoreRaw: s.totalScoreRaw !== null ? Number(s.totalScoreRaw) : null,
            snapshotId: s.id,
            snapshotType: s.snapshotType,
            amendmentReason: s.amendmentReason,
          },
          rank: s.rank !== null ? Number(s.rank) : null,
          isTied: Boolean(s.isTied),
        }))
        .sort((a, b) => {
          if (a.rank !== null && b.rank !== null) return a.rank - b.rank
          if (a.rank !== null) return -1
          if (b.rank !== null) return 1
          return 0
        })

      return filters ? filterRankedCandidatesKeepingOriginalRank(list, filters) : list
    }

    return {
      period,
      ruleParams: safeJsonParse<SlcRuleParameters>(
        period.ruleSetSnapshotJson,
        period.periodType === "YEARLY" ? DEFAULT_YEARLY_RULE_PARAMS : DEFAULT_MONTHLY_RULE_PARAMS
      ),
      ideaStandings: toRankedFormat("IDEA"),
      productStandings: toRankedFormat("PRODUCT"),
      isOfficial: true,
    }
  }

  // Otherwise calculate live/provisional standings from immutable revisions within [startDateUtc, endDateUtc)
  const ruleSet = await pAny.slcAwardRuleSet
    ?.findUnique({ where: { id: period.ruleSetId } })
    .catch(() => null)

  const baseDefault =
    period.periodType === "YEARLY" ? DEFAULT_YEARLY_RULE_PARAMS : DEFAULT_MONTHLY_RULE_PARAMS
  const ruleParams: SlcRuleParameters = {
    ...baseDefault,
    ...safeJsonParse<Partial<SlcRuleParameters>>(period.ruleSetSnapshotJson, {}),
    ...(ruleSet
      ? {
          periodType: ruleSet.periodType,
          minRatingsIdea: ruleSet.minRatingsIdea,
          minRatingsProduct: ruleSet.minRatingsProduct,
          minVerifiedAppsProduct: ruleSet.minVerifiedAppsProduct,
          minExpertReviewers: ruleSet.minExpertReviewers,
          bayesianM: ruleSet.bayesianM,
          bayesianPrior: ruleSet.bayesianPrior,
          capVerifiedApps: ruleSet.capVerifiedApps,
          ideaWeightC: ruleSet.ideaWeightC,
          ideaWeightE: ruleSet.ideaWeightE,
          productWeightC: ruleSet.productWeightC,
          productWeightE: ruleSet.productWeightE,
          productWeightU: ruleSet.productWeightU,
        }
      : {}),
  }

  const startDateUtc = new Date(period.startDateUtc)
  const endDateUtc = new Date(period.endDateUtc)
  const reviewDeadlineUtc = new Date(period.reviewDeadlineUtc)

  const [ideas, products, nominations, allRatingRevisions, allApplications, allExpertEvals, concludedReports] =
    await Promise.all([
      pAny.slcIdea.findMany(),
      pAny.slcProduct.findMany(),
      pAny.slcAwardNomination.findMany({ where: { periodId: period.id } }),
      pAny.slcRatingRevision.findMany({
        where: {
          createdAt: {
            gte: startDateUtc,
            lt: endDateUtc,
          },
        },
      }),
      pAny.slcProductApplication.findMany({
        where: {
          submittedAt: {
            gte: startDateUtc,
            lt: endDateUtc,
          },
        },
      }),
      pAny.slcExpertEvaluation.findMany({
        where: {
          periodId: { in: [period.id, "GLOBAL"] },
          status: "SUBMITTED",
        },
      }),
      pAny.slcContentReport.findMany({
        where: {
          status: { in: ["CONCLUDED", "NOTIFIED", "APPEAL_RESOLVED"] },
          conclusion: { in: ["HIDE_CONTENT", "DISQUALIFY_PERIOD"] },
        },
      }),
    ])

  // Check current rating validity map (e.g. if a reviewer later became collaborator in an unfinalized period)
  const allCurrentRatings = await pAny.slcRating.findMany({
    where: { isValid: false },
    select: { targetType: true, targetId: true, reviewerId: true },
  })
  const invalidatedMap = new Map<string, Set<string>>()
  for (const inv of allCurrentRatings) {
    const key = `${inv.targetType}:${inv.targetId}`
    if (!invalidatedMap.has(key)) invalidatedMap.set(key, new Set())
    invalidatedMap.get(key)!.add(inv.reviewerId)
  }

  const nominationMap = new Map<string, any>()
  for (const nom of nominations) {
    nominationMap.set(`${nom.targetType}:${nom.targetId}`, nom)
  }

  const violatedTargetKeys = new Set<string>()
  for (const rep of concludedReports) {
    violatedTargetKeys.add(`${rep.targetType}:${rep.targetId}`)
  }

  // Evaluate Ideas
  const ideaCandidates = ideas
    .filter((idea: any) =>
      isEligibleForAudienceHallOfFame(
        {
          status: idea.status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED",
          visibility: idea.visibility,
          campusId: idea.campusId,
          groupId: idea.groupId,
        },
        { audienceScope: period.audienceScope, audienceScopeId: period.audienceScopeId }
      )
    )
    .map((idea: any) => {
      const key = `IDEA:${idea.id}`
      const nom = nominationMap.get(key)
      const collaborators = safeJsonParse<string[]>(idea.collaboratorIdsJson, [])
      const invalidatedReviewers = Array.from(invalidatedMap.get(key) || [])

      const validRevs = selectValidPeriodRatingRevisions(
        allRatingRevisions.filter((r: any) => r.targetType === "IDEA" && r.targetId === idea.id),
        {
          targetType: "IDEA",
          startDateUtc,
          endDateUtc,
          authorId: idea.authorId,
          collaboratorIds: collaborators,
          invalidatedReviewerIds: invalidatedReviewers,
        }
      )

      const n = validRevs.length
      const R = n > 0 ? validRevs.reduce((s, r) => s + Number(r.stars), 0) / n : 0

      const expertResult = computeExpertScoreE(
        allExpertEvals.filter((e: any) => e.targetType === "IDEA" && e.targetId === idea.id),
        {
          authorId: idea.authorId,
          collaboratorIds: collaborators,
          minExpertReviewers: ruleParams.minExpertReviewers,
        }
      )

      const hasViolation =
        Boolean(nom?.hasConcludedViolation) ||
        violatedTargetKeys.has(key) ||
        violatedTargetKeys.has(`POST:${idea.postId}`)

      const isRegistered =
        period.periodType === "YEARLY" ? true : Boolean(nom && nom.status !== "DISQUALIFIED")
      const isReEntryWithoutImprovement =
        period.periodType === "MONTHLY" && Boolean(nom?.isReEntry && !nom?.coordinatorConfirmed)

      const scoreRes = evaluateCandidateForPeriod({
        targetType: "IDEA",
        targetId: idea.id,
        validRatingCountN: n,
        avgRatingR: R,
        expertCount: expertResult.validExpertCount,
        avgExpertStars: expertResult.avgExpertStars,
        scoreE: expertResult.scoreE,
        hasConcludedViolation: hasViolation,
        isRegisteredForPeriod: isRegistered,
        isReEntryWithoutImprovement,
        isAudienceAccessible: true,
        ruleParams,
      })

      return {
        ...scoreRes,
        targetTitle: idea.title,
        targetCoverImage: null as string | null,
        authorId: idea.authorId,
        authorName: idea.authorName,
        campusId: idea.campusId,
        campusName: idea.campusName,
        postId: idea.postId,
        subjectCodes: safeJsonParse<string[]>(idea.subjectCodesJson, []),
        gradeLevels: safeJsonParse<string[]>(idea.gradeLevelsJson, []),
      }
    })

  // Evaluate Products
  const productCandidates = products
    .filter((prod: any) => {
      if (
        !isEligibleForAudienceHallOfFame(
          {
            status: prod.status === "DISCONTINUED" ? "ARCHIVED" : "PUBLISHED",
            visibility: prod.visibility,
            campusId: prod.campusId,
            groupId: prod.groupId,
          },
          { audienceScope: period.audienceScope, audienceScopeId: period.audienceScopeId }
        )
      ) {
        return false
      }
      return true
    })
    .map((prod: any) => {
      const key = `PRODUCT:${prod.id}`
      const nom = nominationMap.get(key)
      const collaborators = safeJsonParse<string[]>(prod.collaboratorIdsJson, [])
      const invalidatedReviewers = Array.from(invalidatedMap.get(key) || [])

      const validRevs = selectValidPeriodRatingRevisions(
        allRatingRevisions.filter((r: any) => r.targetType === "PRODUCT" && r.targetId === prod.id),
        {
          targetType: "PRODUCT",
          startDateUtc,
          endDateUtc,
          authorId: prod.authorId,
          collaboratorIds: collaborators,
          invalidatedReviewerIds: invalidatedReviewers,
        }
      )

      const validApps = selectValidPeriodVerifiedApplications(
        allApplications.filter((a: any) => a.productId === prod.id),
        {
          startDateUtc,
          endDateUtc,
          reviewDeadlineUtc,
          authorId: prod.authorId,
          collaboratorIds: collaborators,
        }
      )

      const n = validRevs.length
      const R = n > 0 ? validRevs.reduce((s, r) => s + Number(r.stars), 0) / n : 0
      const a = validApps.length

      const expertResult = computeExpertScoreE(
        allExpertEvals.filter((e: any) => e.targetType === "PRODUCT" && e.targetId === prod.id),
        {
          authorId: prod.authorId,
          collaboratorIds: collaborators,
          minExpertReviewers: ruleParams.minExpertReviewers,
        }
      )

      const hasViolation =
        Boolean(nom?.hasConcludedViolation) ||
        violatedTargetKeys.has(key) ||
        (prod.postId && violatedTargetKeys.has(`POST:${prod.postId}`))

      const scoreRes = evaluateCandidateForPeriod({
        targetType: "PRODUCT",
        targetId: prod.id,
        validRatingCountN: n,
        avgRatingR: R,
        expertCount: expertResult.validExpertCount,
        avgExpertStars: expertResult.avgExpertStars,
        scoreE: expertResult.scoreE,
        verifiedAppsCountA: a,
        hasConcludedViolation: Boolean(hasViolation),
        isRegisteredForPeriod: true, // Sản phẩm dự lại được khi có đánh giá hoặc áp dụng mới của kỳ
        isAudienceAccessible: true,
        ruleParams,
      })

      return {
        ...scoreRes,
        targetTitle: prod.name,
        targetCoverImage: prod.coverImageUrl,
        authorId: prod.authorId,
        authorName: prod.authorName,
        campusId: prod.campusId,
        campusName: prod.campusName,
        postId: prod.postId,
        productUrl: prod.productUrl,
        subjectCodes: safeJsonParse<string[]>(prod.subjectCodesJson, []),
        gradeLevels: safeJsonParse<string[]>(prod.gradeLevelsJson, []),
      }
    })

  const rankedIdeas = rankHallOfFameCandidates(ideaCandidates)
  const rankedProducts = rankHallOfFameCandidates(productCandidates)

  return {
    period,
    ruleParams,
    ideaStandings: filters ? filterRankedCandidatesKeepingOriginalRank(rankedIdeas, filters) : rankedIdeas,
    productStandings: filters ? filterRankedCandidatesKeepingOriginalRank(rankedProducts, filters) : rankedProducts,
    isOfficial: false,
  }
}

/**
 * Chốt kỳ Bảng vàng (FINALIZED) bằng giao dịch và khóa duy nhất (idempotent):
 * - Lưu snapshot điểm thành phần, đối tượng/người đánh giá đủ điều kiện, dữ liệu minh chứng, chuyên môn, quy chế và người/thời điểm chốt.
 * - Cấp huy hiệu vinh danh (SlcCommunityBadge) cho Top 3 đủ điều kiện, có idempotencyKey để retry không bao giờ nhân bản huy hiệu.
 * - Khóa quy chế gắn với kỳ (isLocked = true).
 */
export async function finalizeSlcAwardPeriod(ctx: SlcUserContext, periodId: string) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const canFinalize =
    hasSlcRoleInScope(ctx, "AWARD_FINALIZER", { periodId }) || isSuperOrCommunityAdmin(ctx)
  if (!canFinalize) {
    throw new Error("Thầy/Cô không có quyền chốt kết quả Bảng vàng chính thức.")
  }

  const period = await pAny.slcAwardPeriod.findUnique({ where: { id: periodId } })
  if (!period) {
    throw new Error("Không tìm thấy kỳ Bảng vàng.")
  }

  // Idempotent return if already finalized
  if (period.status === "FINALIZED") {
    const existingSnapshots = await pAny.slcAwardSnapshot.findMany({
      where: { periodId: period.id, snapshotType: "OFFICIAL" },
    })
    const existingBadges = await pAny.slcCommunityBadge.findMany({
      where: { periodId: period.id },
    })
    return {
      period,
      alreadyFinalized: true,
      snapshotCount: existingSnapshots.length,
      badgeCount: existingBadges.length,
    }
  }

  const computed = await computeOrLoadPeriodHallOfFame(period.id)
  const lockToken = `FINAL_${period.id}_${Date.now()}`

  // Lock rule set so weights of an open/finalized period can never be mutated
  await pAny.slcAwardRuleSet
    .update({
      where: { id: period.ruleSetId },
      data: { isLocked: true },
    })
    .catch(() => null)

  const allRanked = [...computed.ideaStandings, ...computed.productStandings]
  let createdSnapshotsCount = 0
  let createdBadgesCount = 0

  for (const item of allRanked) {
    const c = item.candidate
    await pAny.slcAwardSnapshot.create({
      data: {
        periodId: period.id,
        snapshotType: "OFFICIAL",
        parentSnapshotId: null,
        targetType: c.targetType,
        targetId: c.targetId,
        targetTitle: c.targetTitle,
        targetCoverImage: c.targetCoverImage || null,
        authorId: c.authorId,
        authorName: c.authorName,
        campusId: c.campusId || null,
        campusName: c.campusName || null,
        subjectCodesJson: JSON.stringify(c.subjectCodes || []),
        gradeLevelsJson: JSON.stringify(c.gradeLevels || []),
        isEligible: c.isEligible,
        ineligibleReasonsJson: JSON.stringify(c.ineligibleReasons || []),
        validRatingCountN: c.validRatingCountN,
        avgRatingR: c.avgRatingR,
        scoreC: c.scoreC,
        expertCount: c.expertCount,
        avgExpertStars: c.avgExpertStars,
        scoreE: c.scoreE,
        verifiedAppsCountA: c.verifiedAppsCountA,
        scoreU: c.scoreU,
        totalScoreRaw: c.totalScoreRaw,
        rank: item.rank,
        isTied: item.isTied,
        calculationDetailsJson: JSON.stringify({
          ruleParams: computed.ruleParams,
          finalizedById: ctx.userId,
          finalizedByName: ctx.fullName,
          finalizedAt: new Date().toISOString(),
        }),
        createdById: ctx.userId,
      },
    })
    createdSnapshotsCount++

    // Award badges to Top 3 eligible winners (idempotent)
    if (c.isEligible && item.rank !== null && item.rank <= 3) {
      const idempotencyKey = `${period.id}:${c.targetType}:${c.targetId}:${c.authorId}`
      const badgeTitle =
        c.targetType === "IDEA"
          ? `Top ${item.rank} Ý tưởng Tiềm năng — ${period.name}`
          : `Top ${item.rank} Sản phẩm AI Hữu ích — ${period.name}`
      const badgeCode = `SLC_${period.periodType}_${c.targetType}_TOP_${item.rank}`

      const existingBadge = await pAny.slcCommunityBadge
        .findUnique({ where: { idempotencyKey } })
        .catch(() => null)

      if (!existingBadge) {
        await pAny.slcCommunityBadge.create({
          data: {
            idempotencyKey,
            userId: c.authorId,
            userName: c.authorName,
            periodId: period.id,
            periodName: period.name,
            targetType: c.targetType,
            targetId: c.targetId,
            targetTitle: c.targetTitle,
            badgeCode,
            badgeTitle,
            rank: item.rank,
          },
        })
        createdBadgesCount++

        await dispatchSlcNotification({
          idempotencyKey: `award_badge:${idempotencyKey}`,
          recipientId: c.authorId,
          actorId: ctx.userId,
          eventType: "AWARD_RESULT",
          targetType: c.targetType,
          targetId: c.targetId,
          title: `Vinh danh Bảng vàng Sáng tạo: ${badgeTitle}`,
          message: `Chúc mừng Thầy/Cô! "${c.targetTitle}" đã đạt hạng ${item.rank} chính thức trong kỳ ${period.name}.`,
          deepLink: `/teacher/skyline-connect/hall-of-fame?periodId=${period.id}`,
        })
      }
    }
  }

  const updatedPeriod = await pAny.slcAwardPeriod.update({
    where: { id: period.id },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedById: ctx.userId,
      finalizedByName: ctx.fullName,
      lockToken,
      ruleSetSnapshotJson: JSON.stringify(computed.ruleParams),
    },
  })

  await recordSlcAuditLog(ctx, "FINALIZE_AWARD_PERIOD", "AWARD_PERIOD", period.id, {
    periodName: period.name,
    createdSnapshotsCount,
    createdBadgesCount,
  })

  return {
    period: updatedPeriod,
    alreadyFinalized: false,
    snapshotCount: createdSnapshotsCount,
    badgeCount: createdBadgesCount,
  }
}

/**
 * Tạo bản hiệu chỉnh (AMENDMENT) cho kết quả Bảng vàng đã chốt (không ghi đè âm thầm bản gốc):
 * "Điều chỉnh kết quả đã chốt cần bản hiệu chỉnh mới liên kết bản gốc và audit, không ghi đè âm thầm."
 */
export async function createAmendmentSnapshot(
  ctx: SlcUserContext,
  input: {
    originalSnapshotId: string
    amendmentReason: string
    isEligible: boolean
    rank: number | null
    totalScoreRaw: number | null
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  if (!isSuperOrCommunityAdmin(ctx) && !hasSlcRoleInScope(ctx, "AWARD_FINALIZER")) {
    throw new Error("Chỉ Admin hoặc người chốt giải mới có quyền tạo bản hiệu chỉnh kết quả đã chốt.")
  }

  const cleanReason = sanitizeRichText(input.amendmentReason)
  if (!cleanReason) {
    throw new Error("Bắt buộc nhập lý do hiệu chỉnh kết quả đã chốt để lưu nhật ký kiểm toán.")
  }

  const orig = await pAny.slcAwardSnapshot.findUnique({
    where: { id: input.originalSnapshotId },
  })
  if (!orig) {
    throw new Error("Không tìm thấy bản chốt gốc cần hiệu chỉnh.")
  }

  const amendment = await pAny.slcAwardSnapshot.create({
    data: {
      periodId: orig.periodId,
      snapshotType: "AMENDMENT",
      parentSnapshotId: orig.id,
      amendmentReason: cleanReason,
      targetType: orig.targetType,
      targetId: orig.targetId,
      targetTitle: orig.targetTitle,
      targetCoverImage: orig.targetCoverImage,
      authorId: orig.authorId,
      authorName: orig.authorName,
      campusId: orig.campusId,
      campusName: orig.campusName,
      subjectCodesJson: orig.subjectCodesJson,
      gradeLevelsJson: orig.gradeLevelsJson,
      isEligible: input.isEligible,
      ineligibleReasonsJson: orig.ineligibleReasonsJson,
      validRatingCountN: orig.validRatingCountN,
      avgRatingR: orig.avgRatingR,
      scoreC: orig.scoreC,
      expertCount: orig.expertCount,
      avgExpertStars: orig.avgExpertStars,
      scoreE: orig.scoreE,
      verifiedAppsCountA: orig.verifiedAppsCountA,
      scoreU: orig.scoreU,
      totalScoreRaw: input.totalScoreRaw,
      rank: input.rank,
      isTied: orig.isTied,
      calculationDetailsJson: JSON.stringify({
        amendedFromSnapshotId: orig.id,
        amendmentReason: cleanReason,
        amendedById: ctx.userId,
        amendedByName: ctx.fullName,
        amendedAt: new Date().toISOString(),
      }),
      createdById: ctx.userId,
    },
  })

  await recordSlcAuditLog(ctx, "CREATE_SNAPSHOT_AMENDMENT", "AWARD_SNAPSHOT", amendment.id, {
    originalSnapshotId: orig.id,
    periodId: orig.periodId,
    targetId: orig.targetId,
    amendmentReason: cleanReason,
    oldRank: orig.rank,
    newRank: input.rank,
  })

  return amendment
}

/**
 * Báo cáo nội dung & Kiểm duyệt (Mục VIII):
 * Chu trình: Tiếp nhận (RECEIVED) -> Xem xét (UNDER_REVIEW) -> Kết luận (CONCLUDED) -> Thông báo (NOTIFIED) -> Đề nghị xem lại (APPEAL_REQUESTED).
 * Tạm ẩn nghiêm trọng có người thực hiện và lý do; không tự loại xếp hạng chỉ vì có người báo cáo.
 */
export async function createOrProcessContentReport(
  ctx: SlcUserContext,
  input: {
    action: "CREATE_REPORT" | "START_REVIEW" | "TEMP_HIDE_SEVERE" | "CONCLUDE" | "SUBMIT_APPEAL" | "RESOLVE_APPEAL"
    reportId?: string
    targetType?: "POST" | "COMMENT" | "IDEA" | "PRODUCT" | "PROJECT"
    targetId?: string
    postId?: string
    reasonCategory?: "PII_STUDENT" | "INAPPROPRIATE" | "COPYRIGHT" | "SPAM" | "INACCURATE" | "OTHER"
    description?: string
    conclusion?: "NO_VIOLATION" | "NEEDS_EDIT" | "HIDE_CONTENT" | "DISQUALIFY_PERIOD"
    conclusionNote?: string
    appealText?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  if (input.action === "CREATE_REPORT") {
    if (!input.targetType || !input.targetId || !sanitizeRichText(input.description)) {
      throw new Error("Vui lòng nhập đầy đủ đối tượng và nội dung phản ánh.")
    }
    const report = await pAny.slcContentReport.create({
      data: {
        reporterId: ctx.userId,
        reporterName: ctx.fullName,
        targetType: input.targetType,
        targetId: input.targetId,
        postId: input.postId || (input.targetType === "POST" ? input.targetId : null),
        reasonCategory: input.reasonCategory || "OTHER",
        description: sanitizeRichText(input.description),
        status: "RECEIVED",
      },
    })
    return report
  }

  if (!input.reportId) {
    throw new Error("Thiếu mã báo cáo cần xử lý.")
  }
  const report = await pAny.slcContentReport.findUnique({ where: { id: input.reportId } })
  if (!report) {
    throw new Error("Không tìm thấy báo cáo nội dung.")
  }

  if (input.action === "SUBMIT_APPEAL") {
    const cleanAppeal = sanitizeRichText(input.appealText)
    if (!cleanAppeal) {
      throw new Error("Vui lòng nhập nội dung đề nghị xem lại.")
    }
    const updated = await pAny.slcContentReport.update({
      where: { id: report.id },
      data: {
        status: "APPEAL_REQUESTED",
        appealText: cleanAppeal,
        appealedAt: new Date(),
      },
    })
    await recordSlcAuditLog(ctx, "SUBMIT_MODERATION_APPEAL", report.targetType, report.targetId, {
      reportId: report.id,
      appealText: cleanAppeal,
    })
    return updated
  }

  // Moderator / Admin actions
  if (!isSuperOrCommunityAdmin(ctx) && !hasSlcRoleInScope(ctx, "COORDINATOR")) {
    throw new Error("Thầy/Cô không có quyền xử lý kiểm duyệt báo cáo nội dung.")
  }

  if (input.action === "START_REVIEW") {
    const updated = await pAny.slcContentReport.update({
      where: { id: report.id },
      data: {
        status: "UNDER_REVIEW",
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
      },
    })
    await recordSlcAuditLog(ctx, "START_REPORT_REVIEW", report.targetType, report.targetId, {
      reportId: report.id,
    })
    return updated
  }

  if (input.action === "TEMP_HIDE_SEVERE") {
    const cleanReason = sanitizeRichText(input.conclusionNote || input.description)
    if (!cleanReason) {
      throw new Error("Bắt buộc ghi rõ lý do khi tạm ẩn nội dung nghiêm trọng.")
    }
    const updated = await pAny.slcContentReport.update({
      where: { id: report.id },
      data: {
        status: "UNDER_REVIEW",
        isSevereTempHidden: true,
        tempHiddenById: ctx.userId,
        tempHiddenReason: cleanReason,
        tempHiddenAt: new Date(),
      },
    })

    if (report.targetType === "POST" || report.postId) {
      const pid = report.targetType === "POST" ? report.targetId : report.postId
      await pAny.slcPost
        .update({
          where: { id: pid },
          data: { status: "HIDDEN_MODERATION" },
        })
        .catch(() => null)
    }
    if (report.targetType === "COMMENT") {
      const comm = await pAny.slcComment
        .update({
          where: { id: report.targetId },
          data: { status: "HIDDEN_MODERATION" },
        })
        .catch(() => null)
      if (comm?.postId) {
        await recalculateActiveCommentCount(comm.postId)
      }
    }

    await recordSlcAuditLog(ctx, "TEMP_HIDE_SEVERE_CONTENT", report.targetType, report.targetId, {
      reportId: report.id,
      reason: cleanReason,
    })
    return updated
  }

  if (input.action === "CONCLUDE" || input.action === "RESOLVE_APPEAL") {
    const cleanNote = sanitizeRichText(input.conclusionNote)
    if (!input.conclusion || !cleanNote) {
      throw new Error("Vui lòng chọn kết luận xử lý và nhập ghi chú kết luận.")
    }

    const nextStatus = input.action === "RESOLVE_APPEAL" ? "APPEAL_RESOLVED" : "NOTIFIED"
    const updated = await pAny.slcContentReport.update({
      where: { id: report.id },
      data: {
        status: nextStatus,
        conclusion: input.conclusion,
        conclusionNote: cleanNote,
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
        concludedAt: new Date(),
        ...(input.action === "RESOLVE_APPEAL"
          ? {
              appealResolutionNote: cleanNote,
              appealResolvedById: ctx.userId,
              appealResolvedAt: new Date(),
            }
          : {}),
      },
    })

    const shouldHide = input.conclusion === "HIDE_CONTENT"
    if (report.targetType === "POST") {
      const targetPost = await pAny.slcPost.findUnique({ where: { id: report.targetId } })
      if (targetPost) {
        await pAny.slcPost.update({
          where: { id: targetPost.id },
          data: { status: shouldHide ? "HIDDEN_MODERATION" : "PUBLISHED" },
        })
        await dispatchSlcNotification({
          idempotencyKey: `mod_notice:${report.id}:${nextStatus}`,
          recipientId: targetPost.authorId,
          actorId: ctx.userId,
          eventType: "MODERATION_NOTICE",
          targetType: "POST",
          targetId: targetPost.id,
          postId: targetPost.id,
          title: "Thông báo kết luận rà soát nội dung Sky-Line Connect",
          message: `Kết luận rà soát bài "${targetPost.title || "Chia sẻ"}": ${cleanNote}. Thầy/Cô có thể gửi đề nghị xem lại nếu cần.`,
          deepLink: `/teacher/skyline-connect/my-space?tab=moderation`,
        })
      }
    } else if (report.targetType === "COMMENT") {
      const targetComm = await pAny.slcComment.findUnique({ where: { id: report.targetId } })
      if (targetComm) {
        await pAny.slcComment.update({
          where: { id: targetComm.id },
          data: { status: shouldHide ? "HIDDEN_MODERATION" : "ACTIVE" },
        })
        await recalculateActiveCommentCount(targetComm.postId)
      }
    }

    await recordSlcAuditLog(ctx, `MODERATION_${input.action}`, report.targetType, report.targetId, {
      reportId: report.id,
      conclusion: input.conclusion,
      conclusionNote: cleanNote,
    })

    return updated
  }

  throw new Error("Hành động kiểm duyệt không hợp lệ.")
}

/**
 * Cập nhật hồ sơ cộng đồng & tùy chọn thông báo trong "Không gian của tôi".
 */
export async function updateSlcCommunityProfile(
  ctx: SlcUserContext,
  input: {
    bio?: string
    avatarUrl?: string | null
    coverImageUrl?: string | null
    specialties?: string[]
    interests?: string[]
    notifyOnMention?: boolean
    notifyOnReply?: boolean
    notifyOnInvite?: boolean
    notifyOnFollowedUpdate?: boolean
    digestMode?: "IMMEDIATE" | "DAILY_DIGEST" | "OFF"
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const data: Record<string, any> = {
    fullName: ctx.fullName,
    campusId: ctx.campusId,
    campusName: ctx.campusName,
    mainSubject: ctx.mainSubjectName,
  }

  if (input.bio !== undefined) data.bio = sanitizeRichText(input.bio)
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl
  if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl
  if (input.specialties !== undefined) data.specialtiesJson = JSON.stringify(input.specialties)
  if (input.interests !== undefined) data.interestsJson = JSON.stringify(input.interests)
  if (input.notifyOnMention !== undefined) data.notifyOnMention = Boolean(input.notifyOnMention)
  if (input.notifyOnReply !== undefined) data.notifyOnReply = Boolean(input.notifyOnReply)
  if (input.notifyOnInvite !== undefined) data.notifyOnInvite = Boolean(input.notifyOnInvite)
  if (input.notifyOnFollowedUpdate !== undefined)
    data.notifyOnFollowedUpdate = Boolean(input.notifyOnFollowedUpdate)
  if (input.digestMode !== undefined) data.digestMode = input.digestMode

  return pAny.slcCommunityProfile.upsert({
    where: { userId: ctx.userId },
    update: data,
    create: {
      userId: ctx.userId,
      ...data,
    },
  })
}

/**
 * Quản lý Nhóm chuyên môn (Tạo nhóm, xin vào nhóm, duyệt thành viên, ghim bài trong nhóm).
 */
export async function handleSlcGroupAction(
  ctx: SlcUserContext,
  input: {
    action: "CREATE_GROUP" | "JOIN_GROUP" | "APPROVE_MEMBER" | "LEAVE_GROUP"
    groupId?: string
    name?: string
    description?: string
    groupType?: string
    visibility?: "PUBLIC_INTERNAL" | "PRIVATE"
    campusId?: string | null
    subjectCode?: string | null
    gradeBand?: string | null
    targetUserId?: string
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  if (input.action === "CREATE_GROUP") {
    const cleanName = sanitizeRichText(input.name)
    if (!cleanName) throw new Error("Vui lòng nhập tên nhóm chuyên môn.")
    const slug = `${cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`

    const group = await pAny.slcGroup.create({
      data: {
        name: cleanName,
        slug,
        description: sanitizeRichText(input.description),
        groupType: input.groupType || "SUBJECT",
        visibility: input.visibility || "PUBLIC_INTERNAL",
        campusId: input.campusId || ctx.campusId,
        subjectCode: input.subjectCode || ctx.mainSubjectCode,
        gradeBand: input.gradeBand || null,
        ownerId: ctx.userId,
        ownerName: ctx.fullName,
        memberCount: 1,
      },
    })

    await pAny.slcGroupMember.create({
      data: {
        groupId: group.id,
        userId: ctx.userId,
        userName: ctx.fullName,
        userRole: ctx.systemRole,
        campusName: ctx.campusName,
        role: "OWNER",
        status: "APPROVED",
        joinedAt: new Date(),
      },
    })

    return group
  }

  if (!input.groupId) throw new Error("Thiếu mã nhóm.")
  const group = await pAny.slcGroup.findUnique({ where: { id: input.groupId } })
  if (!group) throw new Error("Không tìm thấy nhóm.")

  if (input.action === "JOIN_GROUP") {
    const status = group.visibility === "PUBLIC_INTERNAL" ? "APPROVED" : "PENDING"
    const member = await pAny.slcGroupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: ctx.userId } },
      update: {
        status,
        joinedAt: status === "APPROVED" ? new Date() : null,
      },
      create: {
        groupId: group.id,
        userId: ctx.userId,
        userName: ctx.fullName,
        userRole: ctx.systemRole,
        campusName: ctx.campusName,
        role: "MEMBER",
        status,
        joinedAt: status === "APPROVED" ? new Date() : null,
      },
    })

    const count = await pAny.slcGroupMember.count({
      where: { groupId: group.id, status: "APPROVED" },
    })
    await pAny.slcGroup.update({
      where: { id: group.id },
      data: { memberCount: count },
    })

    return member
  }

  if (input.action === "APPROVE_MEMBER") {
    if (
      group.ownerId !== ctx.userId &&
      !ctx.moderatedGroupIds.includes(group.id) &&
      !isSuperOrCommunityAdmin(ctx)
    ) {
      throw new Error("Chỉ quản trị viên nhóm mới có quyền duyệt thành viên.")
    }
    if (!input.targetUserId) throw new Error("Thiếu mã thành viên cần duyệt.")
    const updated = await pAny.slcGroupMember.update({
      where: { groupId_userId: { groupId: group.id, userId: input.targetUserId } },
      data: { status: "APPROVED", joinedAt: new Date() },
    })
    const count = await pAny.slcGroupMember.count({
      where: { groupId: group.id, status: "APPROVED" },
    })
    await pAny.slcGroup.update({
      where: { id: group.id },
      data: { memberCount: count },
    })
    return updated
  }

  if (input.action === "LEAVE_GROUP") {
    await pAny.slcGroupMember
      .delete({
        where: { groupId_userId: { groupId: group.id, userId: ctx.userId } },
      })
      .catch(() => null)
    const count = await pAny.slcGroupMember.count({
      where: { groupId: group.id, status: "APPROVED" },
    })
    await pAny.slcGroup.update({
      where: { id: group.id },
      data: { memberCount: Math.max(1, count) },
    })
    return { left: true }
  }

  throw new Error("Thao tác nhóm không hợp lệ.")
}

/**
 * Ghi nhận cập nhật tiến độ của Dự án (SlcProjectProgress).
 */
export async function addSlcProjectProgress(
  ctx: SlcUserContext,
  input: {
    projectId: string
    title: string
    content: string
    milestoneStatus?: string
    linkedProductId?: string | null
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any
  const project = await pAny.slcProject.findUnique({ where: { id: input.projectId } })
  if (!project) throw new Error("Không tìm thấy dự án.")

  const member = await pAny.slcProjectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: ctx.userId } },
  })
  if (
    project.ownerId !== ctx.userId &&
    member?.status !== "APPROVED" &&
    !isSuperOrCommunityAdmin(ctx)
  ) {
    throw new Error("Chỉ thành viên dự án mới có thể cập nhật tiến độ.")
  }

  const progress = await pAny.slcProjectProgress.create({
    data: {
      projectId: project.id,
      authorId: ctx.userId,
      authorName: ctx.fullName,
      title: sanitizeRichText(input.title),
      content: sanitizeRichText(input.content),
      milestoneStatus: input.milestoneStatus || "IN_PROGRESS",
      linkedProductId: input.linkedProductId || null,
    },
  })

  if (input.milestoneStatus === "HAS_PRODUCT" || input.linkedProductId) {
    await pAny.slcProject.update({
      where: { id: project.id },
      data: { status: "HAS_PRODUCT" },
    })
  }

  return progress
}

/**
 * Xử lý các tác vụ Quản trị Sky-Line Connect (/admin/skyline-connect):
 * - Bật/tắt Feature Flag
 * - Ghim bài / Chọn "Dấu ấn sáng tạo tháng" (editorialFeaturedRank: 1, 2, 3) — tách biệt với danh hiệu giải thưởng!
 * - Quản lý Nhãn (SlcTag)
 * - Phân quyền chuyên môn (SlcUserRoleAssignment)
 * - Tạo Kỳ Bảng vàng (SlcAwardPeriod) và Quy chế version hóa (SlcAwardRuleSet)
 * - Chặn sửa trọng số quy chế khi kỳ đang mở hoặc đã chốt!
 */
export async function handleSlcAdminAction(
  ctx: SlcUserContext,
  input: {
    subAction:
      | "UPDATE_FEATURE_CONFIG"
      | "SET_EDITORIAL_SPOTLIGHT"
      | "UPSERT_TAG"
      | "ASSIGN_ROLE"
      | "REVOKE_ROLE"
      | "CREATE_RULE_SET"
      | "UPDATE_RULE_SET"
      | "CREATE_AWARD_PERIOD"
      | "UPDATE_PERIOD_STATUS"
      | "CONFIRM_REENTRY_NOMINATION"
    payload: Record<string, any>
  }
) {
  await ensureSlcSchema()
  const pAny = prisma as any

  const isAdmin = isSuperOrCommunityAdmin(ctx)
  const isCoordinator = hasSlcRoleInScope(ctx, "COORDINATOR")
  const isFinalizer = hasSlcRoleInScope(ctx, "AWARD_FINALIZER")

  if (!isAdmin && !isCoordinator && !isFinalizer) {
    throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền thực hiện thao tác quản trị này.")
  }

  const { subAction, payload } = input

  if (subAction === "UPDATE_FEATURE_CONFIG") {
    if (!isAdmin) throw new Error("Chỉ Quản trị viên hệ thống mới có thể thay đổi cấu hình Feature Flag.")
    const updated = await pAny.slcFeatureConfig.upsert({
      where: { key: "DEFAULT" },
      update: {
        isEnabled: payload.isEnabled ?? true,
        pilotMode: payload.pilotMode ?? false,
        allowedCampusIdsJson: JSON.stringify(payload.allowedCampusIds || ["ALL"]),
        allowedUserIdsJson: JSON.stringify(payload.allowedUserIds || []),
        allowedRolesJson: JSON.stringify(payload.allowedRoles || ["ALL"]),
        updatedBy: ctx.userId,
      },
      create: {
        key: "DEFAULT",
        isEnabled: payload.isEnabled ?? true,
        pilotMode: payload.pilotMode ?? false,
        allowedCampusIdsJson: JSON.stringify(payload.allowedCampusIds || ["ALL"]),
        allowedUserIdsJson: JSON.stringify(payload.allowedUserIds || []),
        allowedRolesJson: JSON.stringify(payload.allowedRoles || ["ALL"]),
        updatedBy: ctx.userId,
      },
    })
    await recordSlcAuditLog(ctx, "UPDATE_FEATURE_CONFIG", "FEATURE_CONFIG", "DEFAULT", payload)
    return updated
  }

  if (subAction === "SET_EDITORIAL_SPOTLIGHT") {
    // Phân biệt nội dung biên tập chọn ("Dấu ấn sáng tạo tháng") với sản phẩm đạt giải; không tự gắn danh hiệu cho bài được ghim!
    const postId = String(payload.postId || "")
    const rank = payload.editorialFeaturedRank ? Number(payload.editorialFeaturedRank) : null
    const isPinned = Boolean(payload.isPinned)
    const label = payload.editorialLabel ? sanitizeRichText(payload.editorialLabel) : null

    if (rank && [1, 2, 3].includes(rank)) {
      await pAny.slcPost.updateMany({
        where: { editorialFeaturedRank: rank },
        data: { editorialFeaturedRank: null },
      })
    }

    const updated = await pAny.slcPost.update({
      where: { id: postId },
      data: {
        isPinned,
        editorialFeaturedRank: rank,
        editorialLabel: label,
      },
    })
    await recordSlcAuditLog(ctx, "SET_EDITORIAL_SPOTLIGHT", "POST", postId, {
      isPinned,
      editorialFeaturedRank: rank,
      editorialLabel: label,
    })
    return updated
  }

  if (subAction === "UPSERT_TAG") {
    const slug = String(payload.slug || payload.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const tag = await pAny.slcTag.upsert({
      where: { slug },
      update: {
        name: sanitizeRichText(payload.name),
        category: payload.category || "TOPIC",
        isActive: payload.isActive ?? true,
      },
      create: {
        slug,
        name: sanitizeRichText(payload.name),
        category: payload.category || "TOPIC",
        isActive: true,
      },
    })
    await recordSlcAuditLog(ctx, "UPSERT_TAG", "TAG", tag.id, payload)
    return tag
  }

  if (subAction === "ASSIGN_ROLE") {
    if (!isAdmin) throw new Error("Chỉ Quản trị viên mới có quyền cấp vai trò chuyên môn.")
    const created = await pAny.slcUserRoleAssignment.upsert({
      where: {
        userId_role_scopeType_scopeId: {
          userId: payload.userId,
          role: payload.role,
          scopeType: payload.scopeType || "SYSTEM",
          scopeId: payload.scopeId || "ALL",
        },
      },
      update: {
        isActive: true,
        assignedBy: ctx.userId,
      },
      create: {
        userId: payload.userId,
        role: payload.role,
        scopeType: payload.scopeType || "SYSTEM",
        scopeId: payload.scopeId || "ALL",
        isActive: true,
        assignedBy: ctx.userId,
      },
    })
    await recordSlcAuditLog(ctx, "ASSIGN_SLC_ROLE", "USER_ROLE", created.id, payload)
    return created
  }

  if (subAction === "REVOKE_ROLE") {
    if (!isAdmin) throw new Error("Chỉ Quản trị viên mới có quyền thu hồi vai trò chuyên môn.")
    const updated = await pAny.slcUserRoleAssignment.update({
      where: { id: payload.roleAssignmentId },
      data: { isActive: false },
    })
    await recordSlcAuditLog(ctx, "REVOKE_SLC_ROLE", "USER_ROLE", updated.id, payload)
    return updated
  }

  if (subAction === "CREATE_RULE_SET") {
    if (!isAdmin && !isFinalizer) throw new Error("Không có quyền tạo bộ quy chế xét giải.")
    const latest = await pAny.slcAwardRuleSet.findFirst({ orderBy: { version: "desc" } })
    const nextVersion = (latest?.version || 0) + 1
    const base =
      payload.periodType === "YEARLY" ? DEFAULT_YEARLY_RULE_PARAMS : DEFAULT_MONTHLY_RULE_PARAMS

    const created = await pAny.slcAwardRuleSet.create({
      data: {
        version: nextVersion,
        name: sanitizeRichText(payload.name || `Quy chế Bảng vàng v${nextVersion}`),
        periodType: payload.periodType || "MONTHLY",
        minRatingsIdea: Number(payload.minRatingsIdea ?? base.minRatingsIdea),
        minRatingsProduct: Number(payload.minRatingsProduct ?? base.minRatingsProduct),
        minVerifiedAppsProduct: Number(
          payload.minVerifiedAppsProduct ?? base.minVerifiedAppsProduct
        ),
        minExpertReviewers: Number(payload.minExpertReviewers ?? base.minExpertReviewers),
        bayesianM: Number(payload.bayesianM ?? base.bayesianM),
        bayesianPrior: Number(payload.bayesianPrior ?? base.bayesianPrior),
        capVerifiedApps: Number(payload.capVerifiedApps ?? base.capVerifiedApps),
        ideaWeightC: Number(payload.ideaWeightC ?? base.ideaWeightC),
        ideaWeightE: Number(payload.ideaWeightE ?? base.ideaWeightE),
        productWeightC: Number(payload.productWeightC ?? base.productWeightC),
        productWeightE: Number(payload.productWeightE ?? base.productWeightE),
        productWeightU: Number(payload.productWeightU ?? base.productWeightU),
        isLocked: false,
        createdById: ctx.userId,
      },
    })
    await recordSlcAuditLog(ctx, "CREATE_AWARD_RULE_SET", "AWARD_RULE_SET", created.id, payload)
    return created
  }

  if (subAction === "UPDATE_RULE_SET") {
    const existingRule = await pAny.slcAwardRuleSet.findUnique({
      where: { id: payload.ruleSetId },
      include: { periods: true },
    })
    if (!existingRule) throw new Error("Không tìm thấy bộ quy chế.")

    const hasActiveOrFinalizedPeriod =
      existingRule.isLocked ||
      existingRule.periods?.some((p: any) =>
        ["OPEN", "DATA_LOCKED", "REVIEWING", "FINALIZED"].includes(p.status)
      )
    if (hasActiveOrFinalizedPeriod) {
      throw new Error(
        "RULE_SET_LOCKED: Không được sửa trọng số hoặc tham số của bộ quy chế đang gắn với kỳ đang mở hoặc đã chốt. Vui lòng tạo phiên bản quy chế mới."
      )
    }

    const updated = await pAny.slcAwardRuleSet.update({
      where: { id: existingRule.id },
      data: {
        name: payload.name ? sanitizeRichText(payload.name) : existingRule.name,
        ideaWeightC: payload.ideaWeightC ?? existingRule.ideaWeightC,
        ideaWeightE: payload.ideaWeightE ?? existingRule.ideaWeightE,
        productWeightC: payload.productWeightC ?? existingRule.productWeightC,
        productWeightE: payload.productWeightE ?? existingRule.productWeightE,
        productWeightU: payload.productWeightU ?? existingRule.productWeightU,
      },
    })
    await recordSlcAuditLog(ctx, "UPDATE_AWARD_RULE_SET", "AWARD_RULE_SET", updated.id, payload)
    return updated
  }

  if (subAction === "CREATE_AWARD_PERIOD") {
    const periodType = payload.periodType || "MONTHLY"
    const yearNumber = Number(payload.yearNumber || new Date().getFullYear())
    const monthNumber = periodType === "MONTHLY" ? Number(payload.monthNumber || new Date().getMonth() + 1) : null
    const audienceScope = payload.audienceScope || "SYSTEM"
    const audienceScopeId = payload.audienceScopeId || "ALL"

    let startDateUtc: Date
    let endDateUtc: Date
    if (payload.startDateUtc && payload.endDateUtc) {
      startDateUtc = new Date(payload.startDateUtc)
      endDateUtc = new Date(payload.endDateUtc)
    } else if (periodType === "MONTHLY" && monthNumber) {
      const bounds = getVietnamMonthBoundsUtc(yearNumber, monthNumber)
      startDateUtc = bounds.startUtc
      endDateUtc = bounds.endUtc
    } else {
      startDateUtc = new Date(Date.UTC(yearNumber, 7, 1, -7, 0, 0, 0))
      endDateUtc = new Date(Date.UTC(yearNumber + 1, 5, 1, -7, 0, 0, 0))
    }

    // Check overlapping periods of same type & audienceScope
    const existingPeriods = await pAny.slcAwardPeriod.findMany({
      where: {
        periodType,
        audienceScope,
        audienceScopeId,
      },
    })
    for (const ep of existingPeriods) {
      if (
        doPeriodRangesOverlap(
          { startUtc: startDateUtc, endUtc: endDateUtc },
          { startUtc: new Date(ep.startDateUtc), endUtc: new Date(ep.endDateUtc) }
        )
      ) {
        throw new Error(
          `Kỳ xét giải bị chồng lấn thời gian với kỳ "${ep.name}" cùng phạm vi.`
        )
      }
    }

    const reviewDeadlineUtc = calculateReviewDeadlineUtc(endDateUtc, { workingDaysCount: 3 })

    // Ensure ruleSet exists and lock it once attached to an OPEN period
    let ruleSetId = payload.ruleSetId
    let ruleSetSnapshot =
      periodType === "YEARLY" ? DEFAULT_YEARLY_RULE_PARAMS : DEFAULT_MONTHLY_RULE_PARAMS

    if (!ruleSetId) {
      const createdRule = await pAny.slcAwardRuleSet.create({
        data: {
          version: Math.floor(Date.now() / 1000),
          name: `Quy chế ${periodType === "YEARLY" ? "Năm học" : "Tháng"} mặc định`,
          periodType,
          ...ruleSetSnapshot,
          isLocked: true,
          createdById: ctx.userId,
        },
      })
      ruleSetId = createdRule.id
    } else {
      await pAny.slcAwardRuleSet
        .update({
          where: { id: ruleSetId },
          data: { isLocked: true },
        })
        .catch(() => null)
    }

    const code =
      payload.code ||
      (periodType === "MONTHLY"
        ? `SLC-M-${yearNumber}-${String(monthNumber).padStart(2, "0")}-${audienceScope}`
        : `SLC-Y-${yearNumber}-${audienceScope}`)

    const name =
      payload.name ||
      (periodType === "MONTHLY"
        ? `Tháng ${monthNumber} • Năm học ${payload.academicYearName || "2026–2027"}`
        : `Năm học ${payload.academicYearName || "2026–2027"}`)

    const period = await pAny.slcAwardPeriod.create({
      data: {
        code,
        name: sanitizeRichText(name),
        periodType,
        monthNumber,
        yearNumber,
        academicYearId: payload.academicYearId || null,
        academicYearName: payload.academicYearName || "2026–2027",
        audienceScope,
        audienceScopeId,
        startDateUtc,
        endDateUtc,
        reviewDeadlineUtc,
        status: payload.status || "OPEN",
        ruleSetId,
        ruleSetSnapshotJson: JSON.stringify(ruleSetSnapshot),
      },
    })

    await recordSlcAuditLog(ctx, "CREATE_AWARD_PERIOD", "AWARD_PERIOD", period.id, payload)
    return period
  }

  if (subAction === "UPDATE_PERIOD_STATUS") {
    const updated = await pAny.slcAwardPeriod.update({
      where: { id: payload.periodId },
      data: { status: payload.status },
    })
    await recordSlcAuditLog(ctx, "UPDATE_PERIOD_STATUS", "AWARD_PERIOD", updated.id, payload)
    return updated
  }

  if (subAction === "CONFIRM_REENTRY_NOMINATION") {
    const updated = await pAny.slcAwardNomination.update({
      where: { id: payload.nominationId },
      data: {
        coordinatorConfirmed: Boolean(payload.confirmed),
        coordinatorNote: sanitizeRichText(payload.note),
        confirmedById: ctx.userId,
        confirmedAt: new Date(),
      },
    })
    await recordSlcAuditLog(ctx, "CONFIRM_REENTRY_NOMINATION", "AWARD_NOMINATION", updated.id, payload)
    return updated
  }

  throw new Error("Tác vụ quản trị không hợp lệ.")
}

