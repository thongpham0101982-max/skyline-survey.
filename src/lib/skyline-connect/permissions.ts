export interface SlcRoleAssignmentRecord {
  userId: string
  role: string // COORDINATOR | EVIDENCE_VERIFIER | EXPERT_REVIEWER | AWARD_FINALIZER | COMMUNITY_ADMIN | SKILL_REVIEWER
  scopeType: string // SYSTEM | CAMPUS | DEPARTMENT | SUBJECT | GROUP | PERIOD
  scopeId: string
  isActive: boolean
}

export interface SlcUserContext {
  userId: string
  fullName: string
  email?: string
  systemRole: string // ADMIN | TEACHER | ...
  teacherId?: string | null
  campusId?: string | null
  campusName?: string | null
  campusIds?: string[]
  departmentId?: string | null
  departmentName?: string | null
  teacherPosition?: string | null
  isDepartmentHead?: boolean
  isKtdbclOfficer?: boolean
  mainSubjectCode?: string | null
  mainSubjectName?: string | null
  approvedGroupIds: string[]
  ownedGroupIds: string[]
  moderatedGroupIds: string[]
  roleAssignments: SlcRoleAssignmentRecord[]
}

export function isSuperOrCommunityAdmin(ctx: SlcUserContext): boolean {
  const upper = (ctx.systemRole || "").toUpperCase().trim()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "SUPERADMIN") {
    return true
  }
  return (ctx.roleAssignments || []).some(
    (r) => r.isActive && r.role === "COMMUNITY_ADMIN" && (r.scopeType === "SYSTEM" || r.scopeId === "ALL")
  )
}

export function hasSlcRoleInScope(
  ctx: SlcUserContext,
  role:
    | "COORDINATOR"
    | "EVIDENCE_VERIFIER"
    | "EXPERT_REVIEWER"
    | "AWARD_FINALIZER"
    | "COMMUNITY_ADMIN"
    | "SKILL_REVIEWER",
  scopeCheck?: {
    campusId?: string | null
    departmentId?: string | null
    subjectCode?: string | null
    groupId?: string | null
    periodId?: string | null
  }
): boolean {
  if (isSuperOrCommunityAdmin(ctx)) return true

  return (ctx.roleAssignments || []).some((ra) => {
    if (!ra.isActive || ra.role !== role) return false
    if (ra.scopeType === "SYSTEM" || ra.scopeId === "ALL" || ra.scopeId === "*") return true
    if (ra.scopeType === "CAMPUS" && scopeCheck?.campusId && ra.scopeId === scopeCheck.campusId) return true
    if (ra.scopeType === "DEPARTMENT" && scopeCheck?.departmentId && ra.scopeId === scopeCheck.departmentId)
      return true
    if (ra.scopeType === "SUBJECT" && scopeCheck?.subjectCode && ra.scopeId === scopeCheck.subjectCode) return true
    if (ra.scopeType === "GROUP" && scopeCheck?.groupId && ra.scopeId === scopeCheck.groupId) return true
    if (ra.scopeType === "PERIOD" && scopeCheck?.periodId && ra.scopeId === scopeCheck.periodId) return true
    return false
  })
}

export function canUserAccessFeatureFlag(
  ctx: SlcUserContext,
  config: {
    isEnabled: boolean
    pilotMode: boolean
    allowedCampusIds?: string[]
    allowedUserIds?: string[]
    allowedRoles?: string[]
  }
): boolean {
  if (isSuperOrCommunityAdmin(ctx)) return true
  if (!config.isEnabled) return false
  if (!config.pilotMode) return true

  // Pilot mode: check if user, campus, or role is explicitly granted
  if (config.allowedUserIds?.includes(ctx.userId)) return true
  if (ctx.roleAssignments.some((r) => r.isActive)) return true
  if (
    config.allowedCampusIds &&
    (config.allowedCampusIds.includes("ALL") ||
      (ctx.campusId && config.allowedCampusIds.includes(ctx.campusId)) ||
      (ctx.campusIds && ctx.campusIds.some((cid) => config.allowedCampusIds?.includes(cid))))
  ) {
    return true
  }
  if (
    config.allowedRoles &&
    (config.allowedRoles.includes("ALL") || config.allowedRoles.includes(ctx.systemRole))
  ) {
    return true
  }

  return false
}

