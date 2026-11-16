import { GoogleGenerativeAI } from "@google/generative-ai"
import JSZip from "jszip"
import { prisma } from "@/lib/db"
import { SLC_SKILL_WORK_CATEGORIES } from "./constants"
import {
  canManageCommunityAndSkills,
  canRestoreOrDeletePostOrSkill,
  canReviewSkill,
  canViewSkill,
  isSuperOrCommunityAdmin,
  SlcUserContext,
} from "./permissions"
import { ensureSlcSchema, getSlcDb } from "./schema-init"
import {
  checkSlcRateLimit,
  detectAndRedactStudentPii,
  sanitizeRichText,
  sanitizeUntrustedAiInput,
  validateSafeExternalUrl,
} from "./security"
import {
  dispatchSlcNotification,
  recordSlcAuditLog,
  safeJsonParse,
} from "./service"
import {
  reviewScopeDataAndBuildEvidenceBrief,
  verifyTeacherClassSubjectAccess,
} from "./ssm-skill-data-engine"

export interface SkillInputFieldSchema {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "select"
  required?: boolean
  placeholder?: string
  defaultValue?: string
  options?: string[]
}

export interface SkillCollaboratorItem {
  userId: string
  name: string
  role?: string
}

export interface SkillReferenceItem {
  title: string
  url?: string
  note?: string
}

function parseVersionNext(currentVersion: string, majorBump = false): string {
  const parts = String(currentVersion || "1.0")
    .split(".")
    .map((n) => parseInt(n, 10))
  const major = Number.isFinite(parts[0]) ? parts[0] : 1
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0
  if (majorBump) {
    return `${major + 1}.0`
  }
  return `${major}.${minor + 1}`
}

/**
 * Chuẩn hóa dữ liệu 13 nhóm thông tin của Skill môn học và dựng cấu trúc hiển thị 5 phần:
 * "Giúp làm gì → Chuẩn bị gì → Yêu cầu mẫu → Kết quả minh họa → Cách sử dụng"
 */
export function formatSkillRecordForClient(
  rawSkill: any,
  ctx: SlcUserContext,
  options?: {
    savedSkillIds?: Set<string>
    appliedSkillIds?: Set<string>
    versions?: any[]
    activePublishedVersionSnapshot?: any | null
  }
) {
  const isAuthorOrCollab =
    rawSkill.authorId === ctx.userId ||
    safeJsonParse<SkillCollaboratorItem[]>(rawSkill.collaboratorsJson, []).some(
      (c) => c.userId === ctx.userId
    )
  const reviewPerm = canReviewSkill(ctx, {
    id: rawSkill.id,
    authorId: rawSkill.authorId,
    collaboratorIds: safeJsonParse<SkillCollaboratorItem[]>(
      rawSkill.collaboratorsJson,
      []
    ).map((c) => c.userId),
    status: rawSkill.status,
    publishedVersionId: rawSkill.publishedVersionId,
    visibility: rawSkill.visibility,
    campusId: rawSkill.campusId,
    departmentId: rawSkill.departmentId,
    subjectCode: rawSkill.subjectCode,
    groupId: rawSkill.groupId,
    assignedReviewerId: rawSkill.assignedReviewerId,
  })

  // Rule VIII: "Phiên bản đang phát hành tiếp tục hoạt động cho đến khi phiên bản mới được duyệt."
  // If viewer is a regular teacher (not author/reviewer/admin) and the skill is currently PENDING_REVIEW/NEEDS_REVISION
  // while having a publishedVersionId, serve the published snapshot!
  const usePublishedSnapshot =
    !isAuthorOrCollab &&
    !reviewPerm.allowed &&
    !isSuperOrCommunityAdmin(ctx) &&
    rawSkill.status !== "PUBLISHED" &&
    Boolean(options?.activePublishedVersionSnapshot)

  const effectiveSource = usePublishedSnapshot
    ? { ...rawSkill, ...options!.activePublishedVersionSnapshot, status: "PUBLISHED" }
    : rawSkill

  const collaborators = safeJsonParse<SkillCollaboratorItem[]>(
    effectiveSource.collaboratorsJson,
    []
  )
  const gradeLevels = safeJsonParse<string[]>(effectiveSource.gradeLevelsJson, [])
  const tags = safeJsonParse<string[]>(effectiveSource.tagsJson, [])
  const inputFields = safeJsonParse<SkillInputFieldSchema[]>(
    effectiveSource.inputFieldsJson,
    []
  )
  const workflowSteps = safeJsonParse<string[]>(effectiveSource.workflowStepsJson, [])
  const references = safeJsonParse<SkillReferenceItem[]>(
    effectiveSource.referencesJson,
    []
  )
  const compatiblePlatforms = safeJsonParse<string[]>(
    effectiveSource.compatiblePlatformsJson,
    ["SSM_INTERNAL", "GEMINI", "CHATGPT"]
  )
  const packageMeta = safeJsonParse<Record<string, any>>(
    effectiveSource.packageMetaJson,
    {}
  )

  const aiConfigured = Boolean(process.env.GEMINI_API_KEY)
  // Rule IV: "Chỉ hiển thị 'Dùng trên SSM' khi skill có khả năng thực thi đã được tích hợp và cấu hình đầy đủ."
  const canExecuteOnSsm =
    Boolean(effectiveSource.isExecutableOnSsm) &&
    Boolean(String(effectiveSource.aiSystemPrompt || "").trim().length >= 15) &&
    compatiblePlatforms.includes("SSM_INTERNAL") &&
    aiConfigured

  const isSameDepartmentOrSubject =
    Boolean(ctx.departmentId && rawSkill.departmentId && ctx.departmentId === rawSkill.departmentId) ||
    Boolean(ctx.mainSubjectCode && rawSkill.subjectCode && ctx.mainSubjectCode === rawSkill.subjectCode) ||
    Boolean(
      Array.isArray((ctx as any).assignedSubjectCodes) &&
        (ctx as any).assignedSubjectCodes.includes(rawSkill.subjectCode)
    )

  const canContributeSessionUpdate =
    isAuthorOrCollab ||
    isSameDepartmentOrSubject ||
    reviewPerm.allowed ||
    isSuperOrCommunityAdmin(ctx)

  const formattedVersions = (options?.versions || []).map((v: any) => {
    const snap = safeJsonParse<any>(v.snapshotJson, {})
    return {
      ...v,
      versionNumber: v.version || v.versionNumber || "1.0",
      changeLog: v.changelog || v.changeLog || "Cập nhật phiên bản",
      departmentSessionMeta: snap?.departmentSessionMeta || null,
    }
  })

  const departmentSessions = formattedVersions
    .filter((v: any) => Boolean(v.departmentSessionMeta))
    .map((v: any) => ({
      versionId: v.id,
      version: v.versionNumber,
      status: v.status,
      createdAt: v.createdAt,
      createdById: v.createdById,
      createdByName: v.createdByName,
      changelog: v.changeLog,
      ...v.departmentSessionMeta,
    }))

  return {
    ...effectiveSource,
    // Client-side aliases for seamless compatibility across views
    title: effectiveSource.name || effectiveSource.title || "Skill môn học",
    aiInstruction: effectiveSource.aiSystemPrompt || effectiveSource.aiInstruction || "",
    usageConditions: effectiveSource.prerequisites || effectiveSource.usageConditions || "",
    topicName: effectiveSource.topicOrLesson || effectiveSource.topicName || "",
    collaboratorNames: collaborators.map((c) => c.name).filter(Boolean),
    inputSchema: inputFields,
    workflowProcess: workflowSteps.join("\n"),
    stepByStepView: {
      whatItHelps: effectiveSource.purpose || effectiveSource.summary,
      whatToPrepare:
        effectiveSource.prerequisites ||
        "Xác định mục tiêu bài dạy, thời lượng dự kiến và đặc điểm chung của lớp (không nhập tên/mã học sinh).",
    },
    collaborators,
    gradeLevels,
    tags,
    inputFields,
    workflowSteps,
    references,
    compatiblePlatforms,
    packageMeta,
    aiConfigured,
    canExecuteOnSsm,
    hasPendingUpdateWhilePublished:
      Boolean(rawSkill.publishedVersionId) && rawSkill.status !== "PUBLISHED",
    latestDraftOrReviewStatus: rawSkill.status,
    isSaved: Boolean(options?.savedSkillIds?.has(rawSkill.id)),
    hasUserApplied: Boolean(options?.appliedSkillIds?.has(rawSkill.id)),
    canEdit: isAuthorOrCollab || isSuperOrCommunityAdmin(ctx),
    canContributeSessionUpdate,
    canReview: reviewPerm.allowed,
    canDeleteOrRestore: canRestoreOrDeletePostOrSkill(ctx, {
      authorId: rawSkill.authorId,
      campusId: rawSkill.campusId,
      departmentId: rawSkill.departmentId,
    }),
    // Cấu trúc 5 phần trực quan trên trang chi tiết:
    // "Giúp làm gì → Chuẩn bị gì → Yêu cầu mẫu → Kết quả minh họa → Cách sử dụng"
    structuredFiveStepGuide: {
      step1WhatItHelps: {
        title: "1. Giúp làm gì",
        purpose: effectiveSource.purpose || effectiveSource.summary,
        description: effectiveSource.description,
        workCategory: effectiveSource.workCategory,
        subjectName: effectiveSource.subjectName,
        gradeLevels,
        topicOrLesson: effectiveSource.topicOrLesson || "Áp dụng linh hoạt theo bài dạy",
      },
      step2WhatToPrepare: {
        title: "2. Chuẩn bị gì",
        prerequisites:
          effectiveSource.prerequisites ||
          "Xác định mục tiêu bài dạy, thời lượng dự kiến và đặc điểm chung của lớp (không nhập tên/mã học sinh).",
        inputFields,
        principlesAndLimits:
          effectiveSource.principlesAndLimits ||
          "Tách biệt phương pháp với dữ liệu cá nhân học sinh; giáo viên kiểm tra chuyên môn trước khi sử dụng trên lớp.",
      },
      step3SampleRequest: {
        title: "3. Yêu cầu mẫu",
        samplePrompt:
          effectiveSource.samplePrompt ||
          "Ví dụ đầu vào mẫu đã được ẩn danh hoàn toàn dữ liệu học sinh.",
      },
      step4IllustrativeOutput: {
        title: "4. Kết quả minh họa",
        sampleOutput:
          effectiveSource.sampleOutput ||
          "Kết quả đầu ra minh họa theo cấu trúc chuẩn của Skill.",
        outputStructure: effectiveSource.outputStructure || "",
        evaluationCriteria: effectiveSource.evaluationCriteria || "",
      },
      step5HowToUse: {
        title: "5. Cách sử dụng",
        usageGuide:
          effectiveSource.usageGuide ||
          "Sao chép hướng dẫn AI để dùng trên công cụ AI hoặc chạy thử trực tiếp trên SSM với dữ liệu lớp được phân công.",
        compatiblePlatforms,
        workflowSteps,
        canExecuteOnSsm,
      },
    },
    versions: formattedVersions,
    departmentSessions,
  }
}

export interface SkillsCatalogFilterParams {
  search?: string
  subjectCode?: string
  gradeLevel?: string
  workCategory?: string
  visibility?: string
  status?: string
  authorId?: string
  viewMode?: "CATALOG" | "MY_SKILLS" | "SAVED" | "MODERATION"
  savedOnly?: boolean
  executableOnly?: boolean
  includeMyDrafts?: boolean
  includeReviewQueue?: boolean
  includeTrash?: boolean
  sort?: "NEWEST" | "MOST_APPLIED" | "USEFUL"
  page?: number
  pageSize?: number
}

