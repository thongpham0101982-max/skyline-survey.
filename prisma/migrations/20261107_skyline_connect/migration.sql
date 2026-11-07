-- Sky-Line Connect v2.0 Migration (Additive & Non-Destructive)
-- Created: 2026-11-07

CREATE TABLE IF NOT EXISTS "slc_feature_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL DEFAULT 'DEFAULT',
  "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
  "pilotMode" BOOLEAN NOT NULL DEFAULT 0,
  "allowedCampusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "allowedUserIdsJson" TEXT NOT NULL DEFAULT '[]',
  "allowedRolesJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "maxImageSizeMb" INTEGER NOT NULL DEFAULT 10,
  "maxDocSizeMb" INTEGER NOT NULL DEFAULT 25,
  "maxFilesPerPost" INTEGER NOT NULL DEFAULT 5,
  "allowedMimeTypesJson" TEXT NOT NULL DEFAULT '["image/jpeg","image/png","image/webp","image/gif","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]',
  "workingDaysJson" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  "holidaysJson" TEXT NOT NULL DEFAULT '[]',
  "updatedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_feature_configs_key_key" ON "slc_feature_configs"("key");

CREATE TABLE IF NOT EXISTS "slc_user_role_assignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "userName" TEXT,
  "userEmail" TEXT,
  "role" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL DEFAULT 'SYSTEM',
  "scopeId" TEXT NOT NULL DEFAULT 'ALL',
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "assignedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_user_role_assignments_userId_role_scopeType_scopeId_key" ON "slc_user_role_assignments"("userId", "role", "scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "slc_user_role_assignments_userId_isActive_idx" ON "slc_user_role_assignments"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "slc_user_role_assignments_role_scopeType_scopeId_isActive_idx" ON "slc_user_role_assignments"("role", "scopeType", "scopeId", "isActive");

CREATE TABLE IF NOT EXISTS "slc_community_profiles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "teacherId" TEXT,
  "fullName" TEXT,
  "avatarUrl" TEXT,
  "coverImageUrl" TEXT,
  "bio" TEXT,
  "campusId" TEXT,
  "campusName" TEXT,
  "mainSubject" TEXT,
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "specialtiesJson" TEXT NOT NULL DEFAULT '[]',
  "interestsJson" TEXT NOT NULL DEFAULT '[]',
  "notifyOnMention" BOOLEAN NOT NULL DEFAULT 1,
  "notifyOnReply" BOOLEAN NOT NULL DEFAULT 1,
  "notifyOnInvite" BOOLEAN NOT NULL DEFAULT 1,
  "notifyOnFollowedUpdate" BOOLEAN NOT NULL DEFAULT 1,
  "digestMode" TEXT NOT NULL DEFAULT 'IMMEDIATE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_community_profiles_userId_key" ON "slc_community_profiles"("userId");
CREATE INDEX IF NOT EXISTS "slc_community_profiles_campusId_idx" ON "slc_community_profiles"("campusId");

CREATE TABLE IF NOT EXISTS "slc_tags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'TOPIC',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_tags_code_key" ON "slc_tags"("code");
CREATE INDEX IF NOT EXISTS "slc_tags_category_isActive_sortOrder_idx" ON "slc_tags"("category", "isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "slc_groups" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "coverImageUrl" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "campusId" TEXT,
  "campusName" TEXT,
  "subjectCode" TEXT,
  "gradeLevel" TEXT,
  "ownerId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "memberCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_groups_slug_key" ON "slc_groups"("slug");
CREATE INDEX IF NOT EXISTS "slc_groups_status_visibility_idx" ON "slc_groups"("status", "visibility");
CREATE INDEX IF NOT EXISTS "slc_groups_campusId_idx" ON "slc_groups"("campusId");
CREATE INDEX IF NOT EXISTS "slc_groups_ownerId_idx" ON "slc_groups"("ownerId");

CREATE TABLE IF NOT EXISTS "slc_group_members" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userAvatar" TEXT,
  "campusName" TEXT,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "joinNote" TEXT,
  "approvedById" TEXT,
  "joinedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "slc_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_group_members_groupId_userId_key" ON "slc_group_members"("groupId", "userId");
CREATE INDEX IF NOT EXISTS "slc_group_members_userId_status_idx" ON "slc_group_members"("userId", "status");

CREATE TABLE IF NOT EXISTS "slc_posts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorAvatar" TEXT,
  "authorRole" TEXT DEFAULT 'Giáo viên',
  "campusId" TEXT,
  "campusName" TEXT,
  "mainSubject" TEXT,
  "postType" TEXT NOT NULL DEFAULT 'IDEA',
  "title" TEXT,
  "summary" TEXT,
  "content" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
  "groupId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "subjectCodesJson" TEXT NOT NULL DEFAULT '[]',
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "purposeTagsJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "mentionedUserIdsJson" TEXT NOT NULL DEFAULT '[]',
  "hasStudentDataPiiChecked" BOOLEAN NOT NULL DEFAULT 1,
  "sharedFromPostId" TEXT,
  "linkedIdeaId" TEXT,
  "linkedProductId" TEXT,
  "linkedProjectId" TEXT,
  "isEditorialFeatured" BOOLEAN NOT NULL DEFAULT 0,
  "featuredSlot" INTEGER,
  "featuredLabel" TEXT,
  "isPinned" BOOLEAN NOT NULL DEFAULT 0,
  "pinnedById" TEXT,
  "pinnedAt" DATETIME,
  "reactionCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "saveCount" INTEGER NOT NULL DEFAULT 0,
  "shareCount" INTEGER NOT NULL DEFAULT 0,
  "reachCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "slc_posts_status_visibility_publishedAt_id_idx" ON "slc_posts"("status", "visibility", "publishedAt", "id");
CREATE INDEX IF NOT EXISTS "slc_posts_authorId_status_idx" ON "slc_posts"("authorId", "status");
CREATE INDEX IF NOT EXISTS "slc_posts_groupId_status_idx" ON "slc_posts"("groupId", "status");
CREATE INDEX IF NOT EXISTS "slc_posts_campusId_status_idx" ON "slc_posts"("campusId", "status");
CREATE INDEX IF NOT EXISTS "slc_posts_postType_status_publishedAt_idx" ON "slc_posts"("postType", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "slc_posts_isEditorialFeatured_featuredSlot_idx" ON "slc_posts"("isEditorialFeatured", "featuredSlot");

CREATE TABLE IF NOT EXISTS "slc_post_revisions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "editorName" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "postType" TEXT NOT NULL,
  "visibility" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL DEFAULT '{}',
  "changeNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "slc_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_post_revisions_postId_versionNumber_idx" ON "slc_post_revisions"("postId", "versionNumber");

CREATE TABLE IF NOT EXISTS "slc_attachments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT,
  "commentId" TEXT,
  "productId" TEXT,
  "evidenceId" TEXT,
  "uploaderId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "safeFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "fileUrl" TEXT NOT NULL,
  "attachmentType" TEXT NOT NULL DEFAULT 'IMAGE',
  "isDeleted" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "slc_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_attachments_postId_isDeleted_idx" ON "slc_attachments"("postId", "isDeleted");
CREATE INDEX IF NOT EXISTS "slc_attachments_commentId_isDeleted_idx" ON "slc_attachments"("commentId", "isDeleted");
CREATE INDEX IF NOT EXISTS "slc_attachments_productId_isDeleted_idx" ON "slc_attachments"("productId", "isDeleted");

CREATE TABLE IF NOT EXISTS "slc_ideas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "title" TEXT NOT NULL,
  "problemStatement" TEXT,
  "proposedSolution" TEXT NOT NULL,
  "beneficiaries" TEXT,
  "aiSupportStep" TEXT,
  "feedbackQuestions" TEXT,
  "usageCautionNote" TEXT,
  "subjectCodesJson" TEXT NOT NULL DEFAULT '[]',
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'NEW_PROPOSED',
  "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
  "groupId" TEXT,
  "avgRating" REAL NOT NULL DEFAULT 0,
  "validRatingCount" INTEGER NOT NULL DEFAULT 0,
  "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]',
  "linkedProjectId" TEXT,
  "linkedProductId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_ideas_postId_key" ON "slc_ideas"("postId");
CREATE INDEX IF NOT EXISTS "slc_ideas_status_visibility_createdAt_idx" ON "slc_ideas"("status", "visibility", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_ideas_authorId_idx" ON "slc_ideas"("authorId");
CREATE INDEX IF NOT EXISTS "slc_ideas_campusId_idx" ON "slc_ideas"("campusId");

CREATE TABLE IF NOT EXISTS "slc_products" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "groupId" TEXT,
  "linkedIdeaId" TEXT,
  "linkedProjectId" TEXT,
  "name" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "utilitySummary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "productUrl" TEXT,
  "guideText" TEXT,
  "usageCautionNote" TEXT,
  "currentVersion" TEXT NOT NULL DEFAULT '1.0',
  "majorVersion" INTEGER NOT NULL DEFAULT 1,
  "subjectCodesJson" TEXT NOT NULL DEFAULT '[]',
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "pricingType" TEXT NOT NULL DEFAULT 'FREE',
  "accountRequirement" TEXT NOT NULL DEFAULT 'NONE',
  "status" TEXT NOT NULL DEFAULT 'READY',
  "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
  "openLinkCount" INTEGER NOT NULL DEFAULT 0,
  "avgRating" REAL NOT NULL DEFAULT 0,
  "validRatingCount" INTEGER NOT NULL DEFAULT 0,
  "selfAppliedCount" INTEGER NOT NULL DEFAULT 0,
  "verifiedEvidenceCount" INTEGER NOT NULL DEFAULT 0,
  "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_products_postId_key" ON "slc_products"("postId");
CREATE INDEX IF NOT EXISTS "slc_products_status_visibility_createdAt_idx" ON "slc_products"("status", "visibility", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_products_authorId_idx" ON "slc_products"("authorId");
CREATE INDEX IF NOT EXISTS "slc_products_campusId_idx" ON "slc_products"("campusId");

CREATE TABLE IF NOT EXISTS "slc_product_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "majorVersion" INTEGER NOT NULL DEFAULT 1,
  "releaseNotes" TEXT NOT NULL,
  "productUrl" TEXT,
  "sourceCommentId" TEXT,
  "contributorUserId" TEXT,
  "contributorName" TEXT,
  "contributorOptOutPublic" BOOLEAN NOT NULL DEFAULT 0,
  "reopenEvaluation" BOOLEAN NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_product_versions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "slc_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_product_versions_productId_createdAt_idx" ON "slc_product_versions"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_product_versions_sourceCommentId_idx" ON "slc_product_versions"("sourceCommentId");

CREATE TABLE IF NOT EXISTS "slc_projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT,
  "ownerId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "groupId" TEXT,
  "linkedIdeaId" TEXT,
  "linkedProductIdsJson" TEXT NOT NULL DEFAULT '[]',
  "title" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "neededRolesJson" TEXT NOT NULL DEFAULT '[]',
  "subjectCodesJson" TEXT NOT NULL DEFAULT '[]',
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'SEEKING_COLLABORATORS',
  "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
  "memberCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_projects_postId_key" ON "slc_projects"("postId");
CREATE INDEX IF NOT EXISTS "slc_projects_status_visibility_createdAt_idx" ON "slc_projects"("status", "visibility", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_projects_ownerId_idx" ON "slc_projects"("ownerId");
CREATE INDEX IF NOT EXISTS "slc_projects_campusId_idx" ON "slc_projects"("campusId");

CREATE TABLE IF NOT EXISTS "slc_project_members" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userAvatar" TEXT,
  "campusName" TEXT,
  "roleName" TEXT NOT NULL DEFAULT 'Cộng sự chuyên môn',
  "memberRole" TEXT NOT NULL DEFAULT 'CO_AUTHOR',
  "status" TEXT NOT NULL DEFAULT 'PENDING_REQUEST',
  "requestMessage" TEXT,
  "contributionSummary" TEXT,
  "approvedById" TEXT,
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "slc_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_project_members_projectId_userId_key" ON "slc_project_members"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "slc_project_members_userId_status_idx" ON "slc_project_members"("userId", "status");
CREATE INDEX IF NOT EXISTS "slc_project_members_projectId_status_idx" ON "slc_project_members"("projectId", "status");

CREATE TABLE IF NOT EXISTS "slc_project_progresses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "milestoneStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "attachmentIdsJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_project_progresses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "slc_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_project_progresses_projectId_createdAt_idx" ON "slc_project_progresses"("projectId", "createdAt");

CREATE TABLE IF NOT EXISTS "slc_reactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "postId" TEXT,
  "commentId" TEXT,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "reactionType" TEXT NOT NULL DEFAULT 'USEFUL',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_reactions_targetType_targetId_userId_key" ON "slc_reactions"("targetType", "targetId", "userId");
CREATE INDEX IF NOT EXISTS "slc_reactions_targetType_targetId_idx" ON "slc_reactions"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_reactions_userId_idx" ON "slc_reactions"("userId");

CREATE TABLE IF NOT EXISTS "slc_comments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorAvatar" TEXT,
  "authorRole" TEXT DEFAULT 'Giáo viên',
  "campusName" TEXT,
  "parentId" TEXT,
  "replyToCommentId" TEXT,
  "replyToUserId" TEXT,
  "replyToUserName" TEXT,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "content" TEXT NOT NULL,
  "mentionedUserIdsJson" TEXT NOT NULL DEFAULT '[]',
  "attachmentIdsJson" TEXT NOT NULL DEFAULT '[]',
  "isEdited" BOOLEAN NOT NULL DEFAULT 0,
  "editedAt" DATETIME,
  "isDeleted" BOOLEAN NOT NULL DEFAULT 0,
  "deletedAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isPinned" BOOLEAN NOT NULL DEFAULT 0,
  "pinnedAt" DATETIME,
  "pinnedById" TEXT,
  "feedbackStatus" TEXT NOT NULL DEFAULT 'NONE',
  "feedbackReason" TEXT,
  "feedbackUpdatedAt" DATETIME,
  "feedbackUpdatedById" TEXT,
  "linkedProductVersionId" TEXT,
  "contributorAcknowledged" BOOLEAN NOT NULL DEFAULT 0,
  "contributorOptOutPublic" BOOLEAN NOT NULL DEFAULT 0,
  "reactionCount" INTEGER NOT NULL DEFAULT 0,
  "clientRequestId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "slc_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_comments_authorId_clientRequestId_key" ON "slc_comments"("authorId", "clientRequestId");
CREATE INDEX IF NOT EXISTS "slc_comments_postId_parentId_isPinned_createdAt_id_idx" ON "slc_comments"("postId", "parentId", "isPinned", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "slc_comments_authorId_idx" ON "slc_comments"("authorId");

CREATE TABLE IF NOT EXISTS "slc_saved_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "postId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_saved_items_userId_targetType_targetId_key" ON "slc_saved_items"("userId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_saved_items_userId_createdAt_idx" ON "slc_saved_items"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "slc_follows" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "followerId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "muteNotifications" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_follows_followerId_targetType_targetId_key" ON "slc_follows"("followerId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_follows_targetType_targetId_idx" ON "slc_follows"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_follows_followerId_idx" ON "slc_follows"("followerId");

CREATE TABLE IF NOT EXISTS "slc_ratings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "reviewerName" TEXT NOT NULL,
  "reviewerCampusId" TEXT,
  "stars" INTEGER NOT NULL,
  "starLabel" TEXT,
  "criteriaTagsJson" TEXT NOT NULL DEFAULT '[]',
  "reviewText" TEXT,
  "confirmedExperienced" BOOLEAN NOT NULL DEFAULT 0,
  "productVersion" TEXT,
  "majorVersion" INTEGER NOT NULL DEFAULT 1,
  "isValid" BOOLEAN NOT NULL DEFAULT 1,
  "invalidReason" TEXT,
  "invalidatedAt" DATETIME,
  "revisionCount" INTEGER NOT NULL DEFAULT 1,
  "lastRevisedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_ratings_targetType_targetId_reviewerId_key" ON "slc_ratings"("targetType", "targetId", "reviewerId");
CREATE INDEX IF NOT EXISTS "slc_ratings_targetType_targetId_isValid_idx" ON "slc_ratings"("targetType", "targetId", "isValid");
CREATE INDEX IF NOT EXISTS "slc_ratings_reviewerId_idx" ON "slc_ratings"("reviewerId");

CREATE TABLE IF NOT EXISTS "slc_rating_revisions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ratingId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "reviewerName" TEXT,
  "stars" INTEGER NOT NULL,
  "criteriaTagsJson" TEXT NOT NULL DEFAULT '[]',
  "reviewText" TEXT,
  "confirmedExperienced" BOOLEAN NOT NULL DEFAULT 0,
  "productVersion" TEXT,
  "majorVersion" INTEGER NOT NULL DEFAULT 1,
  "isValidAtCreation" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_rating_revisions_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "slc_ratings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_rating_revisions_targetType_targetId_createdAt_idx" ON "slc_rating_revisions"("targetType", "targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_rating_revisions_reviewerId_targetType_targetId_createdAt_idx" ON "slc_rating_revisions"("reviewerId", "targetType", "targetId", "createdAt");

CREATE TABLE IF NOT EXISTS "slc_product_applications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "productVersion" TEXT,
  "applicantId" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "appliedAt" DATETIME NOT NULL,
  "subjectOrTask" TEXT NOT NULL,
  "gradeLevel" TEXT,
  "howApplied" TEXT NOT NULL,
  "observedResult" TEXT NOT NULL,
  "evidenceText" TEXT,
  "evidenceUrlsJson" TEXT NOT NULL DEFAULT '[]',
  "hasStudentPiiRedacted" BOOLEAN NOT NULL DEFAULT 1,
  "verificationStatus" TEXT NOT NULL DEFAULT 'SELF_DECLARED',
  "verifierId" TEXT,
  "verifierName" TEXT,
  "verificationReason" TEXT,
  "verifiedAt" DATETIME,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_product_applications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "slc_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_product_applications_productId_verificationStatus_submittedAt_idx" ON "slc_product_applications"("productId", "verificationStatus", "submittedAt");
CREATE INDEX IF NOT EXISTS "slc_product_applications_applicantId_productId_submittedAt_idx" ON "slc_product_applications"("applicantId", "productId", "submittedAt");

CREATE TABLE IF NOT EXISTS "slc_expert_evaluations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "periodId" TEXT NOT NULL DEFAULT 'GLOBAL',
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "expertId" TEXT NOT NULL,
  "expertName" TEXT NOT NULL,
  "assignedById" TEXT,
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "criterion1Score" REAL,
  "criterion2Score" REAL,
  "criterion3Score" REAL,
  "averageStars" REAL,
  "comments" TEXT,
  "submittedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_expert_evaluations_periodId_targetType_targetId_expertId_key" ON "slc_expert_evaluations"("periodId", "targetType", "targetId", "expertId");
CREATE INDEX IF NOT EXISTS "slc_expert_evaluations_targetType_targetId_status_idx" ON "slc_expert_evaluations"("targetType", "targetId", "status");
CREATE INDEX IF NOT EXISTS "slc_expert_evaluations_expertId_status_idx" ON "slc_expert_evaluations"("expertId", "status");

CREATE TABLE IF NOT EXISTS "slc_award_rule_sets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
  "minRatingsIdea" INTEGER NOT NULL DEFAULT 5,
  "minRatingsProduct" INTEGER NOT NULL DEFAULT 5,
  "minVerifiedAppsProduct" INTEGER NOT NULL DEFAULT 3,
  "minExpertReviewers" INTEGER NOT NULL DEFAULT 2,
  "bayesianM" REAL NOT NULL DEFAULT 5.0,
  "bayesianPrior" REAL NOT NULL DEFAULT 3.5,
  "capVerifiedApps" INTEGER NOT NULL DEFAULT 10,
  "ideaWeightC" REAL NOT NULL DEFAULT 0.60,
  "ideaWeightE" REAL NOT NULL DEFAULT 0.40,
  "productWeightC" REAL NOT NULL DEFAULT 0.50,
  "productWeightE" REAL NOT NULL DEFAULT 0.20,
  "productWeightU" REAL NOT NULL DEFAULT 0.30,
  "isLocked" BOOLEAN NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_award_rule_sets_code_key" ON "slc_award_rule_sets"("code");
CREATE INDEX IF NOT EXISTS "slc_award_rule_sets_periodType_version_idx" ON "slc_award_rule_sets"("periodType", "version");

CREATE TABLE IF NOT EXISTS "slc_award_periods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "academicYearName" TEXT NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
  "month" INTEGER,
  "audienceScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  "audienceScopeId" TEXT NOT NULL DEFAULT 'ALL',
  "startDateUtc" DATETIME NOT NULL,
  "endDateUtc" DATETIME NOT NULL,
  "reviewDeadlineUtc" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "ruleSetId" TEXT NOT NULL,
  "ruleSetSnapshotJson" TEXT NOT NULL DEFAULT '{}',
  "finalizedAt" DATETIME,
  "finalizedById" TEXT,
  "finalizedByName" TEXT,
  "lockToken" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_award_periods_code_key" ON "slc_award_periods"("code");
CREATE INDEX IF NOT EXISTS "slc_award_periods_academicYearId_periodType_audienceScope_status_idx" ON "slc_award_periods"("academicYearId", "periodType", "audienceScope", "status");

CREATE TABLE IF NOT EXISTS "slc_award_nominations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "periodId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "nominatorId" TEXT NOT NULL,
  "isReEntry" BOOLEAN NOT NULL DEFAULT 0,
  "improvementSummary" TEXT,
  "coordinatorConfirmed" BOOLEAN NOT NULL DEFAULT 1,
  "confirmedById" TEXT,
  "confirmedAt" DATETIME,
  "hasConcludedViolation" BOOLEAN NOT NULL DEFAULT 0,
  "violationNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REGISTERED',
  "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_award_nominations_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "slc_award_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_award_nominations_periodId_targetType_targetId_key" ON "slc_award_nominations"("periodId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_award_nominations_targetType_targetId_idx" ON "slc_award_nominations"("targetType", "targetId");

CREATE TABLE IF NOT EXISTS "slc_award_snapshots" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "periodId" TEXT NOT NULL,
  "snapshotType" TEXT NOT NULL DEFAULT 'PROVISIONAL',
  "parentSnapshotId" TEXT,
  "amendmentReason" TEXT,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetTitle" TEXT NOT NULL,
  "targetCoverImage" TEXT,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "subjectCodesJson" TEXT NOT NULL DEFAULT '[]',
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "isEligible" BOOLEAN NOT NULL DEFAULT 0,
  "ineligibleReasonsJson" TEXT NOT NULL DEFAULT '[]',
  "validRatingCountN" INTEGER NOT NULL DEFAULT 0,
  "avgRatingR" REAL NOT NULL DEFAULT 0,
  "scoreC" REAL NOT NULL DEFAULT 0,
  "expertCount" INTEGER NOT NULL DEFAULT 0,
  "avgExpertStars" REAL,
  "scoreE" REAL,
  "verifiedAppsCountA" INTEGER NOT NULL DEFAULT 0,
  "scoreU" REAL,
  "totalScoreRaw" REAL,
  "rank" INTEGER,
  "isTied" BOOLEAN NOT NULL DEFAULT 0,
  "calculationDetailsJson" TEXT NOT NULL DEFAULT '{}',
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_award_snapshots_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "slc_award_periods" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_award_snapshots_periodId_snapshotType_targetType_rank_idx" ON "slc_award_snapshots"("periodId", "snapshotType", "targetType", "rank");
CREATE INDEX IF NOT EXISTS "slc_award_snapshots_targetType_targetId_idx" ON "slc_award_snapshots"("targetType", "targetId");

CREATE TABLE IF NOT EXISTS "slc_community_badges" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "periodName" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetTitle" TEXT NOT NULL,
  "badgeCode" TEXT NOT NULL,
  "badgeTitle" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_community_badges_idempotencyKey_key" ON "slc_community_badges"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "slc_community_badges_periodId_targetType_targetId_userId_key" ON "slc_community_badges"("periodId", "targetType", "targetId", "userId");
CREATE INDEX IF NOT EXISTS "slc_community_badges_userId_awardedAt_idx" ON "slc_community_badges"("userId", "awardedAt");

CREATE TABLE IF NOT EXISTS "slc_content_reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reporterId" TEXT NOT NULL,
  "reporterName" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "postId" TEXT,
  "reasonCategory" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "isSevereTempHidden" BOOLEAN NOT NULL DEFAULT 0,
  "tempHiddenById" TEXT,
  "tempHiddenReason" TEXT,
  "tempHiddenAt" DATETIME,
  "conclusion" TEXT,
  "conclusionNote" TEXT,
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "concludedAt" DATETIME,
  "appealText" TEXT,
  "appealedAt" DATETIME,
  "appealResolutionNote" TEXT,
  "appealResolvedById" TEXT,
  "appealResolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "slc_content_reports_status_createdAt_idx" ON "slc_content_reports"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_content_reports_targetType_targetId_idx" ON "slc_content_reports"("targetType", "targetId");

CREATE TABLE IF NOT EXISTS "slc_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "detailsJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "slc_audit_logs_targetType_targetId_idx" ON "slc_audit_logs"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_audit_logs_actorId_idx" ON "slc_audit_logs"("actorId");
CREATE INDEX IF NOT EXISTS "slc_audit_logs_createdAt_idx" ON "slc_audit_logs"("createdAt");

CREATE TABLE IF NOT EXISTS "slc_notification_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "deepLink" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_notification_logs_idempotencyKey_key" ON "slc_notification_logs"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "slc_notification_logs_recipientId_createdAt_idx" ON "slc_notification_logs"("recipientId", "createdAt");