export interface PostAccessTarget {
  id: string
  authorId: string
  status: string // DRAFT | PUBLISHED | ARCHIVED | HIDDEN_MODERATION | DELETED
  visibility: string // SYSTEM | CAMPUS | DEPARTMENT | GROUP
  campusId?: string | null
  departmentId?: string | null
  groupId?: string | null
  groupVisibility?: string | null // PUBLIC | CAMPUS | PRIVATE
}

/**
 * Kiểm tra quyền xem một bài đăng (hoặc đối tượng Ý tưởng / Sản phẩm / Dự án gắn với bài):
 * - Bài DRAFT hoặc ARCHIVED chỉ tác giả mới xem được.
 * - Bài DELETED chỉ tác giả hoặc Admin/Điều phối viên mới xem được trong khu vực khôi phục.
 * - Bài HIDDEN_MODERATION chỉ tác giả (để xem thông báo/khiếu nại) và Admin/Điều phối viên có quyền kiểm duyệt mới xem được.
 * - Phạm vi GROUP: nếu nhóm là PRIVATE (hoặc visibility bài là GROUP), người xem phải là thành viên đã được duyệt của nhóm (hoặc chủ nhóm / admin).
 * - Phạm vi DEPARTMENT (Tổ): người xem phải thuộc cùng tổ chuyên môn (hoặc tác giả / TTCM-QLCM / điều phối viên / admin).
 * - Phạm vi CAMPUS: người xem phải thuộc cơ sở đó (hoặc tác giả / điều phối viên cơ sở / admin).
 * - Nếu bài là bài chia sẻ lại (sourcePost được truyền vào), bắt buộc người dùng phải có quyền xem CẢ bài chia sẻ lẫn bài gốc!
 */
export function canViewPost(
  ctx: SlcUserContext | null,
  post: PostAccessTarget,
  sourcePost?: PostAccessTarget | null
): boolean {
  if (!ctx || !ctx.userId) return false

  // If this is a shared post, check source post access first:
  // "Khi bài gốc mất quyền hoặc tạm ẩn, bài chia sẻ không được lộ nội dung hoặc tệp qua preview, tìm kiếm hoặc thông báo."
  if (sourcePost) {
    if (sourcePost.status !== "PUBLISHED") {
      return false
    }
    if (!canViewSinglePost(ctx, sourcePost)) {
      return false
    }
  }

  return canViewSinglePost(ctx, post)
}

function canViewSinglePost(ctx: SlcUserContext, post: PostAccessTarget): boolean {
  const isAuthor = post.authorId === ctx.userId
  const isAdmin = isSuperOrCommunityAdmin(ctx)
  const isCoordinator = hasSlcRoleInScope(ctx, "COORDINATOR", {
    campusId: post.campusId,
    departmentId: post.departmentId,
    groupId: post.groupId,
  })

  if (post.status === "DRAFT" || post.status === "ARCHIVED") {
    return isAuthor
  }

  if (post.status === "DELETED") {
    return isAuthor || isAdmin || isCoordinator
  }

  if (post.status === "HIDDEN_MODERATION") {
    return isAuthor || isAdmin || isCoordinator
  }

  if (post.status !== "PUBLISHED") {
    return isAuthor || isAdmin
  }

  if (isAuthor || isAdmin) return true

  if (post.visibility === "GROUP" || post.groupId) {
    if (!post.groupId) return false
    const isMember =
      ctx.approvedGroupIds.includes(post.groupId) ||
      ctx.ownedGroupIds.includes(post.groupId) ||
      ctx.moderatedGroupIds.includes(post.groupId)
    // Only approved members of the group can view GROUP-scoped posts
    if (post.visibility === "GROUP" || post.groupVisibility === "PRIVATE") {
      return isMember
    }
    if (post.groupVisibility === "CAMPUS" && post.campusId) {
      return isMember || isUserInCampus(ctx, post.campusId)
    }
    return true
  }

  if (post.visibility === "DEPARTMENT") {
    if (!post.departmentId) {
      return post.campusId ? isUserInCampus(ctx, post.campusId) || isCoordinator : true
    }
    return (
      ctx.departmentId === post.departmentId ||
      isCoordinator ||
      Boolean(ctx.isKtdbclOfficer) ||
      Boolean(ctx.isDepartmentHead && (!post.campusId || isUserInCampus(ctx, post.campusId)))
    )
  }

  if (post.visibility === "CAMPUS") {
    if (!post.campusId) return true
    return isUserInCampus(ctx, post.campusId) || isCoordinator || Boolean(ctx.isKtdbclOfficer)
  }

  // SYSTEM visibility
  return true
}