/**
 * IV. Truy vấn Kho Skills môn học (có phân trang phía máy chủ, lọc theo môn học cả môn đặc thù Sky-Line, khối, nhóm công việc).
 */
export async function querySlcSkillsCatalog(
  ctx: SlcUserContext,
  rawParams: SkillsCatalogFilterParams = {}
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const params: SkillsCatalogFilterParams = { ...rawParams }
  if (params.viewMode === "MY_SKILLS") {
    params.authorId = ctx.userId
    params.includeMyDrafts = true
  } else if (params.viewMode === "SAVED") {
    params.savedOnly = true
  } else if (params.viewMode === "MODERATION") {
    params.includeReviewQueue = true
  }

  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.min(36, Math.max(1, Number(params.pageSize || 12)))

  const [rawSkills, allVersions, userSaved, userApplied, workCategoriesDb] =
    await Promise.all([
      pAny.slcSkill
        ?.findMany({
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        })
        .catch(() => []) ?? [],
      pAny.slcSkillVersion
        ?.findMany({
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []) ?? [],
      pAny.slcSavedItem
        ?.findMany({
          where: { userId: ctx.userId, targetType: "SKILL" },
        })
        .catch(() => []) ?? [],
      pAny.slcAppliedConfirmation
        ?.findMany({
          where: { userId: ctx.userId, targetType: "SKILL" },
        })
        .catch(() => []) ?? [],
      pAny.slcSkillWorkCategory
        ?.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        })
        .catch(() => []) ?? [],
    ])

  const versionById = new Map<string, any>(allVersions.map((v: any) => [String(v.id), v]))
  const versionsBySkillId = new Map<string, any[]>()
  for (const v of allVersions) {
    const list = versionsBySkillId.get(String(v.skillId)) || []
    list.push(v)
    versionsBySkillId.set(String(v.skillId), list)
  }

  const savedSkillIds = new Set<string>(userSaved.map((s: any) => String(s.targetId)))
  const appliedSkillIds = new Set<string>(userApplied.map((a: any) => String(a.targetId)))

  const accessibleSkills = rawSkills.filter((sk: any) => {
    const collabs = safeJsonParse<SkillCollaboratorItem[]>(sk.collaboratorsJson, []).map(
      (c) => c.userId
    )
    if (sk.status === "DELETED" && !params.includeTrash) {
      return false
    }
    return canViewSkill(ctx, {
      id: sk.id,
      authorId: sk.authorId,
      collaboratorIds: collabs,
      status: sk.status,
      publishedVersionId: sk.publishedVersionId,
      visibility: sk.visibility,
      campusId: sk.campusId,
      departmentId: sk.departmentId,
      subjectCode: sk.subjectCode,
      groupId: sk.groupId,
      assignedReviewerId: sk.assignedReviewerId,
    })
  })

  const formattedList = accessibleSkills.map((sk: any) => {
    const pubVer = sk.publishedVersionId ? versionById.get(sk.publishedVersionId) : null
    const snapshot = pubVer ? safeJsonParse<any>(pubVer.snapshotJson, null) : null
    return formatSkillRecordForClient(sk, ctx, {
      savedSkillIds,
      appliedSkillIds,
      versions: (versionsBySkillId.get(sk.id) || []).slice(0, 10),
      activePublishedVersionSnapshot: snapshot,
    })
  })

  const qLower = (params.search || "").trim().toLowerCase()

  const filtered = formattedList.filter((sk: any) => {
    if (params.includeTrash) {
      if (sk.status !== "DELETED") return false
    } else if (params.includeReviewQueue) {
      if (!["PENDING_REVIEW", "NEEDS_REVISION", "APPROVED"].includes(sk.latestDraftOrReviewStatus)) {
        return false
      }
      if (!sk.canReview && !isSuperOrCommunityAdmin(ctx)) return false
    } else if (params.authorId) {
      const isCollab = (sk.collaborators || []).some(
        (c: SkillCollaboratorItem) => c.userId === params.authorId
      )
      if (sk.authorId !== params.authorId && !isCollab) return false
    } else if (!params.includeMyDrafts) {
      // Public repository view: only show PUBLISHED skills (or skills with an active publishedVersionId)
      if (sk.status !== "PUBLISHED" && !sk.publishedVersionId) return false
    }

    if (params.status && params.status !== "ALL" && sk.latestDraftOrReviewStatus !== params.status) {
      return false
    }
    if (
      params.subjectCode &&
      params.subjectCode !== "ALL" &&
      sk.subjectCode !== params.subjectCode
    ) {
      return false
    }
    if (
      params.gradeLevel &&
      params.gradeLevel !== "ALL" &&
      !(sk.gradeLevels || []).includes(params.gradeLevel)
    ) {
      return false
    }
    if (
      params.workCategory &&
      params.workCategory !== "ALL" &&
      sk.workCategory !== params.workCategory
    ) {
      return false
    }
    if (
      params.visibility &&
      params.visibility !== "ALL" &&
      sk.visibility !== params.visibility
    ) {
      return false
    }
    if (params.savedOnly && !sk.isSaved) {
      return false
    }
    if (params.executableOnly && !sk.canExecuteOnSsm) {
      return false
    }

    if (qLower) {
      const haystack = [
        sk.name || "",
        sk.code || "",
        sk.summary || "",
        sk.description || "",
        sk.purpose || "",
        sk.subjectName || "",
        sk.subjectCode || "",
        sk.topicOrLesson || "",
        sk.authorName || "",
        sk.departmentName || "",
        ...(sk.tags || []),
        ...(sk.gradeLevels || []),
      ]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(qLower)) return false
    }

    return true
  })

  const sortMode = params.sort || "NEWEST"
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortMode === "MOST_APPLIED") {
      const diff = Number(b.appliedCount || 0) - Number(a.appliedCount || 0)
      if (diff !== 0) return diff
      const runDiff = Number(b.runCount || 0) - Number(a.runCount || 0)
      if (runDiff !== 0) return runDiff
    } else if (sortMode === "USEFUL") {
      const diff = Number(b.saveCount || 0) + Number(b.appliedCount || 0) * 2 - (Number(a.saveCount || 0) + Number(a.appliedCount || 0) * 2)
      if (diff !== 0) return diff
    }
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  })

  const total = sorted.length
  const startIndex = (page - 1) * pageSize
  const items = sorted.slice(startIndex, startIndex + pageSize)

  const workCategoryMap = new Map<string, any>()
  for (const wc of SLC_SKILL_WORK_CATEGORIES) {
    workCategoryMap.set(wc.code, wc)
  }
  for (const dbWc of workCategoriesDb) {
    workCategoryMap.set(dbWc.code, dbWc)
  }

  return {
    items,
    workCategories: Array.from(workCategoryMap.values()),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

/**
 * Xem chi tiết 1 Skill môn học kèm lịch sử phiên bản, danh sách xác nhận "Đã áp dụng", và bài thảo luận liên kết trên tường.
 */
export async function getSlcSkillDetail(ctx: SlcUserContext, skillId: string) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const rawSkill = await pAny.slcSkill?.findUnique({ where: { id: skillId } })
  if (!rawSkill) {
    throw new Error("Không tìm thấy Skill môn học.")
  }

  const collabs = safeJsonParse<SkillCollaboratorItem[]>(rawSkill.collaboratorsJson, []).map(
    (c) => c.userId
  )
  if (
    !canViewSkill(ctx, {
      id: rawSkill.id,
      authorId: rawSkill.authorId,
      collaboratorIds: collabs,
      status: rawSkill.status,
      publishedVersionId: rawSkill.publishedVersionId,
      visibility: rawSkill.visibility,
      campusId: rawSkill.campusId,
      departmentId: rawSkill.departmentId,
      subjectCode: rawSkill.subjectCode,
      groupId: rawSkill.groupId,
      assignedReviewerId: rawSkill.assignedReviewerId,
    })
  ) {
    throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền xem Skill môn học này.")
  }

  const [versions, applications, savedRecord, parentSkill, myRuns] = await Promise.all([
    pAny.slcSkillVersion
      ?.findMany({
        where: { skillId: rawSkill.id },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []) ?? [],
    pAny.slcAppliedConfirmation
      ?.findMany({
        where: {
          OR: [{ skillId: rawSkill.id }, { targetType: "SKILL", targetId: rawSkill.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
      .catch(() => []) ?? [],
    pAny.slcSavedItem
      ?.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: ctx.userId,
            targetType: "SKILL",
            targetId: rawSkill.id,
          },
        },
      })
      .catch(() => null),
    rawSkill.parentSkillId
      ? pAny.slcSkill
          ?.findUnique({
            where: { id: rawSkill.parentSkillId },
            select: { id: true, code: true, name: true, authorId: true, authorName: true, currentVersion: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    pAny.slcSkillRun
      ?.findMany({
        where: { skillId: rawSkill.id, runnerUserId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => []) ?? [],
  ])

  const pubVer = rawSkill.publishedVersionId
    ? versions.find((v: any) => v.id === rawSkill.publishedVersionId)
    : null
  const pubSnapshot = pubVer ? safeJsonParse<any>(pubVer.snapshotJson, null) : null

  const formatted = formatSkillRecordForClient(rawSkill, ctx, {
    savedSkillIds: new Set(savedRecord ? [rawSkill.id] : []),
    appliedSkillIds: new Set(
      applications.some((a: any) => a.userId === ctx.userId) ? [rawSkill.id] : []
    ),
    versions,
    activePublishedVersionSnapshot: pubSnapshot,
  })

  return {
    skill: formatted,
    versions: formatted.versions,
    departmentSessions: formatted.departmentSessions,
    canReview: formatted.canReview,
    canContributeSessionUpdate: formatted.canContributeSessionUpdate,
    parentSkill,
    applications,
    myRecentRuns: myRuns,
    kitvietReferenceNote:
      "Cấu trúc trình bày 'Giúp làm gì → Chuẩn bị gì → Yêu cầu mẫu → Kết quả minh họa → Cách sử dụng' được chuẩn hóa trực tiếp trên SSM. (Ghi chú minh bạch: Liên kết tham khảo bên ngoài kitviet.mochistudio.io.vn/#vi-du sử dụng client-side hash routing nên hệ thống không tự nhận đã sao chép nguyên mẫu chưa kiểm chứng).",
  }
}

/**
 * V. Giáo viên mô tả cách làm để AI hỗ trợ tạo bản nháp Skill môn học.
 */
export async function generateAiAssistedSkillDraft(
  ctx: SlcUserContext,
  input: {
    teacherDescription: string
    subjectCode: string
    subjectName: string
    gradeLevel: string
    workCategory: string
    topicOrLesson?: string
  }
) {
  const cleanDesc = detectAndRedactStudentPii(
    sanitizeUntrustedAiInput(input.teacherDescription, 3000)
  ).redactedText.trim()

  if (!cleanDesc || cleanDesc.length < 15) {
    throw new Error("Vui lòng mô tả cách làm hoặc mong muốn sư phạm tối thiểu 15 ký tự để hệ thống hỗ trợ tạo bản nháp.")
  }

  const subjectCode = input.subjectCode || ctx.mainSubjectCode || "TOAN"
  const subjectName = input.subjectName || ctx.mainSubjectName || "Môn chuyên môn"
  const gradeLevel = input.gradeLevel || "K10"
  const workCategory = input.workCategory || "ACTIVITY_DESIGN"
  const topic = detectAndRedactStudentPii(sanitizeRichText(input.topicOrLesson || "Bài học chuyên đề")).redactedText

  const baseDraft = {
    name: `Skill ${topic} — ${subjectName} (${gradeLevel})`,
    summary: cleanDesc.slice(0, 220),
    description: `Skill hỗ trợ giáo viên môn ${subjectName} (${gradeLevel}) thực hiện: ${cleanDesc}`,
    purpose: `Giúp giáo viên chuẩn hóa quy trình: ${cleanDesc.slice(0, 180)}`,
    workCategory,
    subjectCode,
    subjectName,
    gradeLevels: [gradeLevel],
    topicOrLesson: topic,
    tags: [subjectName, gradeLevel, "AI hỗ trợ soạn nháp"],
    prerequisites:
      "1. Xác định rõ mục tiêu bài học và yêu cầu cần đạt theo chương trình.\n2. Chuẩn bị nội dung kiến thức trọng tâm hoặc ngữ liệu bài dạy.\n3. Không nhập họ tên, mã số học sinh vào các trường đầu vào.",
    inputFields: [
      {
        key: "lessonTopic",
        label: "Tên bài học / Chủ đề",
        type: "text",
        required: true,
        placeholder: "Nhập tên bài học...",
        defaultValue: topic,
      },
      {
        key: "learningObjectives",
        label: "Mục tiêu / Yêu cầu cần đạt",
        type: "textarea",
        required: true,
        placeholder: "Nêu mục tiêu cần đạt của tiết học...",
        defaultValue: "",
      },
      {
        key: "classCharacteristics",
        label: "Đặc điểm chung của lớp (ẩn danh)",
        type: "textarea",
        required: false,
        placeholder: "Ví dụ: Lớp 35 HS, cần phân hóa 3 mức độ nhận thức...",
        defaultValue: "",
      },
    ],
    aiSystemPrompt: `Bạn là trợ lý chuyên môn sư phạm môn ${subjectName} (${gradeLevel}) tại Hệ thống Giáo dục Sky-Line.\n\nPhương pháp sư phạm của giáo viên:\n${cleanDesc}\n\nHãy dựa vào:\n- Bài học: {{lessonTopic}}\n- Mục tiêu cần đạt: {{learningObjectives}}\n- Đặc điểm lớp học (ẩn danh): {{classCharacteristics}}\n\nĐể thiết kế nội dung chi tiết, chính xác về mặt học thuật, khả thi trên lớp học và tuân thủ nguyên tắc bảo mật dữ liệu học sinh.`,
    workflowSteps: [
      "Bước 1: Nhập tên bài học, yêu cầu cần đạt và đặc điểm chung của lớp.",
      "Bước 2: AI phân tích phương pháp sư phạm và thiết kế nội dung theo cấu trúc đầu ra.",
      "Bước 3: Giáo viên rà soát, hiệu chỉnh phù hợp thực tế lớp học trước khi sử dụng.",
    ],
    principlesAndLimits:
      "- Bám sát mục tiêu chương trình do giáo viên cung cấp.\n- Không suy diễn lỗi kiến thức khi thiếu minh chứng bài làm.\n- Không chứa thông tin định danh học sinh (tên, mã HS).",
    outputStructure:
      "1. Mục tiêu & Chuẩn bị\n2. Nội dung hoạt động / Học liệu chi tiết\n3. Phương án phân hóa / Hỗ trợ học sinh\n4. Tiêu chí kiểm tra, đánh giá",
    evaluationCriteria:
      "- Đúng trọng tâm kiến thức bộ môn.\n- Phù hợp lứa tuổi và thời lượng tiết học.\n- Đảm bảo an toàn thông tin học sinh.",
    samplePrompt: `Bài học: ${topic}\nMục tiêu: Học sinh nắm vững khái niệm trọng tâm và vận dụng giải quyết bài tập thực tế.\nPhương pháp: ${cleanDesc}`,
    sampleOutput: `### KẾT QUẢ MINH HỌA: ${topic.toUpperCase()} (${subjectName} - ${gradeLevel})\n\n1. **Mục tiêu hoạt động:** Bám sát phương pháp "${cleanDesc.slice(0, 120)}...".\n2. **Tiến trình & Học liệu:**\n   - Hoạt động khởi động gắn với tình huống thực tế.\n   - Nhiệm vụ khám phá và luyện tập theo 3 mức độ nhận thức.\n3. **Tiêu chí kiểm tra:** Bảng kiểm đánh giá nhanh mức độ đạt của học sinh ngay tại lớp.`,
    compatiblePlatforms: ["SSM_INTERNAL", "GEMINI", "CHATGPT", "CLAUDE"],
    usageGuide:
      "Sử dụng trực tiếp nút 'Dùng trên SSM' (khi hệ thống đã cấu hình AI) hoặc bấm 'Sao chép hướng dẫn' để sử dụng trên Gemini / ChatGPT.",
    isExecutableOnSsm: true,
    creationSource: "AI_ASSISTED",
  }

  return {
    draftSkill: baseDraft,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  }
}

/**
 * V & VIII. Tạo mới, lưu nháp, gửi duyệt, tạo phiên bản cải tiến (fork) hoặc cập nhật phiên bản mới cho Skill môn học.
 * Đảm bảo quy tắc:
 * - Gói/ví dụ/nội dung được quét và ẩn danh PII học sinh.
 * - Khi sửa một Skill đang phát hành (PUBLISHED), hệ thống tạo phiên bản mới (SlcSkillVersion)
 *   và giữ publishedVersionId trỏ tới phiên bản đang phát hành cho đến khi phiên bản mới được duyệt!
 * - Giữ liên kết nguồn (parentSkillId) và ghi nhận tác giả gốc (originalAuthorId, originalAuthorName).
 */
export async function createOrUpdateSlcSkill(
  ctx: SlcUserContext,
  input: {
    id?: string
    skillId?: string
    parentSkillId?: string | null
    name?: string
    title?: string
    summary?: string
    description?: string
    purpose?: string
    workCategory?: string
    subjectCode?: string
    subjectCodes?: string[]
    subjectName?: string
    gradeLevels?: string[]
    topicOrLesson?: string
    topicName?: string
    tags?: string[]
    collaborators?: SkillCollaboratorItem[]
    prerequisites?: string
    inputFields?: SkillInputFieldSchema[]
    aiSystemPrompt?: string
    aiInstruction?: string
    workflowSteps?: string[]
    principlesAndLimits?: string
    outputStructure?: string
    evaluationCriteria?: string
    references?: SkillReferenceItem[]
    samplePrompt?: string
    sampleOutput?: string
    compatiblePlatforms?: string[]
    usageGuide?: string
    isExecutableOnSsm?: boolean
    packageAttachmentId?: string | null
    packageMeta?: Record<string, any>
    externalUrl?: string | null
    visibility?: "DEPARTMENT" | "CAMPUS" | "SYSTEM" | "GROUP"
    groupId?: string | null
    targetStatus?: "DRAFT" | "PENDING_REVIEW"
    submitForReview?: boolean
    changelog?: string
    creationSource?: "FORM" | "AI_ASSISTED" | "PACKAGE_UPLOAD" | "SSM_DATA_GROUNDED"
    creationMode?: string
    evidenceBriefId?: string | null
    departmentSessionMeta?: {
      sessionTitle?: string
      sessionType?: string
      sessionDate?: string
      participatingTeachers?: SkillCollaboratorItem[]
      testedClassesSummary?: string
      classroomObservations?: string
      agreedAdjustments?: string
    } | null
  }
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const resolvedId = input.id || input.skillId
  const rawName = input.name || input.title || ""
  const rawPurpose = input.purpose || input.summary || input.description || ""
  const rawPrompt = input.aiSystemPrompt || input.aiInstruction || ""
  const rawTopic = input.topicOrLesson || input.topicName || ""
  const resolvedSubjectCode =
    input.subjectCode ||
    (Array.isArray(input.subjectCodes) && input.subjectCodes[0]) ||
    ctx.mainSubjectCode ||
    "TOAN"

  // VII. Quét và ẩn danh PII học sinh trên mọi trường văn bản công khai của Skill
  const cleanName = detectAndRedactStudentPii(sanitizeRichText(rawName)).redactedText
  const cleanPurpose = detectAndRedactStudentPii(sanitizeRichText(rawPurpose)).redactedText
  const cleanDescription = detectAndRedactStudentPii(
    sanitizeRichText(input.description || rawPurpose)
  ).redactedText
  const cleanSummary = detectAndRedactStudentPii(
    sanitizeRichText(input.summary || cleanPurpose.slice(0, 200))
  ).redactedText
  const cleanAiPrompt = detectAndRedactStudentPii(
    sanitizeRichText(rawPrompt)
  ).redactedText
  const cleanSamplePrompt = detectAndRedactStudentPii(
    sanitizeRichText(input.samplePrompt)
  ).redactedText
  const cleanSampleOutput = detectAndRedactStudentPii(
    sanitizeRichText(input.sampleOutput)
  ).redactedText
  const cleanPrerequisites = detectAndRedactStudentPii(
    sanitizeRichText(input.prerequisites || (input as any).usageConditions)
  ).redactedText
  const cleanPrinciples = detectAndRedactStudentPii(
    sanitizeRichText(input.principlesAndLimits)
  ).redactedText
  const cleanOutputStruct = detectAndRedactStudentPii(
    sanitizeRichText(input.outputStructure)
  ).redactedText
  const cleanEvalCriteria = detectAndRedactStudentPii(
    sanitizeRichText(input.evaluationCriteria || (input as any).validationCriteria)
  ).redactedText
  const cleanUsageGuide = detectAndRedactStudentPii(
    sanitizeRichText(input.usageGuide)
  ).redactedText
  const cleanTopic = detectAndRedactStudentPii(
    sanitizeRichText(rawTopic)
  ).redactedText

  if (!cleanName || !cleanPurpose || !cleanAiPrompt) {
    throw new Error(
      "Vui lòng nhập đầy đủ Tên skill, Mục đích sư phạm và Hướng dẫn AI (System Prompt)."
    )
  }

  if (input.externalUrl && input.externalUrl.trim()) {
    const urlCheck = validateSafeExternalUrl(input.externalUrl.trim(), { requireHttps: true })
    if (!urlCheck.valid) {
      throw new Error(urlCheck.error || "Liên kết ngoài của Skill không hợp lệ.")
    }
  }

  const visibility = input.visibility || "SYSTEM"
  const targetStatus =
    input.targetStatus || (input.submitForReview ? "PENDING_REVIEW" : "DRAFT")
  const gradeLevelsJson = JSON.stringify(input.gradeLevels || [])
  const tagsJson = JSON.stringify(input.tags || [])
  const collaboratorsJson = JSON.stringify(input.collaborators || [])
  const inputFieldsJson = JSON.stringify(
    input.inputFields || (input as any).inputSchema || []
  )
  const workflowStepsJson = JSON.stringify(
    input.workflowSteps || (input as any).workflowProcess || []
  )
  const referencesJson = JSON.stringify(
    input.references || (input as any).referenceDocs || []
  )
  const compatiblePlatformsJson = JSON.stringify(
    input.compatiblePlatforms || ["SSM_INTERNAL", "GEMINI", "CHATGPT"]
  )
  const packageMetaJson = JSON.stringify(input.packageMeta || {})

  // Resolve parent skill if forking/improving an existing skill
  let parentSkillId = input.parentSkillId || null
  let originalAuthorId: string | null = null
  let originalAuthorName: string | null = null
  if (parentSkillId) {
    const parentSkill = await pAny.slcSkill
      ?.findUnique({ where: { id: parentSkillId } })
      .catch(() => null)
    if (parentSkill) {
      originalAuthorId = parentSkill.originalAuthorId || parentSkill.authorId
      originalAuthorName = parentSkill.originalAuthorName || parentSkill.authorName
    }
  }

  const buildSnapshotPayload = (versionStr: string) => ({
    name: cleanName,
    summary: cleanSummary,
    description: cleanDescription,
    purpose: cleanPurpose,
    workCategory: input.workCategory || "ACTIVITY_DESIGN",
    subjectCode: resolvedSubjectCode,
    subjectName: input.subjectName || ctx.mainSubjectName || "Toán",
    gradeLevelsJson,
    topicOrLesson: cleanTopic || null,
    tagsJson,
    collaboratorsJson,
    prerequisites: cleanPrerequisites || null,
    inputFieldsJson,
    aiSystemPrompt: cleanAiPrompt,
    workflowStepsJson,
    principlesAndLimits: cleanPrinciples || null,
    outputStructure: cleanOutputStruct || null,
    evaluationCriteria: cleanEvalCriteria || null,
    referencesJson,
    samplePrompt: cleanSamplePrompt || null,
    sampleOutput: cleanSampleOutput || null,
    compatiblePlatformsJson,
    usageGuide: cleanUsageGuide || null,
    isExecutableOnSsm: Boolean(input.isExecutableOnSsm ?? true),
    packageAttachmentId: input.packageAttachmentId || null,
    packageMetaJson,
    externalUrl: input.externalUrl?.trim() || null,
    currentVersion: versionStr,
  })

  // Case A: Updating existing skill
  if (resolvedId) {
    const existing = await pAny.slcSkill.findUnique({ where: { id: resolvedId } })
    if (!existing) {
      throw new Error("Không tìm thấy Skill môn học cần cập nhật.")
    }
    const existingCollabItems = safeJsonParse<SkillCollaboratorItem[]>(
      existing.collaboratorsJson,
      []
    )
    const existingCollabs = existingCollabItems.map((c) => c.userId)
    const isSameDeptOrSubject =
      Boolean(input.departmentSessionMeta) &&
      (Boolean(ctx.departmentId && existing.departmentId && ctx.departmentId === existing.departmentId) ||
        Boolean(ctx.mainSubjectCode && existing.subjectCode && ctx.mainSubjectCode === existing.subjectCode) ||
        Boolean(ctx.isDepartmentHead))

    if (
      existing.authorId !== ctx.userId &&
      !existingCollabs.includes(ctx.userId) &&
      !isSameDeptOrSubject &&
      !isSuperOrCommunityAdmin(ctx)
    ) {
      throw new Error("PERMISSION_DENIED: Chỉ tác giả, đồng tác giả hoặc giáo viên cùng Tổ chuyên môn (trong phiên làm việc chuyên môn) mới có quyền cập nhật Skill này.")
    }

    // Merge collaborators from existing + input + departmentSessionMeta
    const mergedCollabMap = new Map<string, SkillCollaboratorItem>()
    for (const c of existingCollabItems) {
      if (c?.userId && c.userId !== existing.authorId) {
        mergedCollabMap.set(c.userId, c)
      }
    }
    for (const c of input.collaborators || []) {
      if (c?.userId && c.userId !== existing.authorId) {
        mergedCollabMap.set(c.userId, c)
      }
    }
    if (input.departmentSessionMeta) {
      if (ctx.userId !== existing.authorId) {
        mergedCollabMap.set(ctx.userId, {
          userId: ctx.userId,
          name: ctx.fullName,
          role: "Đồng đóng góp phiên làm việc Tổ chuyên môn",
        })
      }
      for (const pt of input.departmentSessionMeta.participatingTeachers || []) {
        if (pt?.userId && pt.userId !== existing.authorId) {
          mergedCollabMap.set(pt.userId, {
            userId: pt.userId,
            name: sanitizeRichText(pt.name),
            role: pt.role || "GV tham gia phiên làm việc Tổ chuyên môn",
          })
        }
      }
    }
    const mergedCollaboratorsJson = JSON.stringify(Array.from(mergedCollabMap.values()))

    const wasPublished =
      existing.status === "PUBLISHED" || Boolean(existing.publishedVersionId)
    const shouldBumpVersion = wasPublished || Boolean(input.departmentSessionMeta)
    const nextVersion = shouldBumpVersion
      ? parseVersionNext(existing.currentVersion)
      : existing.currentVersion || "1.0"

    const sanitizedSessionMeta = input.departmentSessionMeta
      ? {
          sessionId: `ses_${Date.now().toString(36)}`,
          sessionTitle: detectAndRedactStudentPii(
            sanitizeRichText(
              input.departmentSessionMeta.sessionTitle ||
                `Phiên làm việc Tổ chuyên môn — Cập nhật v${nextVersion}`
            )
          ).redactedText,
          sessionType: input.departmentSessionMeta.sessionType || "SHCM_DINH_KY",
          sessionDate: input.departmentSessionMeta.sessionDate || new Date().toISOString(),
          recordedById: ctx.userId,
          recordedByName: ctx.fullName,
          participatingTeachers: Array.from(mergedCollabMap.values()),
          testedClassesSummary: detectAndRedactStudentPii(
            sanitizeRichText(input.departmentSessionMeta.testedClassesSummary || "")
          ).redactedText,
          classroomObservations: detectAndRedactStudentPii(
            sanitizeRichText(input.departmentSessionMeta.classroomObservations || "")
          ).redactedText,
          agreedAdjustments: detectAndRedactStudentPii(
            sanitizeRichText(input.departmentSessionMeta.agreedAdjustments || "")
          ).redactedText,
          evidenceBriefId: input.evidenceBriefId || null,
        }
      : null

    const snapshotObj = {
      ...buildSnapshotPayload(nextVersion),
      collaboratorsJson: mergedCollaboratorsJson,
      ...(sanitizedSessionMeta ? { departmentSessionMeta: sanitizedSessionMeta } : {}),
    }
    const changelogText =
      sanitizeRichText(input.changelog) ||
      (sanitizedSessionMeta
        ? `[${sanitizedSessionMeta.sessionTitle}] ${
            sanitizedSessionMeta.agreedAdjustments ||
            sanitizedSessionMeta.classroomObservations ||
            `Cập nhật phiên bản v${nextVersion} từ phiên làm việc Tổ chuyên môn`
          }`
        : wasPublished
          ? `Cập nhật phiên bản mới v${nextVersion} (bản đang phát hành vẫn tiếp tục hoạt động cho đến khi bản mới được duyệt)`
          : "Cập nhật nội dung bản nháp Skill")

    const newVerRecord = await pAny.slcSkillVersion.create({
      data: {
        skillId: existing.id,
        version: nextVersion,
        changelog: changelogText,
        snapshotJson: JSON.stringify(snapshotObj),
        status: targetStatus,
        createdById: ctx.userId,
        createdByName: ctx.fullName,
      },
    })

    const { departmentSessionMeta: _omittedMeta, ...dbSkillUpdateFields } = snapshotObj

    const updatedSkill = await pAny.slcSkill.update({
      where: { id: existing.id },
      data: {
        ...dbSkillUpdateFields,
        visibility,
        groupId: visibility === "GROUP" ? input.groupId : null,
        status: targetStatus,
        ...(input.evidenceBriefId ? { evidenceBriefId: input.evidenceBriefId } : {}),
        // Keep publishedVersionId intact if it was already published!
        publishedVersionId: existing.publishedVersionId,
      },
    })

    await recordSlcAuditLog(ctx, "UPDATE_SKILL", "SKILL", updatedSkill.id, {
      version: nextVersion,
      status: targetStatus,
      keptActivePublishedVersionId: existing.publishedVersionId,
      fromDepartmentSession: Boolean(sanitizedSessionMeta),
    })

    return {
      skill: updatedSkill,
      versionRecord: newVerRecord,
    }
  }

  // Case B: Creating new skill
  const code = `SKL-${(input.subjectCode || "GEN").toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`
  const initialVersion = "1.0"
  const snapshotObj = buildSnapshotPayload(initialVersion)

  const createdSkill = await pAny.slcSkill.create({
    data: {
      code,
      parentSkillId,
      originalAuthorId,
      originalAuthorName,
      authorId: ctx.userId,
      authorName: ctx.fullName,
      campusId: ctx.campusId,
      campusName: ctx.campusName || "Hệ thống Sky-Line",
      departmentId: ctx.departmentId || null,
      departmentName: ctx.departmentName || null,
      ...snapshotObj,
      visibility,
      groupId: visibility === "GROUP" ? input.groupId : null,
      status: targetStatus,
      creationSource: input.creationSource || (input.evidenceBriefId ? "SSM_DATA_GROUNDED" : "FORM"),
      evidenceBriefId: input.evidenceBriefId || null,
    },
  })

  const verRecord = await pAny.slcSkillVersion.create({
    data: {
      skillId: createdSkill.id,
      version: initialVersion,
      changelog: sanitizeRichText(input.changelog) || "Khởi tạo phiên bản 1.0",
      snapshotJson: JSON.stringify(snapshotObj),
      status: targetStatus,
      createdById: ctx.userId,
      createdByName: ctx.fullName,
    },
  })

  await recordSlcAuditLog(ctx, "CREATE_SKILL", "SKILL", createdSkill.id, {
    code,
    status: targetStatus,
    creationSource: createdSkill.creationSource,
    parentSkillId,
  })

  return {
    skill: createdSkill,
    versionRecord: verRecord,
  }
}

export const DEPARTMENT_SESSION_TYPES: Record<string, string> = {
  SHCM_DINH_KY: "Sinh hoạt Tổ chuyên môn định kỳ",
  DAY_THU_NGHIEM: "Rút kinh nghiệm sau tiết dạy thử nghiệm",
  LIEN_LOP_CUNG_KHOI: "Đối sánh & điều chỉnh liên lớp cùng khối",
  CHUAN_HOA_HOC_LIEU: "Chuẩn hóa học liệu & Rubric Tổ chuyên môn",
}

/**
 * Quá trình cập nhật & nâng cấp Skill từ các phiên làm việc của GV Tổ chuyên môn:
 * - Cho phép tác giả, đồng đóng góp, TTCM/QLCM hoặc giáo viên cùng Tổ chuyên môn / cùng môn học
 *   ghi nhận biên bản phiên làm việc chuyên môn và phát hành bản cập nhật mới (v1.1, v1.2, v2.0...).
 * - Tự động gộp danh sách giáo viên tham gia phiên làm việc vào collaboratorsJson.
 * - Tự động tổng hợp các điều chỉnh thống nhất của Tổ chuyên môn vào Hướng dẫn AI (System Prompt),
 *   Cấu trúc đầu ra & Quy trình thực hiện (hoặc dùng nội dung đã chỉnh sửa trực tiếp).
 * - Lưu đầy đủ metadata phiên làm việc (departmentSessionMeta) vào SlcSkillVersion.snapshotJson
 *   và giữ nguyên publishedVersionId đang hoạt động cho đến khi bản mới được duyệt (hoặc phát hành ngay nếu người cập nhật có quyền duyệt và chọn phát hành).
 */
export async function submitDepartmentSessionSkillUpdate(
  ctx: SlcUserContext,
  input: {
    skillId: string
    sessionTitle: string
    sessionType?: "SHCM_DINH_KY" | "DAY_THU_NGHIEM" | "LIEN_LOP_CUNG_KHOI" | "CHUAN_HOA_HOC_LIEU" | string
    sessionDate?: string
    participatingTeachers?: SkillCollaboratorItem[]
    testedClassesSummary?: string
    classroomObservations?: string
    agreedAdjustments: string
    updatedAiSystemPrompt?: string
    updatedOutputStructure?: string
    updatedSampleOutput?: string
    updatedPrerequisites?: string
    updatedEvaluationCriteria?: string
    majorBump?: boolean
    submitMode?: "DRAFT" | "PENDING_REVIEW" | "PUBLISH_NOW"
    evidenceBriefId?: string | null
  }
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const existing = await pAny.slcSkill.findUnique({ where: { id: input.skillId } })
  if (!existing) {
    throw new Error("Không tìm thấy Skill môn học cần cập nhật từ phiên làm việc Tổ chuyên môn.")
  }

  const existingCollabItems = safeJsonParse<SkillCollaboratorItem[]>(
    existing.collaboratorsJson,
    []
  )
  const existingCollabIds = existingCollabItems.map((c) => c.userId)
  const isSameDeptOrSubject =
    Boolean(ctx.departmentId && existing.departmentId && ctx.departmentId === existing.departmentId) ||
    Boolean(ctx.mainSubjectCode && existing.subjectCode && ctx.mainSubjectCode === existing.subjectCode) ||
    Boolean(
      Array.isArray((ctx as any).assignedSubjectCodes) &&
        (ctx as any).assignedSubjectCodes.includes(existing.subjectCode)
    )
  const reviewPerm = canReviewSkill(ctx, {
    id: existing.id,
    authorId: existing.authorId,
    collaboratorIds: existingCollabIds,
    status: existing.status,
    publishedVersionId: existing.publishedVersionId,
    visibility: existing.visibility,
    campusId: existing.campusId,
    departmentId: existing.departmentId,
    subjectCode: existing.subjectCode,
    groupId: existing.groupId,
    assignedReviewerId: existing.assignedReviewerId,
  })

  if (
    existing.authorId !== ctx.userId &&
    !existingCollabIds.includes(ctx.userId) &&
    !isSameDeptOrSubject &&
    !reviewPerm.allowed &&
    !isSuperOrCommunityAdmin(ctx)
  ) {
    throw new Error(
      "PERMISSION_DENIED: Chỉ giáo viên cùng Tổ chuyên môn / cùng bộ môn, tác giả hoặc cán bộ duyệt chuyên môn mới có quyền cập nhật Skill từ phiên làm việc Tổ chuyên môn."
    )
  }

  const cleanSessionTitle = detectAndRedactStudentPii(
    sanitizeRichText(input.sessionTitle || "")
  ).redactedText.trim()
  const cleanAgreedAdjustments = detectAndRedactStudentPii(
    sanitizeRichText(input.agreedAdjustments || "")
  ).redactedText.trim()
  const cleanObservations = detectAndRedactStudentPii(
    sanitizeRichText(input.classroomObservations || "")
  ).redactedText.trim()
  const cleanTestedClasses = detectAndRedactStudentPii(
    sanitizeRichText(input.testedClassesSummary || "")
  ).redactedText.trim()

  if (!cleanSessionTitle || !cleanAgreedAdjustments) {
    throw new Error(
      "Vui lòng nhập Tên phiên làm việc Tổ chuyên môn và Nội dung thống nhất điều chỉnh/cập nhật Skill."
    )
  }

  const nextVersion = parseVersionNext(existing.currentVersion, Boolean(input.majorBump))
  const sessionType = input.sessionType || "SHCM_DINH_KY"
  const sessionTypeLabel =
    DEPARTMENT_SESSION_TYPES[sessionType] || "Phiên làm việc Tổ chuyên môn"

  // Merge participating teachers into collaborators list
  const mergedCollabMap = new Map<string, SkillCollaboratorItem>()
  for (const c of existingCollabItems) {
    if (c?.userId && c.userId !== existing.authorId) {
      mergedCollabMap.set(c.userId, c)
    }
  }
  if (ctx.userId !== existing.authorId) {
    mergedCollabMap.set(ctx.userId, {
      userId: ctx.userId,
      name: ctx.fullName,
      role: `Cập nhật phiên làm việc v${nextVersion}`,
    })
  }
  for (const pt of input.participatingTeachers || []) {
    if (pt?.userId && pt.userId !== existing.authorId) {
      mergedCollabMap.set(pt.userId, {
        userId: pt.userId,
        name: sanitizeRichText(pt.name),
        role: pt.role || `Tham gia ${sessionTypeLabel} (v${nextVersion})`,
      })
    }
  }
  const mergedCollaborators = Array.from(mergedCollabMap.values())
  const mergedCollaboratorsJson = JSON.stringify(mergedCollaborators)

  // Evolve AI System Prompt, Output Structure, Workflow Steps, and Sample Output
  const basePrompt = String(existing.aiSystemPrompt || "").trim()
  const evolvedAiPrompt = input.updatedAiSystemPrompt?.trim()
    ? detectAndRedactStudentPii(sanitizeRichText(input.updatedAiSystemPrompt)).redactedText
    : `${basePrompt}\n\n[CẬP NHẬT TỪ PHIÊN LÀM VIỆC TỔ CHUYÊN MÔN v${nextVersion} — ${cleanSessionTitle}]:\n- Thống nhất điều chỉnh sư phạm: ${cleanAgreedAdjustments}${
        cleanObservations ? `\n- Lưu ý thực tế từ lớp dạy thực nghiệm: ${cleanObservations}` : ""
      }`

  const evolvedOutputStructure = input.updatedOutputStructure?.trim()
    ? detectAndRedactStudentPii(sanitizeRichText(input.updatedOutputStructure)).redactedText
    : existing.outputStructure || ""

  const evolvedSampleOutput = input.updatedSampleOutput?.trim()
    ? detectAndRedactStudentPii(sanitizeRichText(input.updatedSampleOutput)).redactedText
    : existing.sampleOutput || ""

  const evolvedPrerequisites = input.updatedPrerequisites?.trim()
    ? detectAndRedactStudentPii(sanitizeRichText(input.updatedPrerequisites)).redactedText
    : existing.prerequisites || ""

  const evolvedEvalCriteria = input.updatedEvaluationCriteria?.trim()
    ? detectAndRedactStudentPii(sanitizeRichText(input.updatedEvaluationCriteria)).redactedText
    : existing.evaluationCriteria || ""

  const existingWorkflowSteps = safeJsonParse<string[]>(existing.workflowStepsJson, [])
  const evolvedWorkflowSteps = [
    ...existingWorkflowSteps.filter((s) => !s.startsWith(`[Cập nhật v`)),
    `[Cập nhật v${nextVersion} - ${sessionTypeLabel}]: ${cleanAgreedAdjustments}`,
  ]
  const workflowStepsJson = JSON.stringify(evolvedWorkflowSteps)

  const departmentSessionMeta = {
    sessionId: `ses_${Date.now().toString(36)}`,
    sessionTitle: cleanSessionTitle,
    sessionType,
    sessionTypeLabel,
    sessionDate: input.sessionDate || new Date().toISOString(),
    recordedById: ctx.userId,
    recordedByName: ctx.fullName,
    participatingTeachers: [
      { userId: ctx.userId, name: ctx.fullName, role: "Người ghi nhận phiên làm việc" },
      ...(input.participatingTeachers || []).filter((p) => p.userId !== ctx.userId),
    ],
    testedClassesSummary: cleanTestedClasses,
    classroomObservations: cleanObservations,
    agreedAdjustments: cleanAgreedAdjustments,
    evidenceBriefId: input.evidenceBriefId || null,
  }

  const canPublishDirectly = reviewPerm.allowed || isSuperOrCommunityAdmin(ctx)
  const requestedMode = input.submitMode || "PENDING_REVIEW"
  const finalStatus =
    requestedMode === "PUBLISH_NOW" && canPublishDirectly
      ? "PUBLISHED"
      : requestedMode === "DRAFT"
        ? "DRAFT"
        : "PENDING_REVIEW"

  const snapshotObj = {
    name: existing.name,
    summary: existing.summary,
    description: existing.description,
    purpose: existing.purpose,
    workCategory: existing.workCategory,
    subjectCode: existing.subjectCode,
    subjectName: existing.subjectName,
    gradeLevelsJson: existing.gradeLevelsJson,
    topicOrLesson: existing.topicOrLesson,
    tagsJson: existing.tagsJson,
    collaboratorsJson: mergedCollaboratorsJson,
    prerequisites: evolvedPrerequisites,
    inputFieldsJson: existing.inputFieldsJson,
    aiSystemPrompt: evolvedAiPrompt,
    workflowStepsJson,
    principlesAndLimits: existing.principlesAndLimits,
    outputStructure: evolvedOutputStructure,
    evaluationCriteria: evolvedEvalCriteria,
    referencesJson: existing.referencesJson,
    samplePrompt: existing.samplePrompt,
    sampleOutput: evolvedSampleOutput,
    compatiblePlatformsJson: existing.compatiblePlatformsJson,
    usageGuide: existing.usageGuide,
    isExecutableOnSsm: Boolean(existing.isExecutableOnSsm),
    packageAttachmentId: existing.packageAttachmentId,
    packageMetaJson: existing.packageMetaJson,
    externalUrl: existing.externalUrl,
    currentVersion: nextVersion,
    departmentSessionMeta,
  }

  const changelogText = `[${sessionTypeLabel}] ${cleanSessionTitle} — ${cleanAgreedAdjustments}`

  const newVerRecord = await pAny.slcSkillVersion.create({
    data: {
      skillId: existing.id,
      version: nextVersion,
      changelog: changelogText,
      snapshotJson: JSON.stringify(snapshotObj),
      status: finalStatus,
      reviewerId: finalStatus === "PUBLISHED" ? ctx.userId : null,
      reviewerName: finalStatus === "PUBLISHED" ? ctx.fullName : null,
      reviewedAt: finalStatus === "PUBLISHED" ? new Date() : null,
      createdById: ctx.userId,
      createdByName: ctx.fullName,
    },
  })

  const { departmentSessionMeta: _omitted, ...skillUpdateData } = snapshotObj

  const updatedSkill = await pAny.slcSkill.update({
    where: { id: existing.id },
    data: {
      ...skillUpdateData,
      status: finalStatus,
      ...(input.evidenceBriefId ? { evidenceBriefId: input.evidenceBriefId } : {}),
      // Preserve active publishedVersionId unless this update is immediately published by an authorized reviewer
      publishedVersionId:
        finalStatus === "PUBLISHED" ? newVerRecord.id : existing.publishedVersionId,
      ...(finalStatus === "PUBLISHED"
        ? {
            reviewedById: ctx.userId,
            reviewedByName: ctx.fullName,
            reviewedAt: new Date(),
            publishedAt: existing.publishedAt || new Date(),
          }
        : {}),
    },
  })

  if (existing.authorId !== ctx.userId) {
    await dispatchSlcNotification({
      idempotencyKey: `dept_ses_upd:${existing.id}:${newVerRecord.id}`,
      recipientId: existing.authorId,
      actorId: ctx.userId,
      eventType: "MODERATION_NOTICE",
      targetType: "SKILL",
      targetId: existing.id,
      title: `Cập nhật Skill v${nextVersion} từ phiên làm việc Tổ chuyên môn`,
      message: `${ctx.fullName} cùng Tổ chuyên môn vừa cập nhật phiên bản v${nextVersion} cho Skill "${existing.name}" (${cleanSessionTitle}).`,
      deepLink: `/teacher/skyline-connect?tab=SKILLS_REPOSITORY&skillId=${existing.id}`,
    }).catch(() => null)
  }

  await recordSlcAuditLog(ctx, "DEPARTMENT_SESSION_SKILL_UPDATE", "SKILL", existing.id, {
    version: nextVersion,
    sessionTitle: cleanSessionTitle,
    sessionType,
    status: finalStatus,
    keptActivePublishedVersionId: existing.publishedVersionId,
  })

  return {
    skill: updatedSkill,
    versionRecord: newVerRecord,
    departmentSessionMeta,
  }
}

/**
 * VIII. Quy trình Duyệt, Phát hành, Lưu trữ, Xóa mềm/Khôi phục và Quay về bản đã duyệt (Rollback) cho Skill môn học:
 * Trạng thái: DRAFT → PENDING_REVIEW → NEEDS_REVISION / APPROVED → PUBLISHED → ARCHIVED.
 * Khi phát hành (PUBLISHED):
 * - Cập nhật publishedVersionId sang bản vừa phát hành.
 * - Tự động tạo hoặc cập nhật 1 bài giới thiệu duy nhất trên Tường chia sẻ (linkedSkillId / postId)
 *   để dùng liên kết chung, tránh nhân đôi nội dung và phản hồi.
 */
export async function reviewAndManageSlcSkill(
  ctx: SlcUserContext,
  input: {
    skillId: string
    action:
      | "SUBMIT_REVIEW"
      | "ASSIGN_REVIEWER"
      | "REQUEST_REVISION"
      | "APPROVE"
      | "PUBLISH"
      | "ARCHIVE"
      | "SOFT_DELETE"
      | "RESTORE"
      | "ROLLBACK_VERSION"
    reviewNote?: string
    assignedReviewerId?: string
    assignedReviewerName?: string
    targetVersionId?: string
  }
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  const skill = await pAny.slcSkill.findUnique({ where: { id: input.skillId } })
  if (!skill) {
    throw new Error("Không tìm thấy Skill môn học.")
  }

  const collabs = safeJsonParse<SkillCollaboratorItem[]>(skill.collaboratorsJson, []).map(
    (c) => c.userId
  )
  const isAuthorOrCollab = skill.authorId === ctx.userId || collabs.includes(ctx.userId)

  if (input.action === "SUBMIT_REVIEW") {
    if (!isAuthorOrCollab && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Chỉ tác giả hoặc đồng tác giả mới có quyền gửi duyệt Skill.")
    }
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: { status: "PENDING_REVIEW" },
    })
    const latestVer = await pAny.slcSkillVersion.findFirst({
      where: { skillId: skill.id },
      orderBy: { createdAt: "desc" },
    })
    if (latestVer) {
      await pAny.slcSkillVersion.update({
        where: { id: latestVer.id },
        data: { status: "PENDING_REVIEW" },
      })
    }
    await recordSlcAuditLog(ctx, "SUBMIT_SKILL_FOR_REVIEW", "SKILL", skill.id, {
      version: skill.currentVersion,
    })
    return updated
  }

  if (input.action === "SOFT_DELETE" || input.action === "RESTORE") {
    if (
      !canRestoreOrDeletePostOrSkill(ctx, {
        authorId: skill.authorId,
        campusId: skill.campusId,
        departmentId: skill.departmentId,
      })
    ) {
      throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền xóa hoặc khôi phục Skill này.")
    }
    if (input.action === "SOFT_DELETE") {
      const updated = await pAny.slcSkill.update({
        where: { id: skill.id },
        data: {
          previousStatus: skill.status !== "DELETED" ? skill.status : skill.previousStatus || "DRAFT",
          status: "DELETED",
          deletedAt: new Date(),
          deletedById: ctx.userId,
        },
      })
      if (skill.postId) {
        await pAny.slcPost
          .update({
            where: { id: skill.postId },
            data: { status: "DELETED", deletedAt: new Date(), deletedById: ctx.userId },
          })
          .catch(() => null)
      }
      await recordSlcAuditLog(ctx, "SOFT_DELETE_SKILL", "SKILL", skill.id, {})
      return updated
    } else {
      const restoredStatus = skill.previousStatus || "DRAFT"
      const updated = await pAny.slcSkill.update({
        where: { id: skill.id },
        data: {
          status: restoredStatus,
          deletedAt: null,
          deletedById: null,
        },
      })
      if (skill.postId && restoredStatus === "PUBLISHED") {
        await pAny.slcPost
          .update({
            where: { id: skill.postId },
            data: { status: "PUBLISHED", deletedAt: null, deletedById: null },
          })
          .catch(() => null)
      }
      await recordSlcAuditLog(ctx, "RESTORE_SKILL", "SKILL", skill.id, { restoredStatus })
      return updated
    }
  }

  // All review & governance actions below require reviewer / manager permission
  const reviewCheck = canReviewSkill(ctx, {
    id: skill.id,
    authorId: skill.authorId,
    collaboratorIds: collabs,
    status: skill.status,
    publishedVersionId: skill.publishedVersionId,
    visibility: skill.visibility,
    campusId: skill.campusId,
    departmentId: skill.departmentId,
    subjectCode: skill.subjectCode,
    groupId: skill.groupId,
    assignedReviewerId: skill.assignedReviewerId,
  })

  if (input.action === "ROLLBACK_VERSION") {
    if (!isAuthorOrCollab && !reviewCheck.allowed && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("PERMISSION_DENIED: Không có quyền quay về phiên bản trước của Skill này.")
    }
    if (!input.targetVersionId) {
      throw new Error("Vui lòng chọn phiên bản đã duyệt cần khôi phục.")
    }
    const targetVer = await pAny.slcSkillVersion.findUnique({
      where: { id: input.targetVersionId },
    })
    if (!targetVer || targetVer.skillId !== skill.id) {
      throw new Error("Không tìm thấy phiên bản cần quay về.")
    }
    if (!["APPROVED", "PUBLISHED"].includes(targetVer.status) && !isSuperOrCommunityAdmin(ctx)) {
      throw new Error("Chỉ được phép quay về phiên bản đã được duyệt (APPROVED) hoặc đã phát hành (PUBLISHED).")
    }

    const snap = safeJsonParse<Record<string, any>>(targetVer.snapshotJson, {})
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        ...snap,
        currentVersion: targetVer.version,
        publishedVersionId: targetVer.id,
        status: "PUBLISHED",
      },
    })

    await recordSlcAuditLog(ctx, "ROLLBACK_SKILL_VERSION", "SKILL", skill.id, {
      rolledBackToVersion: targetVer.version,
      versionId: targetVer.id,
    })

    return updated
  }

  if (!reviewCheck.allowed) {
    throw new Error(`PERMISSION_DENIED: ${reviewCheck.reason || "Không có quyền duyệt Skill này."}`)
  }

  if (input.action === "ASSIGN_REVIEWER") {
    if (!input.assignedReviewerId) {
      throw new Error("Vui lòng chọn người duyệt chuyên môn.")
    }
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        assignedReviewerId: input.assignedReviewerId,
        assignedReviewerName: sanitizeRichText(input.assignedReviewerName || "Người duyệt chuyên môn"),
      },
    })
    await recordSlcAuditLog(ctx, "ASSIGN_SKILL_REVIEWER", "SKILL", skill.id, {
      assignedReviewerId: input.assignedReviewerId,
      assignedReviewerName: input.assignedReviewerName,
    })
    return updated
  }

  const cleanNote = sanitizeRichText(input.reviewNote || "")
  const latestVer = await pAny.slcSkillVersion.findFirst({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
  })

  if (input.action === "REQUEST_REVISION") {
    if (!cleanNote) {
      throw new Error("Vui lòng nhập nhận xét góp ý chỉnh sửa cho tác giả.")
    }
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        status: "NEEDS_REVISION",
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
        reviewNote: cleanNote,
        reviewedAt: new Date(),
      },
    })
    if (latestVer) {
      await pAny.slcSkillVersion.update({
        where: { id: latestVer.id },
        data: {
          status: "NEEDS_REVISION",
          reviewerId: ctx.userId,
          reviewerName: ctx.fullName,
          reviewNote: cleanNote,
          reviewedAt: new Date(),
        },
      })
    }
    await dispatchSlcNotification({
      idempotencyKey: `skill_rev_req:${skill.id}:${Date.now()}`,
      recipientId: skill.authorId,
      actorId: ctx.userId,
      eventType: "MODERATION_NOTICE",
      targetType: "SKILL",
      targetId: skill.id,
      title: "Góp ý hoàn thiện Skill môn học",
      message: `${ctx.fullName} đề nghị chỉnh sửa Skill "${skill.name}": ${cleanNote}`,
      deepLink: `/teacher/skyline-connect?tab=MY_CONTRIBUTIONS&skillId=${skill.id}`,
    })
    await recordSlcAuditLog(ctx, "SKILL_REQUEST_REVISION", "SKILL", skill.id, {
      reviewNote: cleanNote,
    })
    return updated
  }

  if (input.action === "APPROVE") {
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        status: "APPROVED",
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
        reviewNote: cleanNote || "Đạt chuẩn chuyên môn, sẵn sàng phát hành.",
        reviewedAt: new Date(),
      },
    })
    if (latestVer) {
      await pAny.slcSkillVersion.update({
        where: { id: latestVer.id },
        data: {
          status: "APPROVED",
          reviewerId: ctx.userId,
          reviewerName: ctx.fullName,
          reviewNote: cleanNote || "Đã duyệt chuyên môn",
          reviewedAt: new Date(),
        },
      })
    }
    await recordSlcAuditLog(ctx, "SKILL_APPROVE", "SKILL", skill.id, {
      version: skill.currentVersion,
      reviewNote: cleanNote,
    })
    return updated
  }

  if (input.action === "PUBLISH") {
    let publishedVerId = latestVer?.id || skill.publishedVersionId || null
    if (latestVer) {
      await pAny.slcSkillVersion.update({
        where: { id: latestVer.id },
        data: {
          status: "PUBLISHED",
          reviewerId: ctx.userId,
          reviewerName: ctx.fullName,
          reviewNote: cleanNote || "Đã duyệt và phát hành chính thức.",
          reviewedAt: new Date(),
        },
      })
    }

    // VIII: "Khi phát hành, skill có bài giới thiệu trên tường. Dùng liên kết chung để tránh nhân đôi nội dung và phản hồi."
    let linkedPostId = skill.postId || null
    const wallPostContent = [
      `🎯 **Mục đích:** ${skill.purpose}`,
      skill.description,
      skill.topicOrLesson ? `📚 **Bài/Chủ đề:** ${skill.topicOrLesson}` : "",
      `✨ **Phiên bản phát hành:** v${skill.currentVersion}`,
    ]
      .filter(Boolean)
      .join("\n\n")

    if (linkedPostId) {
      await pAny.slcPost
        .update({
          where: { id: linkedPostId },
          data: {
            title: skill.name,
            summary: skill.summary,
            content: wallPostContent,
            visibility: skill.visibility,
            departmentId: skill.departmentId,
            departmentName: skill.departmentName,
            groupId: skill.groupId,
            status: "PUBLISHED",
            subjectCodesJson: JSON.stringify([skill.subjectCode]),
            gradeLevelsJson: skill.gradeLevelsJson,
            tagsJson: skill.tagsJson,
            linkedSkillId: skill.id,
            lastBumpedAt: new Date(),
          },
        })
        .catch(() => null)
    } else {
      const introPost = await pAny.slcPost.create({
        data: {
          authorId: skill.authorId,
          authorName: skill.authorName,
          authorRole: `GV ${skill.subjectName}`,
          campusId: skill.campusId,
          campusName: skill.campusName || "Hệ thống Sky-Line",
          departmentId: skill.departmentId,
          departmentName: skill.departmentName,
          mainSubject: skill.subjectName,
          postType: "SKILL",
          title: skill.name,
          summary: skill.summary,
          content: wallPostContent,
          topicName: skill.topicOrLesson,
          visibility: skill.visibility,
          groupId: skill.groupId,
          status: "PUBLISHED",
          subjectCodesJson: JSON.stringify([skill.subjectCode]),
          gradeLevelsJson: skill.gradeLevelsJson,
          tagsJson: skill.tagsJson,
          linkedSkillId: skill.id,
          publishedAt: new Date(),
          lastBumpedAt: new Date(),
        },
      })
      linkedPostId = introPost.id
    }

    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        status: "PUBLISHED",
        publishedVersionId: publishedVerId,
        postId: linkedPostId,
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
        reviewNote: cleanNote || "Đã phát hành lên Kho Skills môn học & Tường chia sẻ.",
        reviewedAt: new Date(),
        publishedAt: new Date(),
      },
    })

    await dispatchSlcNotification({
      idempotencyKey: `skill_published:${skill.id}:v${skill.currentVersion}`,
      recipientId: skill.authorId,
      actorId: ctx.userId,
      eventType: "MODERATION_NOTICE",
      targetType: "SKILL",
      targetId: skill.id,
      postId: linkedPostId,
      title: "Skill môn học đã được duyệt và phát hành",
      message: `Skill "${skill.name}" (v${skill.currentVersion}) đã được ${ctx.fullName} duyệt phát hành lên Kho Skills và Tường chia sẻ.`,
      deepLink: `/teacher/skyline-connect?tab=SKILLS_REPO&skillId=${skill.id}`,
    })

    await recordSlcAuditLog(ctx, "SKILL_PUBLISH", "SKILL", skill.id, {
      version: skill.currentVersion,
      publishedVersionId: publishedVerId,
      linkedPostId,
    })

    return updated
  }

  if (input.action === "ARCHIVE") {
    const updated = await pAny.slcSkill.update({
      where: { id: skill.id },
      data: {
        status: "ARCHIVED",
        reviewedById: ctx.userId,
        reviewedByName: ctx.fullName,
        reviewNote: cleanNote || "Đã chuyển vào lưu trữ.",
      },
    })
    if (skill.postId) {
      await pAny.slcPost
        .update({
          where: { id: skill.postId },
          data: { status: "ARCHIVED" },
        })
        .catch(() => null)
    }
    await recordSlcAuditLog(ctx, "SKILL_ARCHIVE", "SKILL", skill.id, { reviewNote: cleanNote })
    return updated
  }

  throw new Error("Thao tác duyệt/quản lý Skill không hợp lệ.")
}

/**
 * VI.6 & VII. Chạy thử / Thực thi Skill môn học trên SSM:
 * - Tách biệt hoàn toàn phương pháp của Skill với dữ liệu học sinh.
 * - Khi giáo viên khác dùng skill: kiểm tra lại quyền của người dùng hiện tại (verifyTeacherClassSubjectAccess),
 *   chỉ lấy dữ liệu lớp của người đang chạy, tuyệt đối KHÔNG kế thừa dữ liệu học sinh từ tác giả skill!
 * - Có chống gửi trùng qua clientRequestId, giới hạn tần suất (rate limit) và theo dõi token/chi phí AI.
 */
export async function executeSlcSkillRun(
  ctx: SlcUserContext,
  input: {
    skillId: string
    inputValues: Record<string, string>
    bindClassScope?: {
      academicYearId: string
      evaluationPeriod?: string
      classId: string
      subjectCode?: string
    } | null
    customPromptOverride?: string
    clientRequestId?: string
  }
) {
  await ensureSlcSchema()
  const pAny = getSlcDb()

  // 1. Idempotency check to prevent duplicate runs on double-click / retry
  const cleanClientReqId = input.clientRequestId?.trim() || null
  if (cleanClientReqId) {
    const existingRun = await pAny.slcSkillRun
      ?.findUnique({
        where: {
          runnerUserId_clientRequestId: {
            runnerUserId: ctx.userId,
            clientRequestId: cleanClientReqId,
          },
        },
      })
      .catch(() => null)
    if (existingRun) {
      return {
        run: existingRun,
        deduplicated: true,
        aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      }
    }
  }

  // 2. Rate limit check per teacher
  const rl = checkSlcRateLimit(`skill_run_${ctx.userId}`, 12, 60_000)
  if (!rl.allowed) {
    throw new Error(
      `RATE_LIMIT_EXCEEDED: Thầy/Cô đã gửi yêu cầu chạy thử liên tục. Vui lòng đợi ${rl.retryAfterSeconds || 15} giây trước khi chạy lại.`
    )
  }

  const rawSkill = await pAny.slcSkill.findUnique({ where: { id: input.skillId } })
  if (!rawSkill) {
    throw new Error("Không tìm thấy Skill môn học cần chạy.")
  }

  const collabs = safeJsonParse<SkillCollaboratorItem[]>(rawSkill.collaboratorsJson, []).map(
    (c) => c.userId
  )
  if (
    !canViewSkill(ctx, {
      id: rawSkill.id,
      authorId: rawSkill.authorId,
      collaboratorIds: collabs,
      status: rawSkill.status,
      publishedVersionId: rawSkill.publishedVersionId,
      visibility: rawSkill.visibility,
      campusId: rawSkill.campusId,
      departmentId: rawSkill.departmentId,
      subjectCode: rawSkill.subjectCode,
      groupId: rawSkill.groupId,
      assignedReviewerId: rawSkill.assignedReviewerId,
    })
  ) {
    throw new Error("PERMISSION_DENIED: Thầy/Cô không có quyền truy cập và chạy Skill này.")
  }

  // 3. CRITICAL RULE VII: When binding class data, verify CURRENT runner's permission and load ONLY CURRENT runner's class data!
  // Never inherit any class/student data from rawSkill.authorId or rawSkill.evidenceBriefId!
  let boundContextSummary: Record<string, any> = {
    boundMode: "MANUAL_INPUT_ONLY",
    runnerUserId: ctx.userId,
    runnerName: ctx.fullName,
    inheritedFromSkillAuthor: false,
  }

  if (input.bindClassScope && input.bindClassScope.classId) {
    const classPerm = await verifyTeacherClassSubjectAccess(ctx, {
      classId: input.bindClassScope.classId,
      subjectCode: input.bindClassScope.subjectCode || rawSkill.subjectCode,
      academicYearId: input.bindClassScope.academicYearId,
    })
    if (!classPerm.allowed || !classPerm.classInfo) {
      throw new Error(
        classPerm.reason ||
          "PERMISSION_DENIED: Thầy/Cô không có quyền gắn dữ liệu của lớp không thuộc phân công giảng dạy."
      )
    }

    const runnerBrief = await reviewScopeDataAndBuildEvidenceBrief(ctx, {
      academicYearId: input.bindClassScope.academicYearId || classPerm.classInfo.academicYearId,
      evaluationPeriod: input.bindClassScope.evaluationPeriod || "ALL",
      classId: input.bindClassScope.classId,
      subjectCode: input.bindClassScope.subjectCode || rawSkill.subjectCode,
      subjectName: rawSkill.subjectName,
    })

    boundContextSummary = {
      boundMode: "RUNNER_AUTHORIZED_CLASS_DATA",
      runnerUserId: ctx.userId,
      runnerName: ctx.fullName,
      inheritedFromSkillAuthor: false,
      classId: classPerm.classInfo.id,
      className: classPerm.classInfo.className,
      gradeLevel: `K${classPerm.classInfo.grade}`,
      evaluationPeriod: runnerBrief.scope.evaluationPeriod,
      scoreDistribution: runnerBrief.deterministicMetrics.scoreDistribution,
      learningSituationSummary: runnerBrief.aiInterpretation.learningSituationSummary,
      identifiedGaps: runnerBrief.deterministicMetrics.identifiedSkillOrTopicGaps,
      guardrailNotice: runnerBrief.dataQualityAudit.guardrailNotice,
    }
  }

  // 4. Assemble prompt safely (strip PII and prompt injection attempts)
  const sanitizedInputs: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.inputValues || {})) {
    sanitizedInputs[k] = detectAndRedactStudentPii(
      sanitizeUntrustedAiInput(String(v || ""), 2000)
    ).redactedText
  }

  let assembledPrompt = input.customPromptOverride
    ? detectAndRedactStudentPii(sanitizeUntrustedAiInput(input.customPromptOverride, 4000))
        .redactedText
    : String(rawSkill.aiSystemPrompt || "")

  for (const [k, val] of Object.entries(sanitizedInputs)) {
    assembledPrompt = assembledPrompt.split(`{{${k}}}`).join(val || "[Chưa nhập]")
  }

  const startMs = Date.now()
  const apiKey = process.env.GEMINI_API_KEY
  let outputText = ""
  let status: "COMPLETED" | "FAILED" = "COMPLETED"
  let errorMessage: string | null = null
  let aiModel = apiKey ? "gemini-2.0-flash" : "sandbox-deterministic-preview"
  let promptTokens = Math.ceil(assembledPrompt.length / 4)
  let completionTokens = 0

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
      const fullPrompt = `${assembledPrompt}

<RUNNER_CLASS_CONTEXT_ANONYMIZED>
${JSON.stringify(boundContextSummary, null, 2)}
</RUNNER_CLASS_CONTEXT_ANONYMIZED>

<INPUT_PARAMETERS>
${JSON.stringify(sanitizedInputs, null, 2)}
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE_REQUIREMENT>
${rawSkill.outputStructure || "Trình bày rõ ràng theo cấu trúc sư phạm chuẩn."}
</OUTPUT_STRUCTURE_REQUIREMENT>

Lưu ý: Không đề cập bất kỳ tên hoặc mã định danh học sinh nào.`

      const res = await model.generateContent(fullPrompt)
      const rawOut = res.response.text() || ""
      outputText = detectAndRedactStudentPii(sanitizeRichText(rawOut)).redactedText
      completionTokens = Math.ceil(outputText.length / 4)
    } catch (err: any) {
      status = "FAILED"
      errorMessage = `Dịch vụ AI tạm thời gián đoạn: ${err?.message || "Lỗi kết nối"}. Thầy/Cô có thể bấm Thử lại.`
    }
  } else {
    // Graceful execution preview when GEMINI_API_KEY is not configured in environment
    outputText = [
      `### KẾT QUẢ CHẠY THỬ SKILL: ${rawSkill.name.toUpperCase()} (v${rawSkill.currentVersion})`,
      `> **Trạng thái dịch vụ AI:** Môi trường hiện tại chưa cấu hình khóa \`GEMINI_API_KEY\` trên máy chủ, hệ thống tạo bản xem trước lắp ghép dữ liệu lớp của **${ctx.fullName}** để Thầy/Cô kiểm tra cấu trúc hoặc sao chép sang công cụ AI.`,
      ``,
      `#### 1. Phạm vi dữ liệu lớp được gắn cho lần chạy này (Tách biệt với tác giả Skill)`,
      boundContextSummary.boundMode === "RUNNER_AUTHORIZED_CLASS_DATA"
        ? `- **Lớp thực thi của ${ctx.fullName}:** ${boundContextSummary.className} (${boundContextSummary.gradeLevel})\n- **Tóm tắt tình hình lớp (ẩn danh):** ${boundContextSummary.learningSituationSummary}\n- **Lưu ý dữ liệu:** ${boundContextSummary.guardrailNotice}`
        : `- **Chế độ chạy:** Sử dụng tham số đầu vào trực tiếp do ${ctx.fullName} nhập (không kế thừa dữ liệu lớp của tác giả Skill).`,
      ``,
      `#### 2. Câu lệnh AI đã lắp ghép hoàn chỉnh (Sẵn sàng thực thi)`,
      "```text",
      assembledPrompt,
      "```",
      ``,
      `#### 3. Cấu trúc kết quả đầu ra & Minh họa`,
      rawSkill.sampleOutput || rawSkill.outputStructure || "Hoàn thành lắp ghép cấu trúc đầu ra.",
    ].join("\n")
    completionTokens = Math.ceil(outputText.length / 4)
  }

  const durationMs = Math.max(1, Date.now() - startMs)
  const estimatedCostUsd = Number(
    ((promptTokens * 0.00000015 + completionTokens * 0.0000006)).toFixed(6)
  )

  const runRecord = await pAny.slcSkillRun.create({
    data: {
      skillId: rawSkill.id,
      skillVersion: rawSkill.currentVersion || "1.0",
      runnerUserId: ctx.userId,
      runnerName: ctx.fullName,
      runnerCampusId: ctx.campusId,
      academicYearId: input.bindClassScope?.academicYearId || null,
      evaluationPeriod: input.bindClassScope?.evaluationPeriod || null,
      classId: boundContextSummary.classId || null,
      className: boundContextSummary.className || null,
      subjectCode: rawSkill.subjectCode,
      inputValuesJson: JSON.stringify(sanitizedInputs),
      boundContextSummaryJson: JSON.stringify(boundContextSummary),
      outputText: outputText || null,
      status,
      errorMessage,
      aiModel,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      durationMs,
      clientRequestId: cleanClientReqId,
    },
  })

  if (status === "COMPLETED") {
    await pAny.slcSkill
      .update({
        where: { id: rawSkill.id },
        data: { runCount: { increment: 1 } },
      })
      .catch(() => null)
  }

  await recordSlcAuditLog(ctx, "EXECUTE_SKILL_RUN", "SKILL", rawSkill.id, {
    runId: runRecord.id,
    status,
    boundClassId: boundContextSummary.classId || null,
    promptTokens,
    completionTokens,
    estimatedCostUsd,
  })

  return {
    run: {
      ...runRecord,
      latencyMs: durationMs,
    },
    outputText: runRecord.outputText || outputText,
    skillVersion: runRecord.skillVersion,
    deduplicated: false,
    aiConfigured: Boolean(apiKey),
  }
}