export function isUserInCampus(ctx: SlcUserContext, campusId: string): boolean {
  if (ctx.campusId === campusId) return true
  if (ctx.campusIds && ctx.campusIds.includes(campusId)) return true
  return false
}

/**
 * Kiểm tra đối tượng có đủ quyền công bố để vào Bảng vàng chung toàn hệ thống hay không:
 * "Tệp và bài trong nhóm riêng không được lộ qua bảng vàng toàn hệ thống: chỉ xếp bảng chung khi nội dung
 * đã được tác giả công bố cho toàn bộ đối tượng xem bảng; nếu không đủ quyền thì giữ riêng và không cho vào kết quả chung."
 */
export function isEligibleForAudienceHallOfFame(
  target: {
    status: string
    visibility: string
    campusId?: string | null
    groupId?: string | null
  },
  periodAudience: {
    audienceScope: string // SYSTEM | CAMPUS | GROUP
    audienceScopeId: string // ALL | campusId | groupId
  }
): boolean {
  if (target.status !== "PUBLISHED") return false

  if (periodAudience.audienceScope === "SYSTEM") {
    // Must be published to SYSTEM without private group restriction
    return target.visibility === "SYSTEM" && !target.groupId
  }

  if (periodAudience.audienceScope === "CAMPUS") {
    return (
      (target.visibility === "SYSTEM" || target.visibility === "CAMPUS") &&
      !target.groupId &&
      target.campusId === periodAudience.audienceScopeId
    )
  }

  if (periodAudience.audienceScope === "GROUP") {
    return target.groupId === periodAudience.audienceScopeId
  }

  return false
}

/**
 * Kiểm tra quyền đánh giá sao (Ý tưởng / Sản phẩm):
 * Chặn ở backend đánh giá của tác giả và thành viên cùng tạo ra đối tượng.
 */
export function canUserRateTarget(
  ctx: SlcUserContext,
  target: {
    authorId: string
    collaboratorIds?: string[]
  }
): { allowed: boolean; reason?: string } {
  if (!ctx.userId) {
    return { allowed: false, reason: "Vui lòng đăng nhập để đánh giá." }
  }
  if (target.authorId === ctx.userId) {
    return { allowed: false, reason: "Tác giả không thể tự đánh giá ý tưởng hoặc sản phẩm của chính mình." }
  }
  if (target.collaboratorIds && target.collaboratorIds.includes(ctx.userId)) {
    return { allowed: false, reason: "Đồng tác giả / cộng sự cùng phát triển không thể chấm sao cho đối tượng này." }
  }
  return { allowed: true }
}

/**
 * Kiểm tra quyền sửa / xóa bình luận:
 * - Tác giả bình luận được sửa / xóa nội dung của chính mình.
 * - Tác giả bài đăng được trả lời, ghim tối đa 3 bình luận, đánh dấu trạng thái góp ý,
 *   nhưng KHÔNG được sửa hoặc xóa bình luận hợp lệ của người khác.
 * - Admin / Điều phối viên chỉ ẩn theo quy trình kiểm duyệt có báo cáo và nhật ký.
 */
export function canEditOrDeleteComment(
  ctx: SlcUserContext,
  comment: { authorId: string },
  action: "EDIT" | "DELETE"
): { allowed: boolean; reason?: string } {
  if (comment.authorId === ctx.userId) {
    return { allowed: true }
  }
  if (action === "EDIT") {
    return { allowed: false, reason: "Chỉ tác giả của bình luận mới có quyền chỉnh sửa nội dung bình luận." }
  }
  return {
    allowed: false,
    reason: "Tác giả bài đăng không được xóa bình luận hợp lệ của đồng nghiệp. Nếu nội dung vi phạm, vui lòng sử dụng chức năng Báo cáo.",
  }
}

export function canPinOrMarkFeedbackOnPost(
  ctx: SlcUserContext,
  post: { authorId: string; campusId?: string | null; groupId?: string | null }
): boolean {
  if (post.authorId === ctx.userId) return true
  if (isSuperOrCommunityAdmin(ctx)) return true
  return hasSlcRoleInScope(ctx, "COORDINATOR", { campusId: post.campusId, groupId: post.groupId })
}

/**
 * Lọc danh sách đồng nghiệp có thể được @nhắc tên trong bài đăng hoặc mảnh đóng góp:
 * Chỉ cho phép nhắc tên những người có quyền xem bài gốc (kế thừa visibility SYSTEM / CAMPUS / GROUP).
 */