/**
 * Tạo gói Skill tải xuống (.zip gồm SKILL.md và skill-manifest.json) đã kiểm tra quyền và lọc sạch PII học sinh.
 */
export async function buildSafeSkillDownloadPackage(
  ctx: SlcUserContext,
  skillId: string
): Promise<{
  fileName: string
  buffer: Buffer
  mimeType: string
}> {
  const detail = await getSlcSkillDetail(ctx, skillId)
  const sk = detail.skill

  // Redact PII one more time before exporting package
  const cleanName = detectAndRedactStudentPii(sk.name).redactedText
  const cleanPurpose = detectAndRedactStudentPii(sk.purpose).redactedText
  const cleanDescription = detectAndRedactStudentPii(sk.description).redactedText
  const cleanPrompt = detectAndRedactStudentPii(sk.aiSystemPrompt).redactedText
  const cleanSamplePrompt = detectAndRedactStudentPii(sk.samplePrompt || "").redactedText
  const cleanSampleOutput = detectAndRedactStudentPii(sk.sampleOutput || "").redactedText
  const cleanUsageGuide = detectAndRedactStudentPii(sk.usageGuide || "").redactedText

  const markdownContent = `# ${cleanName}
- **Mã Skill:** ${sk.code}
- **Phiên bản:** v${sk.currentVersion}
- **Môn học:** ${sk.subjectName} (${(sk.gradeLevels || []).join(", ")})
- **Nhóm công việc:** ${sk.workCategory}
- **Tác giả:** ${sk.authorName}${sk.originalAuthorName ? ` (Cải tiến từ Skill gốc của ${sk.originalAuthorName})` : ""}

---

## 1. Giúp làm gì (Mục đích & Mô tả)
**Mục đích:** ${cleanPurpose}

${cleanDescription}

## 2. Chuẩn bị gì (Điều kiện & Trường đầu vào)
${detectAndRedactStudentPii(sk.prerequisites || "").redactedText}

### Các trường đầu vào:
${(sk.inputFields || [])
  .map((f: SkillInputFieldSchema) => `- **${f.label}** (\`{{${f.key}}}\`): ${f.placeholder || ""}`)
  .join("\n")}

### Nguyên tắc & Giới hạn:
${detectAndRedactStudentPii(sk.principlesAndLimits || "").redactedText}

## 3. Hướng dẫn AI (System Prompt)
\`\`\`text
${cleanPrompt}
\`\`\`

## 4. Yêu cầu mẫu (Đã ẩn danh dữ liệu học sinh)
\`\`\`text
${cleanSamplePrompt}
\`\`\`

## 5. Kết quả minh họa & Cấu trúc đầu ra
### Cấu trúc đầu ra:
${detectAndRedactStudentPii(sk.outputStructure || "").redactedText}

### Kết quả minh họa:
${cleanSampleOutput}

## 6. Cách sử dụng & Tiêu chí kiểm tra
${cleanUsageGuide}

### Tiêu chí kiểm tra chất lượng:
${detectAndRedactStudentPii(sk.evaluationCriteria || "").redactedText}
`

  const manifestJson = JSON.stringify(
    {
      schemaVersion: "1.0",
      code: sk.code,
      name: cleanName,
      version: sk.currentVersion,
      subjectCode: sk.subjectCode,
      subjectName: sk.subjectName,
      gradeLevels: sk.gradeLevels,
      workCategory: sk.workCategory,
      authorName: sk.authorName,
      originalAuthorName: sk.originalAuthorName || null,
      purpose: cleanPurpose,
      inputFields: sk.inputFields,
      aiSystemPrompt: cleanPrompt,
      outputStructure: detectAndRedactStudentPii(sk.outputStructure || "").redactedText,
      samplePrompt: cleanSamplePrompt,
      sampleOutput: cleanSampleOutput,
      compatiblePlatforms: sk.compatiblePlatforms,
      studentPiiRedacted: true,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  )

  const zip = new JSZip()
  zip.file("SKILL.md", markdownContent)
  zip.file("skill-manifest.json", manifestJson)

  const buffer = await zip.generateAsync({ type: "nodebuffer" })
  await recordSlcAuditLog(ctx, "DOWNLOAD_SKILL_PACKAGE", "SKILL", sk.id, {
    code: sk.code,
    version: sk.currentVersion,
  })

  return {
    fileName: `${sk.code}_v${sk.currentVersion}.zip`,
    buffer,
    mimeType: "application/zip",
  }
}