export function filterAllowedMentionUsersForPost<
  T extends {
    userId: string
    systemRole?: string
    campusId?: string | null
    campusIds?: string[]
    approvedGroupIds?: string[]
    ownedGroupIds?: string[]
    moderatedGroupIds?: string[]
    roleAssignments?: SlcRoleAssignmentRecord[]
  }
>(
  candidates: T[],
  post: PostAccessTarget,
  sourcePost?: PostAccessTarget | null
): T[] {
  return candidates.filter((candidate) => {
    const candidateCtx: SlcUserContext = {
      userId: candidate.userId,
      fullName: "",
      systemRole: candidate.systemRole || "TEACHER",
      campusId: candidate.campusId ?? null,
      campusIds: candidate.campusIds ?? (candidate.campusId ? [candidate.campusId] : []),
      approvedGroupIds: candidate.approvedGroupIds ?? [],
      ownedGroupIds: candidate.ownedGroupIds ?? [],
      moderatedGroupIds: candidate.moderatedGroupIds ?? [],
      roleAssignments: candidate.roleAssignments ?? [],
    }
    return canViewPost(candidateCtx, post, sourcePost)
  })
}

/**
 * Kiểm tra quyền truy cập tệp đính kèm hoặc đường dẫn sâu (deep link) kế thừa quyền bài gốc.
 */
export function canAccessPostAttachmentOrDeepLink(
  ctx: SlcUserContext | null,
  post: PostAccessTarget | null,
  sourcePost?: PostAccessTarget | null
): boolean {
  if (!ctx || !post) return false
  return canViewPost(ctx, post, sourcePost)
}

export interface SkillAccessTarget {
  id: string
  authorId: string
  collaboratorIds?: string[]
  status: string // DRAFT | PENDING_REVIEW | NEEDS_REVISION | APPROVED | PUBLISHED | ARCHIVED | DELETED
  publishedVersionId?: string | null
  visibility: string // SYSTEM | CAMPUS | DEPARTMENT | GROUP
  campusId?: string | null
  departmentId?: string | null
  subjectCode?: string | null
  groupId?: string | null
  assignedReviewerId?: string | null
}

/**
 * Kiểm tra người dùng có quyền quản lý / duyệt nội dung cộng đồng và Skill môn học hay không
 * (TTCM/QLCM, KT&ĐBCL, Điều phối viên, hoặc Quản trị viên).
 */
export function canManageCommunityAndSkills(ctx: SlcUserContext | null): boolean {
  if (!ctx || !ctx.userId) return false
  if (isSuperOrCommunityAdmin(ctx)) return true
  if (ctx.isDepartmentHead || ctx.isKtdbclOfficer) return true
  return (
    hasSlcRoleInScope(ctx, "COORDINATOR") ||
    hasSlcRoleInScope(ctx, "SKILL_REVIEWER") ||
    hasSlcRoleInScope(ctx, "EXPERT_REVIEWER") ||
    hasSlcRoleInScope(ctx, "EVIDENCE_VERIFIER")
  )
}

/**
 * Kiểm tra quyền duyệt một Skill môn học cụ thể:
 * - Tác giả và đồng tác giả KHÔNG được tự duyệt skill của chính mình (trừ Super Admin trong môi trường quản trị hệ thống khi cấu hình).
 * - Người duyệt được phân công trực tiếp (assignedReviewerId) có quyền duyệt.
 * - TTCM/QLCM duyệt theo phạm vi tổ/môn/cơ sở được giao.
 * - KT&ĐBCL quản lý tiêu chí và theo dõi/duyệt chất lượng theo quyền.
 * - Quản trị viên / Điều phối viên duyệt theo phạm vi.
 */