/**
 * Quản trị cấu hình nhóm công việc Skill (SlcSkillWorkCategory) & Thống kê mức sử dụng/chi phí AI.
 */
export async function getSkillGovernanceAndAiUsageStats(ctx: SlcUserContext) {
  await ensureSlcSchema()
  if (!canManageCommunityAndSkills(ctx)) {
    throw new Error("PERMISSION_DENIED: Không có quyền truy cập khu vực quản trị & duyệt Skill.")
  }

  const pAny = getSlcDb()
  const [allSkills, recentRuns, recentAuditLogs, workCategories] = await Promise.all([
    pAny.slcSkill
      ?.findMany({
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => []) ?? [],
    pAny.slcSkillRun
      ?.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      })
      .catch(() => []) ?? [],
    pAny.slcAuditLog
      ?.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
      })
      .catch(() => []) ?? [],
    pAny.slcSkillWorkCategory
      ?.findMany({
        orderBy: { sortOrder: "asc" },
      })
      .catch(() => []) ?? [],
  ])

  const totalPromptTokens = recentRuns.reduce(
    (s: number, r: any) => s + Number(r.promptTokens || 0),
    0
  )
  const totalCompletionTokens = recentRuns.reduce(
    (s: number, r: any) => s + Number(r.completionTokens || 0),
    0
  )
  const totalEstimatedCostUsd = Number(
    recentRuns
      .reduce((s: number, r: any) => s + Number(r.estimatedCostUsd || 0), 0)
      .toFixed(5)
  )

  return {
    summary: {
      totalSkills: allSkills.length,
      pendingReviewCount: allSkills.filter((s: any) => s.status === "PENDING_REVIEW").length,
      publishedCount: allSkills.filter((s: any) => s.status === "PUBLISHED").length,
      needsRevisionCount: allSkills.filter((s: any) => s.status === "NEEDS_REVISION").length,
      ssmDataGroundedCount: allSkills.filter(
        (s: any) => s.creationSource === "SSM_DATA_GROUNDED"
      ).length,
      totalRunsSampled: recentRuns.length,
      totalPromptTokens,
      totalCompletionTokens,
      totalEstimatedCostUsd,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    },
    recentRuns: recentRuns.slice(0, 25),
    recentAuditLogs: recentAuditLogs.slice(0, 30),
    workCategories,
  }
}

export async function upsertSkillWorkCategory(
  ctx: SlcUserContext,
  input: {
    code: string
    name: string
    description?: string
    sortOrder?: number
    isActive?: boolean
  }
) {
  await ensureSlcSchema()
  if (!isSuperOrCommunityAdmin(ctx) && !ctx.isKtdbclOfficer) {
    throw new Error("Chỉ Quản trị viên hoặc KT&ĐBCL mới có quyền cấu hình danh mục công việc Skill.")
  }

  const pAny = getSlcDb()
  const cleanCode = String(input.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
  const cleanName = sanitizeRichText(input.name)
  if (!cleanCode || !cleanName) {
    throw new Error("Vui lòng nhập mã và tên nhóm công việc.")
  }

  const category = await pAny.slcSkillWorkCategory.upsert({
    where: { code: cleanCode },
    update: {
      name: cleanName,
      description: sanitizeRichText(input.description) || null,
      sortOrder: Number(input.sortOrder ?? 10),
      isActive: input.isActive !== false,
      updatedBy: ctx.userId,
    },
    create: {
      code: cleanCode,
      name: cleanName,
      description: sanitizeRichText(input.description) || null,
      sortOrder: Number(input.sortOrder ?? 10),
      isActive: input.isActive !== false,
      updatedBy: ctx.userId,
    },
  })

  await recordSlcAuditLog(ctx, "UPSERT_SKILL_WORK_CATEGORY", "WORK_CATEGORY", category.id, {
    code: cleanCode,
    name: cleanName,
  })

  return category
}