export function canReviewSkill(
  ctx: SlcUserContext | null,
  skill: SkillAccessTarget
): { allowed: boolean; reason?: string } {
  if (!ctx || !ctx.userId) {
    return { allowed: false, reason: "Vui lòng đăng nhập để thực hiện duyệt skill." }
  }

  const isAuthorOrCollab =
    skill.authorId === ctx.userId || Boolean(skill.collaboratorIds?.includes(ctx.userId))

  if (isAuthorOrCollab && !isSuperOrCommunityAdmin(ctx)) {
    return {
      allowed: false,
      reason: "Tác giả hoặc người cùng đóng góp không thể tự duyệt skill của chính mình.",
    }
  }

  if (isSuperOrCommunityAdmin(ctx) || ctx.isKtdbclOfficer) {
    return { allowed: true }
  }

  if (skill.assignedReviewerId && skill.assignedReviewerId === ctx.userId) {
    return { allowed: true }
  }

  const hasScopedRole =
    hasSlcRoleInScope(ctx, "SKILL_REVIEWER", {
      campusId: skill.campusId,
      departmentId: skill.departmentId,
      subjectCode: skill.subjectCode,
    }) ||
    hasSlcRoleInScope(ctx, "COORDINATOR", {
      campusId: skill.campusId,
      departmentId: skill.departmentId,
      subjectCode: skill.subjectCode,
    }) ||
    hasSlcRoleInScope(ctx, "EXPERT_REVIEWER", {
      campusId: skill.campusId,
      subjectCode: skill.subjectCode,
    })

  if (hasScopedRole) {
    return { allowed: true }
  }

  // TTCM / QLCM duyệt theo tổ hoặc môn trong cơ sở được giao
  if (ctx.isDepartmentHead) {
    const sameDept = Boolean(skill.departmentId && ctx.departmentId === skill.departmentId)
    const sameSubj = Boolean(skill.subjectCode && ctx.mainSubjectCode === skill.subjectCode)
    const sameCampus = !skill.campusId || isUserInCampus(ctx, skill.campusId)
    if ((sameDept || sameSubj) && sameCampus) {
      return { allowed: true }
    }
  }

  return {
    allowed: false,
    reason: "Thầy/Cô không nằm trong phạm vi phân công duyệt chuyên môn của skill này.",
  }
}

/**
 * Kiểm tra quyền xem hoặc tải xuống một Skill môn học:
 * - Nếu skill đang PUBLISHED (hoặc có publishedVersionId đang phát hành trong khi bản mới đang chờ duyệt):
 *   kiểm tra phạm vi visibility (SYSTEM | CAMPUS | DEPARTMENT | GROUP).
 * - Nếu skill ở trạng thái DRAFT | PENDING_REVIEW | NEEDS_REVISION | APPROVED | ARCHIVED:
 *   chỉ tác giả, đồng tác giả, hoặc người có quyền duyệt trong phạm vi mới xem được.
 */
export function canViewSkill(
  ctx: SlcUserContext | null,
  skill: SkillAccessTarget
): boolean {
  if (!ctx || !ctx.userId) return false

  const isAuthorOrCollab =
    skill.authorId === ctx.userId || Boolean(skill.collaboratorIds?.includes(ctx.userId))
  const isAdmin = isSuperOrCommunityAdmin(ctx)
  const reviewerCheck = canReviewSkill(ctx, skill)

  if (skill.status === "DELETED") {
    return isAuthorOrCollab || isAdmin
  }

  if (skill.status === "DRAFT" || skill.status === "ARCHIVED") {
    return isAuthorOrCollab || isAdmin
  }

  const hasActivePublishedVersion =
    skill.status === "PUBLISHED" || Boolean(skill.publishedVersionId)

  if (!hasActivePublishedVersion) {
    // PENDING_REVIEW, NEEDS_REVISION, APPROVED (not yet published)
    return isAuthorOrCollab || isAdmin || reviewerCheck.allowed
  }

  if (isAuthorOrCollab || isAdmin || reviewerCheck.allowed) {
    return true
  }

  if (skill.visibility === "GROUP" || skill.groupId) {
    if (!skill.groupId) return false
    return (
      ctx.approvedGroupIds.includes(skill.groupId) ||
      ctx.ownedGroupIds.includes(skill.groupId) ||
      ctx.moderatedGroupIds.includes(skill.groupId)
    )
  }

  if (skill.visibility === "DEPARTMENT") {
    if (!skill.departmentId) {
      return skill.campusId ? isUserInCampus(ctx, skill.campusId) : true
    }
    return ctx.departmentId === skill.departmentId || Boolean(ctx.isKtdbclOfficer)
  }

  if (skill.visibility === "CAMPUS") {
    if (!skill.campusId) return true
    return isUserInCampus(ctx, skill.campusId) || Boolean(ctx.isKtdbclOfficer)
  }

  return true
}

/**
 * Kiểm tra quyền xóa mềm (soft-delete) hoặc khôi phục bài đăng / skill đã xóa.
 */
export function canRestoreOrDeletePostOrSkill(
  ctx: SlcUserContext | null,
  target: { authorId: string; campusId?: string | null; departmentId?: string | null }
): boolean {
  if (!ctx || !ctx.userId) return false
  if (target.authorId === ctx.userId) return true
  if (isSuperOrCommunityAdmin(ctx)) return true
  return hasSlcRoleInScope(ctx, "COORDINATOR", {
    campusId: target.campusId,
    departmentId: target.departmentId,
  })
}

