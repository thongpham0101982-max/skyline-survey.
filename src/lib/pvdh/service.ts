import crypto from "crypto";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import {
  FurtherInquiryTopicCode,
  PVDH_WORKFLOW_STATUS_LABELS,
  PvdhExportLayoutConfig,
  PvdhFieldConfig,
  PvdhSectionConfig,
  PvdhWorkflowStatus,
  formatFollowUpActionsToText,
  getDefaultPvdhCodeForGrade,
  normalizeK12GradeNumber,
} from "./constants";
import {
  PvdhActor,
  isStudentInActorCampus,
  resolveStudentPvdhAccess,
  sanitizePvdhRecordForViewer,
} from "./auth-guard";
import { ensurePvdhSchema, getPvdhDb } from "./schema-init";
import {
  ExportMappingItemInput,
  PvdhValidationScope,
  ScopeComparableTemplate,
  detectTemplateScopeConflicts,
  normalizeFurtherTopics,
  parseFollowUpActions,
  parseInterviewMap,
  validateExportMappings,
  validatePvdhRecordData,
  validateSafeScoreFormula,
} from "./validation";
import {
  PvdhRenderPayload,
  buildPvdhDocumentHtml,
  buildPvdhSummaryExcelBuffer,
  generatePvdhPdfBuffer,
  readPrivatePvdhPdf,
  savePrivatePvdhPdf,
} from "./pdf-service";

export class PvdhDomainError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  constructor(message: string, statusCode = 400, code = "PVDH_ERROR", details?: any) {
    super(message);
    this.name = "PvdhDomainError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function writeSafeAudit(params: {
  entityType: "TEMPLATE" | "FILE_CONFIG" | "RECORD" | "EXPORT" | "HANDOVER";
  entityId: string;
  studentId?: string | null;
  recordId?: string | null;
  templateCode?: string | null;
  versionCode?: string | null;
  action: string;
  actor: PvdhActor;
  summary: string;
  metadata?: Record<string, any>;
}) {
  const db = getPvdhDb();
  // Tuyệt đối không ghi toàn bộ nội dung sức khỏe / tâm lý nhạy cảm vào audit metadata
  await db.pvdhAuditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      studentId: params.studentId || null,
      recordId: params.recordId || null,
      templateCode: params.templateCode || null,
      versionCode: params.versionCode || null,
      action: params.action,
      actorUserId: params.actor.userId,
      actorName: params.actor.userName,
      actorRole: params.actor.role,
      summary: params.summary,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

/**
 * Tra cứu hồ sơ dự tuyển ổn định theo ID hoặc Mã hồ sơ (KHÔNG nối dữ liệu theo họ tên HS)
 */
export async function findInputStudentByStableKey(idOrCode: string) {
  const key = String(idOrCode || "").trim();
  if (!key) return null;

  const includeSpec = {
    period: {
      select: { id: true, code: true, name: true, status: true, campusId: true, academicYearId: true },
    },
    batch: {
      select: {
        id: true,
        batchNumber: true,
        name: true,
        status: true,
        campusId: true,
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    },
    enrollmentClass: {
      select: { id: true, classCode: true, className: true, homeroomTeacherId: true, campusId: true },
    },
  };

  let st = await prisma.inputAssessmentStudent
    .findUnique({
      where: { id: key },
      include: includeSpec,
    })
    .catch(() => null);

  if (!st) {
    st = await prisma.inputAssessmentStudent
      .findFirst({
        where: {
          OR: [{ studentCode: key }, { enrollmentCode: key }],
        },
        orderBy: { createdAt: "desc" },
        include: includeSpec,
      })
      .catch(() => null);
  }

  if (!st) {
    // Nếu truyền Student.id từ Hồ sơ học sinh -> chỉ nối qua studentCode ổn định, KHÔNG nối qua tên
    const enrolled = await prisma.student
      .findUnique({
        where: { id: key },
        select: { studentCode: true },
      })
      .catch(() => null);
    if (enrolled?.studentCode) {
      st = await prisma.inputAssessmentStudent
        .findFirst({
          where: {
            OR: [{ studentCode: enrolled.studentCode }, { enrollmentCode: enrolled.studentCode }],
          },
          orderBy: { createdAt: "desc" },
          include: includeSpec,
        })
        .catch(() => null);
    }
  }

  return st;
}

// ============================================================================
// 1. QUẢN LÝ 5 MẪU PVDH & PHIÊN BẢN CẤU HÌNH
// ============================================================================

export async function listPvdhTemplatesWithVersions() {
  await ensurePvdhSchema();
  const db = getPvdhDb();
  const [templates, versions, records] = await Promise.all([
    db.pvdhTemplate.findMany({ orderBy: [{ code: "asc" }] }),
    db.pvdhTemplateVersion.findMany({ orderBy: [{ templateCode: "asc" }, { versionNumber: "desc" }] }),
    db.pvdhAssessmentRecord.findMany(),
  ]);

  const usageByTemplateId = new Map<string, number>();
  const lockedUsageByVersionId = new Map<string, number>();
  const totalUsageByVersionId = new Map<string, number>();

  for (const r of records) {
    usageByTemplateId.set(r.templateId, (usageByTemplateId.get(r.templateId) || 0) + 1);
    totalUsageByVersionId.set(
      r.templateVersionId,
      (totalUsageByVersionId.get(r.templateVersionId) || 0) + 1
    );
    if (r.isLocked || r.workflowStatus === "COMPLETED" || r.workflowStatus === "VERIFIED_LOCKED" || r.workflowStatus === "HANDED_OVER") {
      lockedUsageByVersionId.set(
        r.templateVersionId,
        (lockedUsageByVersionId.get(r.templateVersionId) || 0) + 1
      );
    }
  }

  return templates.map((t: any) => {
    const tplVersions = versions
      .filter((v: any) => v.templateId === t.id || v.templateCode === t.code)
      .map((v: any) => ({
        ...v,
        grades: safeJsonParse<string[]>(v.gradesJson, []),
        educationSystems: safeJsonParse<string[]>(v.educationSystemsJson, ["ALL"]),
        campusIds: safeJsonParse<string[]>(v.campusIdsJson, ["ALL"]),
        periodIds: safeJsonParse<string[]>(v.periodIdsJson, ["ALL"]),
        sections: safeJsonParse<PvdhSectionConfig[]>(v.sectionsJson, []),
        fields: safeJsonParse<PvdhFieldConfig[]>(v.fieldsJson, []),
        exportLayout: safeJsonParse<PvdhExportLayoutConfig>(v.exportLayoutJson, {} as any),
        usageCount: totalUsageByVersionId.get(v.id) || 0,
        finalizedCount: lockedUsageByVersionId.get(v.id) || 0,
        isStructureImmutable: (lockedUsageByVersionId.get(v.id) || 0) > 0,
      }));

    const activeVersion =
      tplVersions.find((v: any) => v.versionNumber === t.currentVersionNumber) ||
      tplVersions.find((v: any) => v.status === "ACTIVE") ||
      tplVersions[0] ||
      null;

    return {
      ...t,
      grades: safeJsonParse<string[]>(t.gradesJson, []),
      educationSystems: safeJsonParse<string[]>(t.educationSystemsJson, ["ALL"]),
      campusIds: safeJsonParse<string[]>(t.campusIdsJson, ["ALL"]),
      periodIds: safeJsonParse<string[]>(t.periodIdsJson, ["ALL"]),
      totalUsageCount: usageByTemplateId.get(t.id) || 0,
      activeVersion,
      versions: tplVersions,
    };
  });
}

/**
 * Chọn đúng mẫu PVDH đang áp dụng theo Khối, Hệ, Cơ sở, Đợt và Thời gian hiệu lực
 * theo thứ tự ưu tiên tường minh (priorityOrder nhỏ hơn ưu tiên cao hơn, sau đó xét độ đặc thù).
 * Tuyệt đối không tự chọn ngẫu nhiên.
 */
export async function resolveApplicablePvdhTemplate(params: {
  grade: unknown;
  educationSystem?: string | null;
  campusId?: string | null;
  periodId?: string | null;
  atDateIso?: string | null;
}) {
  await ensurePvdhSchema();
  const gradeNum = normalizeK12GradeNumber(params.grade);
  const sysCode = String(params.educationSystem || "ALL").trim().toUpperCase();
  const campusKey = String(params.campusId || "ALL").trim().toUpperCase();
  const periodKey = String(params.periodId || "ALL").trim().toUpperCase();
  const targetTime = params.atDateIso ? new Date(params.atDateIso).getTime() : Date.now();

  const allTemplates = await listPvdhTemplatesWithVersions();
  const candidates: Array<{ tpl: any; ver: any; specificityScore: number }> = [];

  for (const tpl of allTemplates) {
    if (tpl.status !== "ACTIVE" || !tpl.activeVersion) continue;
    const grades = (tpl.grades || []).map((g: string) => normalizeK12GradeNumber(g));
    if (!grades.includes("ALL") && !grades.includes(gradeNum)) continue;

    const systems = (tpl.educationSystems || ["ALL"]).map((s: string) => String(s).toUpperCase());
    if (!systems.includes("ALL") && sysCode !== "ALL" && !systems.includes(sysCode)) continue;

    const campuses = (tpl.campusIds || ["ALL"]).map((c: string) => String(c).toUpperCase());
    if (!campuses.includes("ALL") && campusKey !== "ALL" && !campuses.includes(campusKey)) continue;

    const periods = (tpl.periodIds || ["ALL"]).map((p: string) => String(p).toUpperCase());
    if (!periods.includes("ALL") && periodKey !== "ALL" && !periods.includes(periodKey)) continue;

    if (tpl.effectiveFrom) {
      const fromTs = new Date(tpl.effectiveFrom).getTime();
      if (!Number.isNaN(fromTs) && targetTime < fromTs) continue;
    }
    if (tpl.effectiveTo) {
      const toTs = new Date(tpl.effectiveTo).getTime();
      if (!Number.isNaN(toTs) && targetTime > toTs) continue;
    }

    let specificity = 0;
    if (grades.includes(gradeNum)) specificity += 8;
    if (periodKey !== "ALL" && periods.includes(periodKey)) specificity += 4;
    if (sysCode !== "ALL" && systems.includes(sysCode)) specificity += 2;
    if (campusKey !== "ALL" && campuses.includes(campusKey)) specificity += 1;

    candidates.push({ tpl, ver: tpl.activeVersion, specificityScore: specificity });
  }

  if (candidates.length === 0) {
    // Fallback an toàn theo mã khối chuẩn PVDH-01..05 nếu tất cả mẫu bị tùy chỉnh lệch
    const fallbackCode = getDefaultPvdhCodeForGrade(gradeNum);
    const fallbackTpl = allTemplates.find((t: any) => t.code === fallbackCode);
    if (fallbackTpl?.activeVersion) {
      return { template: fallbackTpl, version: fallbackTpl.activeVersion };
    }
    throw new PvdhDomainError(
      `Không tìm thấy mẫu Phiếu phỏng vấn định hướng phù hợp cho Khối "${params.grade}".`,
      404,
      "TEMPLATE_NOT_FOUND"
    );
  }

  // Sắp xếp quyết định: priorityOrder tăng dần -> specificity giảm dần -> code tăng dần
  candidates.sort((a, b) => {
    if (a.tpl.priorityOrder !== b.tpl.priorityOrder) {
      return a.tpl.priorityOrder - b.tpl.priorityOrder;
    }
    if (a.specificityScore !== b.specificityScore) {
      return b.specificityScore - a.specificityScore;
    }
    return String(a.tpl.code).localeCompare(String(b.tpl.code));
  });

  return {
    template: candidates[0].tpl,
    version: candidates[0].ver,
  };
}

/**
 * Cập nhật phiên bản nháp hoặc tạo phiên bản mới khi mẫu đã có phiếu chốt
 */
export async function updatePvdhTemplateVersion(params: {
  actor: PvdhActor;
  templateId: string;
  versionId: string;
  name?: string;
  description?: string;
  grades?: string[];
  educationSystems?: string[];
  campusIds?: string[];
  periodIds?: string[];
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  priorityOrder?: number;
  sections?: PvdhSectionConfig[];
  fields?: PvdhFieldConfig[];
  exportLayout?: PvdhExportLayoutConfig;
  changeSummary?: string;
}) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền cấu hình biểu mẫu định hướng.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const tpl = await db.pvdhTemplate.findUnique({ where: { id: params.templateId } });
  const ver = await db.pvdhTemplateVersion.findUnique({ where: { id: params.versionId } });
  if (!tpl || !ver) {
    throw new PvdhDomainError("Không tìm thấy mẫu hoặc phiên bản cấu hình.", 404, "NOT_FOUND");
  }

  // Kiểm tra xem phiên bản này đã được hồ sơ chốt sử dụng chưa
  const usedRecords = await db.pvdhAssessmentRecord.findMany({
    where: { templateVersionId: ver.id },
  });
  const finalizedCount = usedRecords.filter(
    (r: any) =>
      r.isLocked ||
      r.workflowStatus === "COMPLETED" ||
      r.workflowStatus === "VERIFIED_LOCKED" ||
      r.workflowStatus === "HANDED_OVER"
  ).length;

  if (finalizedCount > 0 && (params.fields || params.sections)) {
    const existingFields = safeJsonParse<PvdhFieldConfig[]>(ver.fieldsJson, []);
    const nextFields = params.fields || existingFields;
    const existingKeys = existingFields.map((f) => `${f.fieldKey}:${f.sectionCode}:${f.dataType}`).join("|");
    const nextKeys = nextFields.map((f) => `${f.fieldKey}:${f.sectionCode}:${f.dataType}`).join("|");

    if (existingKeys !== nextKeys || ver.status === "ACTIVE") {
      throw new PvdhDomainError(
        `Phiên bản ${ver.versionCode} của mẫu ${tpl.code} đã được dùng để chốt ${finalizedCount} phiếu nên không thể sửa trực tiếp cấu trúc. Vui lòng bấm "Tạo phiên bản mới".`,
        409,
        "VERSION_IMMUTABLE"
      );
    }
  }

  const nextGrades = params.grades ?? safeJsonParse<string[]>(ver.gradesJson, []);
  const nextSystems = params.educationSystems ?? safeJsonParse<string[]>(ver.educationSystemsJson, ["ALL"]);
  const nextCampuses = params.campusIds ?? safeJsonParse<string[]>(ver.campusIdsJson, ["ALL"]);
  const nextPeriods = params.periodIds ?? safeJsonParse<string[]>(ver.periodIdsJson, ["ALL"]);
  const nextPrio = params.priorityOrder ?? ver.priorityOrder ?? 100;

  // Nếu phiên bản đang ACTIVE, kiểm tra trùng phạm vi trước khi lưu phạm vi mới
  if (tpl.status === "ACTIVE" && ver.status === "ACTIVE") {
    const allActive = await listPvdhTemplatesWithVersions();
    const comparables: ScopeComparableTemplate[] = allActive
      .filter((x: any) => x.status === "ACTIVE")
      .map((x: any) => ({
        id: x.id,
        code: x.code,
        name: x.name,
        grades: x.grades,
        educationSystems: x.educationSystems,
        campusIds: x.campusIds,
        periodIds: x.periodIds,
        effectiveFrom: x.effectiveFrom,
        effectiveTo: x.effectiveTo,
        priorityOrder: x.priorityOrder,
        status: x.status,
      }));

    const check = detectTemplateScopeConflicts(
      {
        id: tpl.id,
        code: tpl.code,
        name: params.name || tpl.name,
        grades: nextGrades,
        educationSystems: nextSystems,
        campusIds: nextCampuses,
        periodIds: nextPeriods,
        effectiveFrom: params.effectiveFrom !== undefined ? params.effectiveFrom : tpl.effectiveFrom,
        effectiveTo: params.effectiveTo !== undefined ? params.effectiveTo : tpl.effectiveTo,
        priorityOrder: nextPrio,
        status: "ACTIVE",
      },
      comparables
    );

    if (!check.canPublish) {
      throw new PvdhDomainError(
        check.blockingConflicts[0].reason,
        409,
        "SCOPE_CONFLICT",
        check
      );
    }
  }

  await db.pvdhTemplateVersion.update({
    where: { id: ver.id },
    data: {
      nameSnapshot: params.name || ver.nameSnapshot,
      gradesJson: JSON.stringify(nextGrades),
      educationSystemsJson: JSON.stringify(nextSystems),
      campusIdsJson: JSON.stringify(nextCampuses),
      periodIdsJson: JSON.stringify(nextPeriods),
      effectiveFrom: params.effectiveFrom !== undefined ? params.effectiveFrom : ver.effectiveFrom,
      effectiveTo: params.effectiveTo !== undefined ? params.effectiveTo : ver.effectiveTo,
      priorityOrder: nextPrio,
      ...(params.sections ? { sectionsJson: JSON.stringify(params.sections) } : {}),
      ...(params.fields ? { fieldsJson: JSON.stringify(params.fields) } : {}),
      ...(params.exportLayout ? { exportLayoutJson: JSON.stringify(params.exportLayout) } : {}),
      ...(params.changeSummary ? { changeSummary: params.changeSummary } : {}),
    },
  });

  if (ver.versionNumber === tpl.currentVersionNumber) {
    await db.pvdhTemplate.update({
      where: { id: tpl.id },
      data: {
        name: params.name || tpl.name,
        description: params.description !== undefined ? params.description : tpl.description,
        gradesJson: JSON.stringify(nextGrades),
        educationSystemsJson: JSON.stringify(nextSystems),
        campusIdsJson: JSON.stringify(nextCampuses),
        periodIdsJson: JSON.stringify(nextPeriods),
        effectiveFrom: params.effectiveFrom !== undefined ? params.effectiveFrom : tpl.effectiveFrom,
        effectiveTo: params.effectiveTo !== undefined ? params.effectiveTo : tpl.effectiveTo,
        priorityOrder: nextPrio,
        updatedById: params.actor.userId,
        updatedByName: params.actor.userName,
      },
    });
  }

  await writeSafeAudit({
    entityType: "TEMPLATE",
    entityId: tpl.id,
    templateCode: tpl.code,
    versionCode: ver.versionCode,
    action: "UPDATE_TEMPLATE_VERSION",
    actor: params.actor,
    summary: `Cập nhật cấu hình mẫu ${tpl.code} (${ver.versionCode})`,
  });

  const refreshed = await listPvdhTemplatesWithVersions();
  return refreshed.find((x: any) => x.id === tpl.id);
}

export async function createNewPvdhTemplateVersion(params: {
  actor: PvdhActor;
  templateId: string;
  baseVersionId?: string;
  changeSummary?: string;
}) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền tạo phiên bản mẫu mới.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const tpl = await db.pvdhTemplate.findUnique({ where: { id: params.templateId } });
  if (!tpl) throw new PvdhDomainError("Không tìm thấy mẫu định hướng.", 404, "NOT_FOUND");

  const versions = await db.pvdhTemplateVersion.findMany({
    where: { templateId: tpl.id },
    orderBy: [{ versionNumber: "desc" }],
  });
  const base =
    (params.baseVersionId && versions.find((v: any) => v.id === params.baseVersionId)) ||
    versions[0];
  if (!base) throw new PvdhDomainError("Không tìm thấy phiên bản gốc để kế thừa.", 404, "NOT_FOUND");

  const nextNum = (versions[0]?.versionNumber || 1) + 1;
  const nextCode = `v${nextNum}.0`;

  const createdVer = await db.pvdhTemplateVersion.create({
    data: {
      templateId: tpl.id,
      templateCode: tpl.code,
      versionNumber: nextNum,
      versionCode: nextCode,
      status: "DRAFT",
      nameSnapshot: base.nameSnapshot,
      purposeText: base.purposeText,
      gradesJson: base.gradesJson,
      educationSystemsJson: base.educationSystemsJson,
      campusIdsJson: base.campusIdsJson,
      periodIdsJson: base.periodIdsJson,
      effectiveFrom: base.effectiveFrom,
      effectiveTo: base.effectiveTo,
      priorityOrder: base.priorityOrder,
      sectionsJson: base.sectionsJson,
      fieldsJson: base.fieldsJson,
      exportLayoutJson: base.exportLayoutJson,
      changeSummary: params.changeSummary || `Tạo phiên bản nháp ${nextCode} kế thừa từ ${base.versionCode}`,
      createdById: params.actor.userId,
      createdByName: params.actor.userName,
    },
  });

  await writeSafeAudit({
    entityType: "TEMPLATE",
    entityId: tpl.id,
    templateCode: tpl.code,
    versionCode: nextCode,
    action: "CREATE_NEW_VERSION",
    actor: params.actor,
    summary: `Tạo phiên bản mới ${nextCode} cho mẫu ${tpl.code}`,
  });

  return createdVer;
}

export async function clonePvdhTemplate(params: {
  actor: PvdhActor;
  sourceTemplateId: string;
  newCode: string;
  newName: string;
  priorityOrder?: number;
}) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền nhân bản mẫu định hướng.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const codeClean = String(params.newCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(codeClean)) {
    throw new PvdhDomainError("Mã mẫu mới không hợp lệ (3–24 ký tự chữ hoa, số, -, _).", 400, "INVALID_CODE");
  }

  const dup = await db.pvdhTemplate.findFirst({ where: { code: codeClean } });
  if (dup) {
    throw new PvdhDomainError(`Mã mẫu "${codeClean}" đã tồn tại.`, 409, "DUPLICATE_CODE");
  }

  const srcTpl = await db.pvdhTemplate.findUnique({ where: { id: params.sourceTemplateId } });
  if (!srcTpl) throw new PvdhDomainError("Không tìm thấy mẫu gốc.", 404, "NOT_FOUND");

  const srcVer = await db.pvdhTemplateVersion.findFirst({
    where: { templateId: srcTpl.id, versionNumber: srcTpl.currentVersionNumber },
  });
  if (!srcVer) throw new PvdhDomainError("Không tìm thấy phiên bản gốc.", 404, "NOT_FOUND");

  const prio = params.priorityOrder ?? Math.max(10, (srcTpl.priorityOrder || 100) - 10);

  const newTpl = await db.pvdhTemplate.create({
    data: {
      code: codeClean,
      name: params.newName || `${srcTpl.name} (Nhân bản)`,
      description: srcTpl.description,
      contentCategory: "ORIENTATION_INTERVIEW",
      gradeGroup: srcTpl.gradeGroup,
      gradesJson: srcTpl.gradesJson,
      educationSystemsJson: srcTpl.educationSystemsJson,
      campusIdsJson: srcTpl.campusIdsJson,
      periodIdsJson: srcTpl.periodIdsJson,
      effectiveFrom: srcTpl.effectiveFrom,
      effectiveTo: srcTpl.effectiveTo,
      priorityOrder: prio,
      status: "DRAFT",
      currentVersionNumber: 1,
      currentVersionCode: "v1.0",
      sourceNote: `Nhân bản từ ${srcTpl.code}`,
      createdById: params.actor.userId,
      createdByName: params.actor.userName,
    },
  });

  await db.pvdhTemplateVersion.create({
    data: {
      templateId: newTpl.id,
      templateCode: codeClean,
      versionNumber: 1,
      versionCode: "v1.0",
      status: "DRAFT",
      nameSnapshot: newTpl.name,
      purposeText: srcVer.purposeText,
      gradesJson: srcTpl.gradesJson,
      educationSystemsJson: srcTpl.educationSystemsJson,
      campusIdsJson: srcTpl.campusIdsJson,
      periodIdsJson: srcTpl.periodIdsJson,
      effectiveFrom: srcTpl.effectiveFrom,
      effectiveTo: srcTpl.effectiveTo,
      priorityOrder: prio,
      sectionsJson: srcVer.sectionsJson,
      fieldsJson: srcVer.fieldsJson,
      exportLayoutJson: srcVer.exportLayoutJson,
      changeSummary: `Nhân bản từ mẫu ${srcTpl.code} (${srcVer.versionCode})`,
      createdById: params.actor.userId,
      createdByName: params.actor.userName,
    },
  });

  await writeSafeAudit({
    entityType: "TEMPLATE",
    entityId: newTpl.id,
    templateCode: codeClean,
    versionCode: "v1.0",
    action: "CLONE_TEMPLATE",
    actor: params.actor,
    summary: `Nhân bản mẫu ${srcTpl.code} thành ${codeClean} (Nháp)`,
  });

  return newTpl;
}

export async function setPvdhTemplatePublishStatus(params: {
  actor: PvdhActor;
  templateId: string;
  versionId: string;
  targetStatus: "ACTIVE" | "INACTIVE";
}) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền phát hành / ngừng áp dụng mẫu.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const tpl = await db.pvdhTemplate.findUnique({ where: { id: params.templateId } });
  const ver = await db.pvdhTemplateVersion.findUnique({ where: { id: params.versionId } });
  if (!tpl || !ver) throw new PvdhDomainError("Không tìm thấy mẫu hoặc phiên bản.", 404, "NOT_FOUND");

  const nowIso = new Date().toISOString();

  if (params.targetStatus === "ACTIVE") {
    const allTemplates = await listPvdhTemplatesWithVersions();
    const comparables: ScopeComparableTemplate[] = allTemplates
      .filter((x: any) => x.status === "ACTIVE" && x.id !== tpl.id)
      .map((x: any) => ({
        id: x.id,
        code: x.code,
        name: x.name,
        grades: x.grades,
        educationSystems: x.educationSystems,
        campusIds: x.campusIds,
        periodIds: x.periodIds,
        effectiveFrom: x.effectiveFrom,
        effectiveTo: x.effectiveTo,
        priorityOrder: x.priorityOrder,
        status: x.status,
      }));

    const candidate: ScopeComparableTemplate = {
      id: tpl.id,
      code: tpl.code,
      name: ver.nameSnapshot || tpl.name,
      grades: safeJsonParse<string[]>(ver.gradesJson, []),
      educationSystems: safeJsonParse<string[]>(ver.educationSystemsJson, ["ALL"]),
      campusIds: safeJsonParse<string[]>(ver.campusIdsJson, ["ALL"]),
      periodIds: safeJsonParse<string[]>(ver.periodIdsJson, ["ALL"]),
      effectiveFrom: ver.effectiveFrom,
      effectiveTo: ver.effectiveTo,
      priorityOrder: ver.priorityOrder ?? tpl.priorityOrder ?? 100,
      status: "ACTIVE",
    };

    const conflictResult = detectTemplateScopeConflicts(candidate, comparables);
    if (!conflictResult.canPublish) {
      throw new PvdhDomainError(
        conflictResult.blockingConflicts[0].reason,
        409,
        "SCOPE_CONFLICT",
        conflictResult
      );
    }

    // Hạ trạng thái các phiên bản khác cùng mẫu xuống INACTIVE (nhưng các hồ sơ cũ đã gán vẫn giữ versionId cũ!)
    const siblingVers = await db.pvdhTemplateVersion.findMany({ where: { templateId: tpl.id } });
    for (const sv of siblingVers) {
      if (sv.id !== ver.id && sv.status === "ACTIVE") {
        await db.pvdhTemplateVersion.update({
          where: { id: sv.id },
          data: { status: "INACTIVE", deactivatedAt: nowIso },
        });
      }
    }

    await db.pvdhTemplateVersion.update({
      where: { id: ver.id },
      data: {
        status: "ACTIVE",
        publishedAt: nowIso,
        publishedById: params.actor.userId,
        publishedByName: params.actor.userName,
      },
    });

    await db.pvdhTemplate.update({
      where: { id: tpl.id },
      data: {
        status: "ACTIVE",
        currentVersionNumber: ver.versionNumber,
        currentVersionCode: ver.versionCode,
        gradesJson: ver.gradesJson,
        educationSystemsJson: ver.educationSystemsJson,
        campusIdsJson: ver.campusIdsJson,
        periodIdsJson: ver.periodIdsJson,
        effectiveFrom: ver.effectiveFrom,
        effectiveTo: ver.effectiveTo,
        priorityOrder: ver.priorityOrder,
        updatedById: params.actor.userId,
        updatedByName: params.actor.userName,
      },
    });

    await writeSafeAudit({
      entityType: "TEMPLATE",
      entityId: tpl.id,
      templateCode: tpl.code,
      versionCode: ver.versionCode,
      action: "PUBLISH_TEMPLATE_VERSION",
      actor: params.actor,
      summary: `Phát hành áp dụng mẫu ${tpl.code} phiên bản ${ver.versionCode}`,
      metadata: { prioritizedOverlaps: conflictResult.prioritizedOverlaps },
    });

    return { status: "ACTIVE", overlaps: conflictResult.prioritizedOverlaps };
  } else {
    await db.pvdhTemplateVersion.update({
      where: { id: ver.id },
      data: { status: "INACTIVE", deactivatedAt: nowIso },
    });
    await db.pvdhTemplate.update({
      where: { id: tpl.id },
      data: {
        status: "INACTIVE",
        updatedById: params.actor.userId,
        updatedByName: params.actor.userName,
      },
    });

    await writeSafeAudit({
      entityType: "TEMPLATE",
      entityId: tpl.id,
      templateCode: tpl.code,
      versionCode: ver.versionCode,
      action: "DEACTIVATE_TEMPLATE",
      actor: params.actor,
      summary: `Ngừng áp dụng mẫu ${tpl.code} (${ver.versionCode})`,
    });

    return { status: "INACTIVE", overlaps: [] };
  }
}

export async function deletePvdhTemplate(params: { actor: PvdhActor; templateId: string }) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền xóa mẫu định hướng.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const tpl = await db.pvdhTemplate.findUnique({ where: { id: params.templateId } });
  if (!tpl) throw new PvdhDomainError("Không tìm thấy mẫu định hướng.", 404, "NOT_FOUND");

  const refCount = await db.pvdhAssessmentRecord.count({ where: { templateId: tpl.id } });
  if (refCount > 0) {
    throw new PvdhDomainError(
      `Mẫu ${tpl.code} đang được ${refCount} hồ sơ tham chiếu nên không được xóa. Vui lòng dùng chức năng "Ngừng áp dụng".`,
      409,
      "TEMPLATE_IN_USE"
    );
  }

  await db.pvdhTemplateVersion.deleteMany({ where: { templateId: tpl.id } });
  await db.pvdhTemplate.delete({ where: { id: tpl.id } });

  await writeSafeAudit({
    entityType: "TEMPLATE",
    entityId: tpl.id,
    templateCode: tpl.code,
    action: "DELETE_TEMPLATE",
    actor: params.actor,
    summary: `Xóa mẫu nháp chưa có hồ sơ tham chiếu ${tpl.code}`,
  });

  return { deleted: true };
}

// ============================================================================
// 2. HỒ SƠ ĐỊNH HƯỚNG (NHẬP NHÁP, HOÀN TẤT, KIỂM TRA, KHÓA, MỞ LẠI, ĐỔI MẪU)
// ============================================================================

async function syncBackwardCompatibleOrientationSummary(params: {
  student: any;
  record: any;
  actor: PvdhActor;
}) {
  // Đồng bộ tóm tắt sang StudentOrientationRecord cũ để các màn hình danh sách cũ hiển thị trạng thái,
  // TUYỆT ĐỐI KHÔNG tự sinh điểm môn học hay quyết định tiếp nhận!
  const { student, record, actor } = params;
  const pAny = prisma as any;
  try {
    const isDone = ["COMPLETED", "SUBMITTED", "VERIFIED_LOCKED", "HANDED_OVER"].includes(
      String(record.workflowStatus)
    );
    const legacyStatus = isDone ? "COMPLETED" : "DRAFT";

    const obsSummary = [
      record.obsStrengthsInterests ? `Điểm mạnh/sở thích: ${record.obsStrengthsInterests}` : "",
      record.obsCommunicationStyle ? `Giao tiếp: ${record.obsCommunicationStyle}` : "",
      record.obsParticipationLevel ? `Tham gia: ${record.obsParticipationLevel}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const existing = await pAny.studentOrientationRecord?.findUnique({
      where: { studentId: student.id },
    });

    const payloadData: Record<string, any> = {
      interviewerId: record.studentInterviewerUserId || actor.userId,
      interviewerName: record.studentInterviewerName || actor.userName,
      interviewDate: record.interviewDate ? new Date(record.interviewDate) : new Date(),
      status: legacyStatus,
      studentStrengths: record.planStrengthsPriority || record.obsStrengthsInterests || null,
      studentNeedsSupport: record.obsSupportNeeds || null,
      interviewerGeneralRemark: obsSummary || null,
      parentRepresentativeName: record.parentFullName || null,
      parentPhone: record.parentContactChannel || null,
      cooperationCommitment: record.planGoalsActionsText || null,
    };

    if (existing) {
      await pAny.studentOrientationRecord.update({
        where: { studentId: student.id },
        data: payloadData,
      });
    } else if (pAny.studentOrientationRecord) {
      await pAny.studentOrientationRecord.create({
        data: {
          studentId: student.id,
          ...payloadData,
        },
      });
    }

    if (isDone && student.periodId) {
      await executeEntranceWorkflowAction({
        action: "CONFIRM",
        targetScope: "STUDENT",
        periodId: student.periodId,
        batchId: student.batchId || null,
        studentIds: [student.id],
        stageNumber: 5,
        status: "COMPLETED",
        note: `Hoàn tất phiếu định hướng ${record.templateCode} (${record.templateVersionCode})`,
        actor: {
          id: actor.userId,
          fullName: actor.userName,
          role: actor.role,
          isSuperAdmin: actor.isSystemWideAdmin,
        },
      }).catch(() => {});
    }
  } catch {
    // Không làm gián đoạn luồng chính nếu bảng legacy vắng cột tùy chọn
  }
}

export async function getOrInitStudentPvdhWorkspace(params: {
  actor: PvdhActor;
  studentId: string;
  attemptNumber?: number;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const student = await findInputStudentByStableKey(params.studentId);
  if (!student) {
    throw new PvdhDomainError("Không tìm thấy hồ sơ dự tuyển học sinh.", 404, "STUDENT_NOT_FOUND");
  }

  let existingRecord = params.attemptNumber
    ? await db.pvdhAssessmentRecord.findFirst({
        where: {
          studentId: student.id,
          periodId: student.periodId,
          attemptNumber: params.attemptNumber,
        },
      })
    : await db.pvdhAssessmentRecord.findFirst({
        where: { studentId: student.id, isLatestAttempt: true },
        orderBy: [{ attemptNumber: "desc" }],
      });

  const rights = await resolveStudentPvdhAccess({
    actor: params.actor,
    student,
    existingRecord,
  });

  if (!rights.allowedToRead) {
    throw new PvdhDomainError(
      rights.denialReason || "Bạn không có quyền truy cập hồ sơ định hướng này.",
      403,
      "FORBIDDEN"
    );
  }

  // Nếu là GVCN vào xem bàn giao, kiểm tra bản bàn giao tương ứng
  const handovers = await db.pvdhHandover.findMany({
    where: { studentId: student.id },
    orderBy: [{ createdAt: "desc" }],
  });
  const latestHandover = handovers[0] || null;

  let pinnedVersion: any = null;
  let pinnedTemplate: any = null;

  if (existingRecord) {
    pinnedVersion = await db.pvdhTemplateVersion.findUnique({
      where: { id: existingRecord.templateVersionId },
    });
    pinnedTemplate = await db.pvdhTemplate.findUnique({
      where: { id: existingRecord.templateId },
    });
  } else if (rights.canEditStudentPart || rights.canEditParentPart || rights.canReviewLock) {
    // Khởi tạo bản nháp mới gắn chặt với phiên bản mẫu phù hợp theo Khối dự kiến, Hệ, Cơ sở, Đợt
    const resolved = await resolveApplicablePvdhTemplate({
      grade: student.grade || "1",
      educationSystem: student.surveyFormType || student.surveySystem || "ALL",
      campusId: student.batch?.campusId || student.period?.campusId || student.registeredCampus || "ALL",
      periodId: student.periodId || "ALL",
    });

    pinnedTemplate = resolved.template;
    pinnedVersion = resolved.version;

    // Lấy sẵn thông tin PHHS từ bản ghi cũ nếu có (không tạo câu trả lời mẫu giả)
    const legacyRecord = await (prisma as any).studentOrientationRecord
      ?.findUnique({ where: { studentId: student.id } })
      .catch(() => null);

    const todayStr = new Date().toISOString().split("T")[0];
    existingRecord = await db.pvdhAssessmentRecord.create({
      data: {
        studentId: student.id,
        studentCode: student.studentCode,
        periodId: student.periodId,
        batchId: student.batchId || null,
        campusId: student.batch?.campusId || student.period?.campusId || null,
        attemptNumber: 1,
        isLatestAttempt: true,
        gradeAtCreation: String(student.grade || "1"),
        educationSystemAtCreation: String(student.surveyFormType || student.surveySystem || "ALL"),
        templateId: pinnedTemplate.id,
        templateVersionId: pinnedVersion.id,
        templateCode: pinnedTemplate.code,
        templateVersionNumber: pinnedVersion.versionNumber,
        templateVersionCode: pinnedVersion.versionCode,
        interviewDate: todayStr,
        studentInterviewerUserId: params.actor.userId,
        studentInterviewerName: params.actor.userName,
        studentInterviewerTitle: params.actor.teacherPosition || "Giáo viên phỏng vấn",
        studentInterviewDate: todayStr,
        parentFullName: legacyRecord?.parentRepresentativeName || null,
        parentContactChannel: legacyRecord?.parentPhone || null,
        workflowStatus: "DRAFT",
        isLocked: false,
        lockVersion: 1,
        createdById: params.actor.userId,
        updatedById: params.actor.userId,
      },
    });
  } else {
    // Người chỉ xem mở hồ sơ chưa khởi tạo -> trả về preview mẫu tương ứng không ghi DB
    const resolved = await resolveApplicablePvdhTemplate({
      grade: student.grade || "1",
      educationSystem: student.surveyFormType || student.surveySystem || "ALL",
      campusId: student.batch?.campusId || student.period?.campusId || "ALL",
      periodId: student.periodId || "ALL",
    });
    pinnedTemplate = resolved.template;
    pinnedVersion = resolved.version;
  }

  // Phát hiện trường hợp học sinh đổi Khối dự kiến sau khi đã mở phiếu:
  // KHÔNG tự động đổi mẫu âm thầm — trả về cảnh báo rõ ràng để người có quyền xử lý chuyển mẫu có kiểm tra mapping
  let gradeChangeWarning: null | {
    recordedGrade: string;
    currentStudentGrade: string;
    pinnedTemplateCode: string;
    recommendedTemplateCode: string;
    message: string;
  } = null;

  if (existingRecord && student.grade) {
    const recCode = getDefaultPvdhCodeForGrade(student.grade);
    if (recCode && recCode !== existingRecord.templateCode) {
      gradeChangeWarning = {
        recordedGrade: existingRecord.gradeAtCreation,
        currentStudentGrade: String(student.grade),
        pinnedTemplateCode: existingRecord.templateCode,
        recommendedTemplateCode: recCode,
        message: `Khối dự kiến của học sinh đã thay đổi từ "${existingRecord.gradeAtCreation}" sang "${student.grade}" (mẫu khuyến nghị mới: ${recCode}). Hệ thống giữ nguyên mẫu đang nhập (${existingRecord.templateCode}) để tránh mất dữ liệu; người điều phối/kiểm tra có thể thực hiện Chuyển mẫu có kiểm tra mapping.`,
      };
    }
  }

  const allAttempts = await db.pvdhAssessmentRecord.findMany({
    where: { studentId: student.id },
    orderBy: [{ attemptNumber: "desc" }],
  });

  const reviewHistory = existingRecord
    ? await db.pvdhReviewHistory.findMany({
        where: { recordId: existingRecord.id },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  const sections = safeJsonParse<PvdhSectionConfig[]>(pinnedVersion?.sectionsJson, pinnedVersion?.sections || []);
  const fields = safeJsonParse<PvdhFieldConfig[]>(pinnedVersion?.fieldsJson, pinnedVersion?.fields || []);
  const exportLayout = safeJsonParse<PvdhExportLayoutConfig>(
    pinnedVersion?.exportLayoutJson,
    pinnedVersion?.exportLayout || ({} as any)
  );

  const sanitizedRecord = sanitizePvdhRecordForViewer(existingRecord, {
    ...rights,
    includeSensitiveInHandover: latestHandover ? Boolean(latestHandover.includeSensitiveNotes) : true,
  });

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      enrollmentCode: student.enrollmentCode,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      grade: student.grade,
      oldSchoolName: student.oldSchoolName,
      className: student.className,
      surveySystem: student.surveyFormType || student.surveySystem || "",
      registeredCampus:
        student.batch?.campus?.campusName ||
        student.batch?.campus?.campusCode ||
        student.registeredCampus ||
        student.admissionCampus ||
        "",
      periodId: student.periodId,
      periodCode: student.period?.code || "",
      periodName: student.period?.name || "",
      batchId: student.batchId,
      batchName: student.batch?.name || "",
      enrollmentStatus: student.enrollmentStatus,
      enrollmentClassId: student.enrollmentClassId,
      enrollmentClassName: student.enrollmentClass?.className || "",
    },
    record: (sanitizedRecord
      ? {
          ...sanitizedRecord,
          studentResponses: parseInterviewMap(sanitizedRecord.studentResponsesJson),
          parentResponses: parseInterviewMap(sanitizedRecord.parentResponsesJson),
          followUpActions: parseFollowUpActions(sanitizedRecord.followUpActionsJson),
          planFurtherTopics: normalizeFurtherTopics(
            safeJsonParse(sanitizedRecord.planFurtherTopicsJson, [])
          ),
          templateMigrationHistory: safeJsonParse(sanitizedRecord.templateMigrationHistoryJson, []),
        }
      : null) as any,
    template: pinnedTemplate,
    version: {
      id: pinnedVersion?.id,
      templateCode: pinnedVersion?.templateCode,
      versionNumber: pinnedVersion?.versionNumber,
      versionCode: pinnedVersion?.versionCode,
      sections,
      fields,
      exportLayout,
    },
    accessRights: rights,
    gradeChangeWarning,
    attempts: allAttempts.map((a: any) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      isLatestAttempt: a.isLatestAttempt,
      templateCode: a.templateCode,
      templateVersionCode: a.templateVersionCode,
      workflowStatus: a.workflowStatus,
      isLocked: a.isLocked,
      updatedAt: a.updatedAt,
    })),
    reviewHistory,
    handovers,
  };
}

/**
 * Lưu nháp hoặc Hoàn tất phần việc được phân công (có kiểm soát xung đột đồng thời lockVersion)
 */
export async function savePvdhRecord(params: {
  actor: PvdhActor;
  studentId: string;
  recordId?: string;
  expectedLockVersion?: number;
  mode: "DRAFT" | "COMPLETE";
  completionScope?: PvdhValidationScope;
  payload: Record<string, any>;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const student = await findInputStudentByStableKey(params.studentId);
  if (!student) {
    throw new PvdhDomainError("Không tìm thấy hồ sơ dự tuyển học sinh.", 404, "STUDENT_NOT_FOUND");
  }

  let existing = params.recordId
    ? await db.pvdhAssessmentRecord.findUnique({ where: { id: params.recordId } })
    : await db.pvdhAssessmentRecord.findFirst({
        where: { studentId: student.id, isLatestAttempt: true },
        orderBy: [{ attemptNumber: "desc" }],
      });

  if (!existing && !params.recordId) {
    await getOrInitStudentPvdhWorkspace({ actor: params.actor, studentId: student.id });
    existing = await db.pvdhAssessmentRecord.findFirst({
      where: { studentId: student.id, isLatestAttempt: true },
      orderBy: [{ attemptNumber: "desc" }],
    });
  }

  if (!existing) {
    throw new PvdhDomainError("Chưa khởi tạo phiếu định hướng cho hồ sơ này.", 404, "RECORD_NOT_FOUND");
  }

  const rights = await resolveStudentPvdhAccess({
    actor: params.actor,
    student,
    existingRecord: existing,
  });

  if (!rights.canEditStudentPart && !rights.canEditParentPart && !rights.canReviewLock) {
    throw new PvdhDomainError(
      "Bạn không có quyền chỉnh sửa phiếu định hướng của học sinh này.",
      403,
      "FORBIDDEN"
    );
  }

  if (existing.isLocked) {
    throw new PvdhDomainError(
      "Phiếu định hướng đã được xác nhận và khóa. Chỉ người có thẩm quyền mới được Mở lại kèm lý do.",
      409,
      "RECORD_LOCKED"
    );
  }

  // Kiểm soát xung đột khi nhiều người cùng mở sửa
  if (
    params.expectedLockVersion !== undefined &&
    Number(params.expectedLockVersion) !== Number(existing.lockVersion)
  ) {
    throw new PvdhDomainError(
      `Dữ liệu phiếu vừa được cập nhật bởi người dùng khác (phiên bản lưu hiện tại: #${existing.lockVersion}). Vui lòng tải lại phiếu để tránh ghi đè dữ liệu.`,
      409,
      "CONCURRENCY_CONFLICT",
      { currentLockVersion: existing.lockVersion }
    );
  }

  const ver = await db.pvdhTemplateVersion.findUnique({
    where: { id: existing.templateVersionId },
  });
  const fields = safeJsonParse<PvdhFieldConfig[]>(ver?.fieldsJson, []);

  const nowIso = new Date().toISOString();
  const p = params.payload || {};

  // Ghép dữ liệu theo đúng quyền từng phần (HS vs PHHS không ghi đè lẫn nhau!)
  const prevStudentMap = parseInterviewMap(existing.studentResponsesJson);
  const prevParentMap = parseInterviewMap(existing.parentResponsesJson);

  let nextStudentMap = prevStudentMap;
  if (rights.canEditStudentPart && p.studentResponses !== undefined) {
    const incoming = parseInterviewMap(p.studentResponses);
    nextStudentMap = { ...prevStudentMap };
    for (const [k, item] of Object.entries(incoming)) {
      nextStudentMap[k] = {
        responseText: item.notRecorded ? "" : item.responseText,
        notRecorded: Boolean(item.notRecorded),
        notRecordedReason: item.notRecorded ? item.notRecordedReason : "",
        updatedByUserId: params.actor.userId,
        updatedByName: params.actor.userName,
        updatedAt: nowIso,
      };
    }
  }

  let nextParentMap = prevParentMap;
  if (rights.canEditParentPart && p.parentResponses !== undefined) {
    const incoming = parseInterviewMap(p.parentResponses);
    nextParentMap = { ...prevParentMap };
    for (const [k, item] of Object.entries(incoming)) {
      nextParentMap[k] = {
        responseText: item.notRecorded ? "" : item.responseText,
        notRecorded: Boolean(item.notRecorded),
        notRecordedReason: item.notRecorded ? item.notRecordedReason : "",
        updatedByUserId: params.actor.userId,
        updatedByName: params.actor.userName,
        updatedAt: nowIso,
      };
    }
  }

  const nextObsStrengths = rights.canEditStudentPart && p.obsStrengthsInterests !== undefined
    ? String(p.obsStrengthsInterests ?? "")
    : existing.obsStrengthsInterests;
  const nextObsComm = rights.canEditStudentPart && p.obsCommunicationStyle !== undefined
    ? String(p.obsCommunicationStyle ?? "")
    : existing.obsCommunicationStyle;
  const nextObsPart = rights.canEditStudentPart && p.obsParticipationLevel !== undefined
    ? String(p.obsParticipationLevel ?? "")
    : existing.obsParticipationLevel;
  const nextObsSupp = rights.canEditStudentPart && p.obsSupportNeeds !== undefined
    ? String(p.obsSupportNeeds ?? "")
    : existing.obsSupportNeeds;

  const nextParentFullName = rights.canEditParentPart && p.parentFullName !== undefined
    ? String(p.parentFullName ?? "")
    : existing.parentFullName;
  const nextParentRel = rights.canEditParentPart && p.parentRelationship !== undefined
    ? String(p.parentRelationship ?? "")
    : existing.parentRelationship;
  const nextParentContact = rights.canEditParentPart && p.parentContactChannel !== undefined
    ? String(p.parentContactChannel ?? "")
    : existing.parentContactChannel;

  const nextActions =
    rights.canEditOrientationPart && p.followUpActions !== undefined
      ? parseFollowUpActions(p.followUpActions)
      : parseFollowUpActions(existing.followUpActionsJson);

  const nextTopics =
    rights.canEditOrientationPart && p.planFurtherTopics !== undefined
      ? normalizeFurtherTopics(p.planFurtherTopics, p.newlyToggledTopic)
      : normalizeFurtherTopics(safeJsonParse(existing.planFurtherTopicsJson, []));

  const nextPlanStrengths =
    rights.canEditOrientationPart && p.planStrengthsPriority !== undefined
      ? String(p.planStrengthsPriority ?? "")
      : existing.planStrengthsPriority;

  let nextPlanGoalsActions =
    rights.canEditOrientationPart && p.planGoalsActionsText !== undefined
      ? String(p.planGoalsActionsText ?? "")
      : existing.planGoalsActionsText || "";

  // Nếu người dùng chỉ nhập bảng hành động chi tiết mà để trống ô văn bản mục V.2 -> tự động điền để không bắt nhập lặp
  if (!nextPlanGoalsActions.trim() && nextActions.length > 0) {
    nextPlanGoalsActions = formatFollowUpActionsToText(nextActions);
  }

  const nextPlanCoordinator =
    rights.canEditOrientationPart && p.planCoordinator !== undefined
      ? String(p.planCoordinator ?? "")
      : existing.planCoordinator;

  const nextPlanReviewDate =
    rights.canEditOrientationPart && p.planReviewDate !== undefined
      ? String(p.planReviewDate ?? "")
      : existing.planReviewDate;

  const nextFurtherOther =
    nextTopics.includes("KHAC")
      ? rights.canEditOrientationPart && p.planFurtherOtherText !== undefined
        ? String(p.planFurtherOtherText ?? "")
        : existing.planFurtherOtherText
      : "";

  const hasSpecificInquiry = nextTopics.some((t) => t !== "KHONG");
  const nextReferralReason = hasSpecificInquiry
    ? rights.canEditOrientationPart && p.planReferralReason !== undefined
      ? String(p.planReferralReason ?? "")
      : existing.planReferralReason
    : "";
  const nextReferralReceiver = hasSpecificInquiry
    ? rights.canEditOrientationPart && p.planReferralReceiver !== undefined
      ? String(p.planReferralReceiver ?? "")
      : existing.planReferralReceiver
    : "";

  const nextHandoverNotes =
    rights.canEditOrientationPart && p.planHandoverNotes !== undefined
      ? String(p.planHandoverNotes ?? "")
      : existing.planHandoverNotes;

  const nextInternalSensitive =
    rights.canEditOrientationPart && p.internalSensitiveNotes !== undefined
      ? String(p.internalSensitiveNotes ?? "")
      : existing.internalSensitiveNotes;

  const nextInterviewDate =
    p.interviewDate !== undefined ? String(p.interviewDate || "") : existing.interviewDate;

  // Xác định phạm vi hoàn tất theo quyền của người thao tác nếu không truyền tường minh
  const effectiveScope: PvdhValidationScope =
    params.completionScope ||
    (rights.canEditStudentPart && rights.canEditParentPart
      ? "FULL"
      : rights.canEditStudentPart
      ? "STUDENT_PART"
      : "PARENT_PART");

  const validation = validatePvdhRecordData({
    input: {
      interviewDate: nextInterviewDate,
      studentInterviewDate: p.studentInterviewDate ?? existing.studentInterviewDate ?? nextInterviewDate,
      parentInterviewDate: p.parentInterviewDate ?? existing.parentInterviewDate ?? nextInterviewDate,
      parentFullName: nextParentFullName,
      parentRelationship: nextParentRel,
      parentContactChannel: nextParentContact,
      studentResponses: nextStudentMap,
      obsStrengthsInterests: nextObsStrengths,
      obsCommunicationStyle: nextObsComm,
      obsParticipationLevel: nextObsPart,
      obsSupportNeeds: nextObsSupp,
      parentResponses: nextParentMap,
      planStrengthsPriority: nextPlanStrengths,
      planGoalsActionsText: nextPlanGoalsActions,
      followUpActions: nextActions,
      planCoordinator: nextPlanCoordinator,
      planReviewDate: nextPlanReviewDate,
      planFurtherTopics: nextTopics,
      planFurtherOtherText: nextFurtherOther,
      planReferralReason: nextReferralReason,
      planReferralReceiver: nextReferralReceiver,
      planHandoverNotes: nextHandoverNotes,
    },
    fields,
    mode: params.mode,
    scope: effectiveScope,
  });

  if (!validation.valid) {
    throw new PvdhDomainError(
      validation.issues[0].message,
      422,
      "VALIDATION_FAILED",
      { issues: validation.issues }
    );
  }

  // Tính trạng thái hoàn tất của từng phần
  const stuCheck = validatePvdhRecordData({
    input: {
      interviewDate: nextInterviewDate,
      studentResponses: nextStudentMap,
      obsStrengthsInterests: nextObsStrengths,
      obsCommunicationStyle: nextObsComm,
      obsParticipationLevel: nextObsPart,
      obsSupportNeeds: nextObsSupp,
      parentResponses: nextParentMap,
      planFurtherTopics: nextTopics,
    },
    fields,
    mode: "COMPLETE",
    scope: "STUDENT_PART",
  });
  const parCheck = validatePvdhRecordData({
    input: {
      parentFullName: nextParentFullName,
      parentRelationship: nextParentRel,
      studentResponses: nextStudentMap,
      parentResponses: nextParentMap,
      planFurtherTopics: nextTopics,
    },
    fields,
    mode: "COMPLETE",
    scope: "PARENT_PART",
  });
  const oriCheck = validatePvdhRecordData({
    input: {
      studentResponses: nextStudentMap,
      parentResponses: nextParentMap,
      planStrengthsPriority: nextPlanStrengths,
      planGoalsActionsText: nextPlanGoalsActions,
      followUpActions: nextActions,
      planCoordinator: nextPlanCoordinator,
      planReviewDate: nextPlanReviewDate,
      planFurtherTopics: nextTopics,
      planFurtherOtherText: nextFurtherOther,
      planReferralReason: nextReferralReason,
      planReferralReceiver: nextReferralReceiver,
      planHandoverNotes: nextHandoverNotes,
    },
    fields,
    mode: "COMPLETE",
    scope: "ORIENTATION_PART",
  });

  let nextStuStatus = existing.studentSectionStatus;
  let nextParStatus = existing.parentSectionStatus;
  let nextTeacherStatus = existing.teacherSectionStatus;
  let nextOriStatus = existing.orientationSectionStatus;

  if (params.mode === "COMPLETE") {
    if ((effectiveScope === "FULL" || effectiveScope === "STUDENT_PART") && stuCheck.valid) {
      nextStuStatus = "COMPLETED";
      nextTeacherStatus = "COMPLETED";
    }
    if ((effectiveScope === "FULL" || effectiveScope === "PARENT_PART") && parCheck.valid) {
      nextParStatus = "COMPLETED";
    }
    if ((effectiveScope === "FULL" || effectiveScope === "ORIENTATION_PART") && oriCheck.valid) {
      nextOriStatus = "COMPLETED";
    }
  } else {
    nextStuStatus = stuCheck.valid ? "COMPLETED" : "DRAFT";
    nextTeacherStatus = stuCheck.valid ? "COMPLETED" : "DRAFT";
    nextParStatus = parCheck.valid ? "COMPLETED" : "DRAFT";
    nextOriStatus = oriCheck.valid ? "COMPLETED" : "DRAFT";
  }

  let nextWorkflowStatus: PvdhWorkflowStatus = existing.workflowStatus as PvdhWorkflowStatus;
  if (params.mode === "COMPLETE") {
    if (stuCheck.valid && parCheck.valid && oriCheck.valid) {
      nextWorkflowStatus = "COMPLETED";
    } else {
      nextWorkflowStatus = "PARTIAL_COMPLETED";
    }
  } else if (existing.workflowStatus === "REOPENED") {
    // Nếu sửa nội dung trên bản đã mở lại -> giữ REOPENED và đảm bảo chữ ký cũ đã bị vô hiệu hóa
    nextWorkflowStatus = "REOPENED";
  } else if (!["COMPLETED", "SUBMITTED"].includes(existing.workflowStatus)) {
    nextWorkflowStatus =
      nextStuStatus === "COMPLETED" || nextParStatus === "COMPLETED" ? "PARTIAL_COMPLETED" : "DRAFT";
  }

  // Cho phép người điều phối gán người phỏng vấn HS / người trao đổi PHHS riêng biệt
  const nextStudentInterviewerUserId =
    rights.canReviewLock && p.studentInterviewerUserId !== undefined
      ? p.studentInterviewerUserId
      : rights.canEditStudentPart
      ? existing.studentInterviewerUserId || params.actor.userId
      : existing.studentInterviewerUserId;

  const nextStudentInterviewerName =
    rights.canReviewLock && p.studentInterviewerName !== undefined
      ? p.studentInterviewerName
      : rights.canEditStudentPart && (!existing.studentInterviewerName || existing.studentInterviewerUserId === params.actor.userId)
      ? p.studentInterviewerName || params.actor.userName
      : existing.studentInterviewerName;

  const nextParentInterviewerUserId =
    rights.canReviewLock && p.parentInterviewerUserId !== undefined
      ? p.parentInterviewerUserId
      : rights.canEditParentPart
      ? existing.parentInterviewerUserId || params.actor.userId
      : existing.parentInterviewerUserId;

  const nextParentInterviewerName =
    rights.canReviewLock && p.parentInterviewerName !== undefined
      ? p.parentInterviewerName
      : rights.canEditParentPart && (!existing.parentInterviewerName || existing.parentInterviewerUserId === params.actor.userId)
      ? p.parentInterviewerName || params.actor.userName
      : existing.parentInterviewerName;

  const updated = await db.pvdhAssessmentRecord.update({
    where: { id: existing.id },
    data: {
      interviewDate: nextInterviewDate,
      studentInterviewerUserId: nextStudentInterviewerUserId,
      studentInterviewerName: nextStudentInterviewerName,
      studentInterviewerTitle:
        p.studentInterviewerTitle !== undefined ? String(p.studentInterviewerTitle || "") : existing.studentInterviewerTitle,
      studentInterviewDate:
        rights.canEditStudentPart && p.studentInterviewDate !== undefined
          ? String(p.studentInterviewDate || nextInterviewDate || "")
          : existing.studentInterviewDate || nextInterviewDate,
      studentSectionStatus: nextStuStatus,
      studentCompletedAt:
        nextStuStatus === "COMPLETED" ? existing.studentCompletedAt || nowIso : null,

      parentFullName: nextParentFullName,
      parentRelationship: nextParentRel,
      parentContactChannel: nextParentContact,
      parentInterviewerUserId: nextParentInterviewerUserId,
      parentInterviewerName: nextParentInterviewerName,
      parentInterviewerTitle:
        p.parentInterviewerTitle !== undefined ? String(p.parentInterviewerTitle || "") : existing.parentInterviewerTitle,
      parentInterviewDate:
        rights.canEditParentPart && p.parentInterviewDate !== undefined
          ? String(p.parentInterviewDate || nextInterviewDate || "")
          : existing.parentInterviewDate || nextInterviewDate,
      parentSectionStatus: nextParStatus,
      parentCompletedAt:
        nextParStatus === "COMPLETED" ? existing.parentCompletedAt || nowIso : null,

      studentResponsesJson: JSON.stringify(nextStudentMap),
      obsStrengthsInterests: nextObsStrengths,
      obsCommunicationStyle: nextObsComm,
      obsParticipationLevel: nextObsPart,
      obsSupportNeeds: nextObsSupp,
      teacherSectionStatus: nextTeacherStatus,
      parentResponsesJson: JSON.stringify(nextParentMap),

      planStrengthsPriority: nextPlanStrengths,
      planGoalsActionsText: nextPlanGoalsActions,
      followUpActionsJson: JSON.stringify(nextActions),
      planCoordinator: nextPlanCoordinator,
      planReviewDate: nextPlanReviewDate,
      planFurtherTopicsJson: JSON.stringify(nextTopics),
      planFurtherOtherText: nextFurtherOther,
      planReferralReason: nextReferralReason,
      planReferralReceiver: nextReferralReceiver,
      planHandoverNotes: nextHandoverNotes,
      internalSensitiveNotes: nextInternalSensitive,
      orientationSectionStatus: nextOriStatus,

      workflowStatus: nextWorkflowStatus,
      // Nếu sửa trên bản mở lại -> vô hiệu hóa hoàn toàn xác nhận/chữ ký cũ
      confirmationType: existing.workflowStatus === "REOPENED" ? "NONE" : existing.confirmationType,
      signatureImageBase64: existing.workflowStatus === "REOPENED" ? null : existing.signatureImageBase64,
      confirmedSnapshotHash: existing.workflowStatus === "REOPENED" ? null : existing.confirmedSnapshotHash,
      lockVersion: Number(existing.lockVersion || 1) + 1,
      updatedById: params.actor.userId,
    },
  });

  await syncBackwardCompatibleOrientationSummary({
    student,
    record: updated,
    actor: params.actor,
  });

  await writeSafeAudit({
    entityType: "RECORD",
    entityId: updated.id,
    studentId: student.id,
    recordId: updated.id,
    templateCode: updated.templateCode,
    versionCode: updated.templateVersionCode,
    action: params.mode === "COMPLETE" ? "COMPLETE_SECTION" : "SAVE_DRAFT",
    actor: params.actor,
    summary:
      params.mode === "COMPLETE"
        ? `Hoàn tất dữ liệu (${effectiveScope}) cho hồ sơ ${student.studentCode}`
        : `Lưu nháp phiếu định hướng cho hồ sơ ${student.studentCode}`,
    metadata: {
      workflowStatus: updated.workflowStatus,
      lockVersion: updated.lockVersion,
    },
  });

  return getOrInitStudentPvdhWorkspace({
    actor: params.actor,
    studentId: student.id,
    attemptNumber: updated.attemptNumber,
  });
}

/**
 * Chuyển mẫu có kiểm soát khi học sinh đổi khối/hệ (chỉ người có quyền thực hiện, giữ đầy đủ lịch sử trước/sau)
 */
export async function switchRecordTemplateWithMapping(params: {
  actor: PvdhActor;
  recordId: string;
  reason: string;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const existing = await db.pvdhAssessmentRecord.findUnique({ where: { id: params.recordId } });
  if (!existing) throw new PvdhDomainError("Không tìm thấy phiếu định hướng.", 404, "NOT_FOUND");
  if (existing.isLocked) {
    throw new PvdhDomainError("Phiếu đang khóa, vui lòng mở lại trước khi chuyển mẫu.", 409, "RECORD_LOCKED");
  }

  const student = await findInputStudentByStableKey(existing.studentId);
  if (!student) throw new PvdhDomainError("Không tìm thấy hồ sơ học sinh.", 404, "STUDENT_NOT_FOUND");

  const rights = await resolveStudentPvdhAccess({
    actor: params.actor,
    student,
    existingRecord: existing,
  });
  if (!rights.canReviewLock && !params.actor.canCoordinate) {
    throw new PvdhDomainError("Chỉ người điều phối hoặc người kiểm tra mới được chuyển mẫu khi đổi khối.", 403, "FORBIDDEN");
  }

  const resolved = await resolveApplicablePvdhTemplate({
    grade: student.grade || "1",
    educationSystem: student.surveyFormType || student.surveySystem || "ALL",
    campusId: student.batch?.campusId || student.period?.campusId || "ALL",
    periodId: student.periodId || "ALL",
  });

  const beforeSnap = JSON.stringify({
    templateCode: existing.templateCode,
    templateVersionCode: existing.templateVersionCode,
    gradeAtCreation: existing.gradeAtCreation,
    studentResponses: parseInterviewMap(existing.studentResponsesJson),
    parentResponses: parseInterviewMap(existing.parentResponsesJson),
  });

  const historyArr = safeJsonParse<any[]>(existing.templateMigrationHistoryJson, []);
  historyArr.push({
    migratedAt: new Date().toISOString(),
    actorName: params.actor.userName,
    fromTemplateCode: existing.templateCode,
    fromVersionCode: existing.templateVersionCode,
    fromGrade: existing.gradeAtCreation,
    toTemplateCode: resolved.template.code,
    toVersionCode: resolved.version.versionCode,
    toGrade: String(student.grade || ""),
    reason: params.reason || "Đồng bộ theo khối dự kiến mới của hồ sơ",
  });

  const updated = await db.pvdhAssessmentRecord.update({
    where: { id: existing.id },
    data: {
      gradeAtCreation: String(student.grade || existing.gradeAtCreation),
      educationSystemAtCreation: String(student.surveyFormType || student.surveySystem || "ALL"),
      templateId: resolved.template.id,
      templateVersionId: resolved.version.id,
      templateCode: resolved.template.code,
      templateVersionNumber: resolved.version.versionNumber,
      templateVersionCode: resolved.version.versionCode,
      templateMigrationHistoryJson: JSON.stringify(historyArr),
      lockVersion: Number(existing.lockVersion || 1) + 1,
      updatedById: params.actor.userId,
    },
  });

  await db.pvdhReviewHistory.create({
    data: {
      recordId: existing.id,
      studentId: student.id,
      action: "SWITCH_TEMPLATE",
      fromStatus: existing.templateCode,
      toStatus: resolved.template.code,
      reasonOrNote: params.reason || "Chuyển mẫu có kiểm tra mapping khi đổi khối",
      beforeSnapshotJson: beforeSnap,
      afterSnapshotJson: JSON.stringify({
        templateCode: updated.templateCode,
        templateVersionCode: updated.templateVersionCode,
      }),
      actorUserId: params.actor.userId,
      actorName: params.actor.userName,
      actorRole: params.actor.role,
    },
  });

  await writeSafeAudit({
    entityType: "RECORD",
    entityId: existing.id,
    studentId: student.id,
    recordId: existing.id,
    templateCode: updated.templateCode,
    versionCode: updated.templateVersionCode,
    action: "SWITCH_TEMPLATE",
    actor: params.actor,
    summary: `Chuyển mẫu từ ${existing.templateCode} sang ${updated.templateCode} cho hồ sơ ${student.studentCode}`,
  });

  return getOrInitStudentPvdhWorkspace({
    actor: params.actor,
    studentId: student.id,
    attemptNumber: updated.attemptNumber,
  });
}

// ============================================================================
// 3. LUỒNG KIỂM TRA, TRẢ LẠI, XÁC NHẬN/KHÓA, MỞ LẠI & BÀN GIAO GVCN
// ============================================================================

async function buildRenderPayloadFromRecord(student: any, record: any, version: any): Promise<PvdhRenderPayload> {
  const sections = safeJsonParse<PvdhSectionConfig[]>(version?.sectionsJson, version?.sections || []);
  const fields = safeJsonParse<PvdhFieldConfig[]>(version?.fieldsJson, version?.fields || []);
  const exportLayout = safeJsonParse<PvdhExportLayoutConfig>(
    version?.exportLayoutJson,
    version?.exportLayout || ({} as any)
  );

  const oldSchoolParts = [student.oldSchoolName, student.className].filter(Boolean).join(" – ");

  return {
    recordId: record.id,
    attemptNumber: record.attemptNumber || 1,
    templateCode: record.templateCode,
    templateName: version?.nameSnapshot || record.templateCode,
    templateVersionCode: record.templateVersionCode || "v1.0",
    studentId: student.id,
    studentCode: student.studentCode || record.studentCode,
    studentName: student.fullName || "",
    studentDob: student.dateOfBirth,
    grade: String(record.gradeAtCreation || student.grade || ""),
    programName: student.surveyFormType || student.surveySystem || "",
    oldSchoolAndClass: oldSchoolParts || "—",
    registeredCampus:
      student.batch?.campus?.campusName ||
      student.batch?.campus?.campusCode ||
      student.registeredCampus ||
      student.admissionCampus ||
      "",
    periodCode: student.period?.code || record.periodId,
    periodName: student.period?.name || "",
    interviewDate: record.interviewDate || record.studentInterviewDate,
    studentInterviewerName: record.studentInterviewerName,
    studentInterviewerTitle: record.studentInterviewerTitle,
    parentInterviewerName: record.parentInterviewerName,
    parentInterviewerTitle: record.parentInterviewerTitle,
    parentFullName: record.parentFullName,
    parentRelationship: record.parentRelationship,
    parentContactChannel: record.parentContactChannel,
    sections,
    fields,
    exportLayout,
    studentResponses: parseInterviewMap(record.studentResponsesJson),
    obsStrengthsInterests: record.obsStrengthsInterests,
    obsCommunicationStyle: record.obsCommunicationStyle,
    obsParticipationLevel: record.obsParticipationLevel,
    obsSupportNeeds: record.obsSupportNeeds,
    parentResponses: parseInterviewMap(record.parentResponsesJson),
    planStrengthsPriority: record.planStrengthsPriority,
    planGoalsActionsText: record.planGoalsActionsText,
    followUpActions: parseFollowUpActions(record.followUpActionsJson),
    planCoordinator: record.planCoordinator,
    planReviewDate: record.planReviewDate,
    planFurtherTopics: normalizeFurtherTopics(safeJsonParse(record.planFurtherTopicsJson, [])),
    planFurtherOtherText: record.planFurtherOtherText,
    planReferralReason: record.planReferralReason,
    planReferralReceiver: record.planReferralReceiver,
    planHandoverNotes: record.planHandoverNotes,
    workflowStatus: record.workflowStatus,
    isLocked: Boolean(record.isLocked),
    confirmationType: record.confirmationType,
    confirmedByName: record.confirmedByName,
    confirmedByRole: record.confirmedByRole,
    signatureImageBase64: record.signatureImageBase64,
    confirmedAt: record.confirmedAt,
    confirmedSnapshotHash: record.confirmedSnapshotHash,
  };
}

export async function executePvdhWorkflowTransition(params: {
  actor: PvdhActor;
  recordId: string;
  action: "SUBMIT_REVIEW" | "RETURN_SUPPLEMENT" | "VERIFY_LOCK" | "REOPEN" | "CREATE_NEW_ATTEMPT";
  reasonOrNote?: string;
  useSignatureProfile?: boolean;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const existing = await db.pvdhAssessmentRecord.findUnique({ where: { id: params.recordId } });
  if (!existing) throw new PvdhDomainError("Không tìm thấy phiếu định hướng.", 404, "NOT_FOUND");

  const student = await findInputStudentByStableKey(existing.studentId);
  if (!student) throw new PvdhDomainError("Không tìm thấy hồ sơ học sinh.", 404, "STUDENT_NOT_FOUND");

  const rights = await resolveStudentPvdhAccess({
    actor: params.actor,
    student,
    existingRecord: existing,
  });
  if (!rights.allowedToRead) {
    throw new PvdhDomainError("Không có quyền thao tác trên hồ sơ này.", 403, "FORBIDDEN");
  }

  const ver = await db.pvdhTemplateVersion.findUnique({
    where: { id: existing.templateVersionId },
  });
  const fields = safeJsonParse<PvdhFieldConfig[]>(ver?.fieldsJson, []);
  const nowIso = new Date().toISOString();

  if (params.action === "CREATE_NEW_ATTEMPT") {
    if (!rights.canReviewLock && !params.actor.canCoordinate) {
      throw new PvdhDomainError("Chỉ người điều phối/kiểm tra mới được tạo lần khảo sát định hướng mới.", 403, "FORBIDDEN");
    }
    const allAttempts = await db.pvdhAssessmentRecord.findMany({
      where: { studentId: student.id, periodId: student.periodId },
      orderBy: [{ attemptNumber: "desc" }],
    });
    const nextAttempt = (allAttempts[0]?.attemptNumber || 1) + 1;
    for (const a of allAttempts) {
      if (a.isLatestAttempt) {
        await db.pvdhAssessmentRecord.update({
          where: { id: a.id },
          data: { isLatestAttempt: false },
        });
      }
    }
    const resolved = await resolveApplicablePvdhTemplate({
      grade: student.grade || "1",
      educationSystem: student.surveyFormType || student.surveySystem || "ALL",
      campusId: student.batch?.campusId || student.period?.campusId || "ALL",
      periodId: student.periodId || "ALL",
    });

    const newRec = await db.pvdhAssessmentRecord.create({
      data: {
        studentId: student.id,
        studentCode: student.studentCode,
        periodId: student.periodId,
        batchId: student.batchId || null,
        campusId: student.batch?.campusId || student.period?.campusId || null,
        attemptNumber: nextAttempt,
        isLatestAttempt: true,
        gradeAtCreation: String(student.grade || "1"),
        educationSystemAtCreation: String(student.surveyFormType || student.surveySystem || "ALL"),
        templateId: resolved.template.id,
        templateVersionId: resolved.version.id,
        templateCode: resolved.template.code,
        templateVersionNumber: resolved.version.versionNumber,
        templateVersionCode: resolved.version.versionCode,
        interviewDate: nowIso.split("T")[0],
        parentFullName: existing.parentFullName,
        parentRelationship: existing.parentRelationship,
        parentContactChannel: existing.parentContactChannel,
        workflowStatus: "DRAFT",
        isLocked: false,
        lockVersion: 1,
        createdById: params.actor.userId,
        updatedById: params.actor.userId,
      },
    });

    await writeSafeAudit({
      entityType: "RECORD",
      entityId: newRec.id,
      studentId: student.id,
      recordId: newRec.id,
      templateCode: newRec.templateCode,
      versionCode: newRec.templateVersionCode,
      action: "CREATE_NEW_ATTEMPT",
      actor: params.actor,
      summary: `Tạo lần khảo sát định hướng thứ #${nextAttempt} cho hồ sơ ${student.studentCode}`,
    });

    return getOrInitStudentPvdhWorkspace({
      actor: params.actor,
      studentId: student.id,
      attemptNumber: nextAttempt,
    });
  }

  // Kiểm tra đầy đủ toàn bộ 5 mục khi Gửi kiểm tra hoặc Xác nhận/Khóa
  if (params.action === "SUBMIT_REVIEW" || params.action === "VERIFY_LOCK") {
    const fullCheck = validatePvdhRecordData({
      input: {
        interviewDate: existing.interviewDate,
        parentFullName: existing.parentFullName,
        parentRelationship: existing.parentRelationship,
        studentResponses: parseInterviewMap(existing.studentResponsesJson),
        obsStrengthsInterests: existing.obsStrengthsInterests,
        obsCommunicationStyle: existing.obsCommunicationStyle,
        obsParticipationLevel: existing.obsParticipationLevel,
        obsSupportNeeds: existing.obsSupportNeeds,
        parentResponses: parseInterviewMap(existing.parentResponsesJson),
        planStrengthsPriority: existing.planStrengthsPriority,
        planGoalsActionsText: existing.planGoalsActionsText,
        followUpActions: parseFollowUpActions(existing.followUpActionsJson),
        planCoordinator: existing.planCoordinator,
        planReviewDate: existing.planReviewDate,
        planFurtherTopics: normalizeFurtherTopics(safeJsonParse(existing.planFurtherTopicsJson, [])),
        planFurtherOtherText: existing.planFurtherOtherText,
        planReferralReason: existing.planReferralReason,
        planReferralReceiver: existing.planReferralReceiver,
        planHandoverNotes: existing.planHandoverNotes,
      },
      fields,
      mode: "COMPLETE",
      scope: "FULL",
    });

    if (!fullCheck.valid) {
      throw new PvdhDomainError(
        fullCheck.issues[0].message,
        422,
        "VALIDATION_FAILED",
        { issues: fullCheck.issues }
      );
    }
  }

  if (params.action === "SUBMIT_REVIEW") {
    if (!rights.canEditStudentPart && !rights.canEditParentPart && !rights.canReviewLock) {
      throw new PvdhDomainError("Không có quyền gửi kiểm tra phiếu này.", 403, "FORBIDDEN");
    }
    const updated = await db.pvdhAssessmentRecord.update({
      where: { id: existing.id },
      data: {
        workflowStatus: "SUBMITTED",
        studentSectionStatus: "COMPLETED",
        teacherSectionStatus: "COMPLETED",
        parentSectionStatus: "COMPLETED",
        orientationSectionStatus: "COMPLETED",
        lockVersion: Number(existing.lockVersion || 1) + 1,
        updatedById: params.actor.userId,
      },
    });
    await db.pvdhReviewHistory.create({
      data: {
        recordId: existing.id,
        studentId: student.id,
        action: "SUBMIT_REVIEW",
        fromStatus: existing.workflowStatus,
        toStatus: "SUBMITTED",
        reasonOrNote: params.reasonOrNote || "Gửi kiểm tra/xác nhận phiếu định hướng",
        actorUserId: params.actor.userId,
        actorName: params.actor.userName,
        actorRole: params.actor.role,
      },
    });
    await syncBackwardCompatibleOrientationSummary({ student, record: updated, actor: params.actor });
    return getOrInitStudentPvdhWorkspace({ actor: params.actor, studentId: student.id });
  }

  if (params.action === "RETURN_SUPPLEMENT") {
    if (!rights.canReviewLock) {
      throw new PvdhDomainError("Bạn không có thẩm quyền trả lại yêu cầu bổ sung.", 403, "FORBIDDEN");
    }
    const reason = String(params.reasonOrNote || "").trim();
    if (reason.length < 3) {
      throw new PvdhDomainError("Vui lòng nhập lý do trả lại bổ sung (tối thiểu 3 ký tự).", 400, "MISSING_REASON");
    }
    await db.pvdhAssessmentRecord.update({
      where: { id: existing.id },
      data: {
        workflowStatus: "RETURNED",
        isLocked: false,
        returnReason: reason,
        returnedByUserId: params.actor.userId,
        returnedByName: params.actor.userName,
        returnedAt: nowIso,
        lockVersion: Number(existing.lockVersion || 1) + 1,
        updatedById: params.actor.userId,
      },
    });
    await db.pvdhReviewHistory.create({
      data: {
        recordId: existing.id,
        studentId: student.id,
        action: "RETURN_SUPPLEMENT",
        fromStatus: existing.workflowStatus,
        toStatus: "RETURNED",
        reasonOrNote: reason,
        actorUserId: params.actor.userId,
        actorName: params.actor.userName,
        actorRole: params.actor.role,
      },
    });
    await writeSafeAudit({
      entityType: "RECORD",
      entityId: existing.id,
      studentId: student.id,
      recordId: existing.id,
      templateCode: existing.templateCode,
      versionCode: existing.templateVersionCode,
      action: "RETURN_SUPPLEMENT",
      actor: params.actor,
      summary: `Trả lại bổ sung phiếu định hướng hồ sơ ${student.studentCode}`,
    });
    return getOrInitStudentPvdhWorkspace({ actor: params.actor, studentId: student.id });
  }

  if (params.action === "VERIFY_LOCK") {
    if (!rights.canReviewLock && !(params.useSignatureProfile && (rights.canEditStudentPart || rights.canEditParentPart))) {
      throw new PvdhDomainError("Bạn không có quyền xác nhận/khóa phiếu định hướng này.", 403, "FORBIDDEN");
    }

    let confirmationType: "SYSTEM_CONFIRMATION" | "SIGNATURE_IMAGE" | "CERTIFICATE_CA" = "SYSTEM_CONFIRMATION";
    let signatureImageBase64: string | null = null;

    if (params.useSignatureProfile && params.actor.teacherId) {
      const sigProfile = await prisma.teacherSignatureProfile
        .findUnique({ where: { teacherId: params.actor.teacherId } })
        .catch(() => null);

      if (sigProfile) {
        if (sigProfile.connectionStatus === "CONNECTED" && sigProfile.serialNumber) {
          confirmationType = "CERTIFICATE_CA";
          signatureImageBase64 = sigProfile.visualAppearanceUrl || null;
        } else if (sigProfile.visualAppearanceUrl) {
          // Chỉ có ảnh chữ ký -> ghi nhận chính xác SIGNATURE_IMAGE ("Ký xác nhận bằng ảnh chữ ký")
          confirmationType = "SIGNATURE_IMAGE";
          signatureImageBase64 = sigProfile.visualAppearanceUrl;
        }
      }
    }

    const tempConfirmed = {
      ...existing,
      workflowStatus: "VERIFIED_LOCKED",
      isLocked: true,
      confirmationType,
      confirmedByUserId: params.actor.userId,
      confirmedByName: params.actor.userName,
      confirmedByRole: params.actor.role,
      signatureImageBase64,
      confirmedAt: nowIso,
    };

    const renderPayload = await buildRenderPayloadFromRecord(student, tempConfirmed, ver);
    const snapshotJson = JSON.stringify(renderPayload);
    const snapshotHash = crypto.createHash("sha256").update(snapshotJson).digest("hex");
    renderPayload.confirmedSnapshotHash = snapshotHash;

    const { pdfBuffer, htmlContent, pdfSha256, fileName } = await generatePvdhPdfBuffer(renderPayload);
    const savedFile = await savePrivatePvdhPdf({
      recordId: existing.id,
      attemptNumber: existing.attemptNumber || 1,
      fileName,
      pdfBuffer,
      htmlContent,
    });

    const updated = await db.pvdhAssessmentRecord.update({
      where: { id: existing.id },
      data: {
        workflowStatus: "VERIFIED_LOCKED",
        isLocked: true,
        studentSectionStatus: "COMPLETED",
        teacherSectionStatus: "COMPLETED",
        parentSectionStatus: "COMPLETED",
        orientationSectionStatus: "COMPLETED",
        confirmationType,
        confirmedByUserId: params.actor.userId,
        confirmedByName: params.actor.userName,
        confirmedByRole: params.actor.role,
        signatureImageBase64,
        confirmedAt: nowIso,
        confirmedSnapshotJson: snapshotJson,
        confirmedSnapshotHash: snapshotHash,
        lockVersion: Number(existing.lockVersion || 1) + 1,
        updatedById: params.actor.userId,
      },
    });

    await db.pvdhGeneratedDocument.create({
      data: {
        recordId: existing.id,
        studentId: student.id,
        periodId: student.periodId,
        templateCode: existing.templateCode,
        templateVersionCode: existing.templateVersionCode,
        attemptNumber: existing.attemptNumber || 1,
        documentStatus: "CONFIRMED",
        format: "PDF",
        fileName,
        storageKey: savedFile.storageKey,
        fileSha256: pdfSha256,
        fileSizeBytes: pdfBuffer.length,
        snapshotJson,
        generatedByUserId: params.actor.userId,
        generatedByName: params.actor.userName,
      },
    });

    await db.pvdhReviewHistory.create({
      data: {
        recordId: existing.id,
        studentId: student.id,
        action: "VERIFY_LOCK",
        fromStatus: existing.workflowStatus,
        toStatus: "VERIFIED_LOCKED",
        reasonOrNote: params.reasonOrNote || "Xác nhận và khóa phiếu định hướng",
        actorUserId: params.actor.userId,
        actorName: params.actor.userName,
        actorRole: params.actor.role,
      },
    });

    await syncBackwardCompatibleOrientationSummary({ student, record: updated, actor: params.actor });

    await writeSafeAudit({
      entityType: "RECORD",
      entityId: existing.id,
      studentId: student.id,
      recordId: existing.id,
      templateCode: existing.templateCode,
      versionCode: existing.templateVersionCode,
      action: "VERIFY_LOCK",
      actor: params.actor,
      summary: `Xác nhận và khóa phiếu ${existing.templateCode} (${existing.templateVersionCode}) cho hồ sơ ${student.studentCode}`,
      metadata: { confirmationType, snapshotHash },
    });

    return getOrInitStudentPvdhWorkspace({ actor: params.actor, studentId: student.id });
  }

  if (params.action === "REOPEN") {
    if (!rights.canReopen) {
      throw new PvdhDomainError("Chỉ người có thẩm quyền mới được mở lại phiếu đã khóa.", 403, "FORBIDDEN");
    }
    const reason = String(params.reasonOrNote || "").trim();
    if (reason.length < 5) {
      throw new PvdhDomainError("Bắt buộc nhập lý do mở lại phiếu (tối thiểu 5 ký tự).", 400, "MISSING_REASON");
    }

    const beforeSnapshot = existing.confirmedSnapshotJson || JSON.stringify({
      workflowStatus: existing.workflowStatus,
      confirmationType: existing.confirmationType,
      confirmedAt: existing.confirmedAt,
      confirmedByName: existing.confirmedByName,
    });

    // Vô hiệu hóa các bản PDF đã xác nhận trước đó của phiên bản cũ
    const prevDocs = await db.pvdhGeneratedDocument.findMany({
      where: { recordId: existing.id, documentStatus: "CONFIRMED" },
    });
    for (const d of prevDocs) {
      await db.pvdhGeneratedDocument.update({
        where: { id: d.id },
        data: { documentStatus: "INVALIDATED" },
      });
    }

    await db.pvdhAssessmentRecord.update({
      where: { id: existing.id },
      data: {
        workflowStatus: "REOPENED",
        isLocked: false,
        confirmationType: "NONE",
        confirmedByUserId: null,
        confirmedByName: null,
        confirmedByRole: null,
        confirmedAt: null,
        signatureImageBase64: null,
        confirmedSnapshotHash: null,
        reopenReason: reason,
        reopenedByUserId: params.actor.userId,
        reopenedByName: params.actor.userName,
        reopenedAt: nowIso,
        lockVersion: Number(existing.lockVersion || 1) + 1,
        updatedById: params.actor.userId,
      },
    });

    await db.pvdhReviewHistory.create({
      data: {
        recordId: existing.id,
        studentId: student.id,
        action: "REOPEN",
        fromStatus: existing.workflowStatus,
        toStatus: "REOPENED",
        reasonOrNote: reason,
        beforeSnapshotJson: beforeSnapshot,
        afterSnapshotJson: JSON.stringify({ workflowStatus: "REOPENED", isLocked: false }),
        actorUserId: params.actor.userId,
        actorName: params.actor.userName,
        actorRole: params.actor.role,
      },
    });

    await writeSafeAudit({
      entityType: "RECORD",
      entityId: existing.id,
      studentId: student.id,
      recordId: existing.id,
      templateCode: existing.templateCode,
      versionCode: existing.templateVersionCode,
      action: "REOPEN_LOCKED_RECORD",
      actor: params.actor,
      summary: `Mở lại phiếu đã khóa hồ sơ ${student.studentCode} (vô hiệu hóa xác nhận cũ, yêu cầu xác nhận lại)`,
      metadata: { reasonLength: reason.length },
    });

    return getOrInitStudentPvdhWorkspace({ actor: params.actor, studentId: student.id });
  }

  throw new PvdhDomainError("Thao tác quy trình không hợp lệ.", 400, "INVALID_ACTION");
}

// ============================================================================
// 4. BÀN GIAO BẢN ĐÃ XÁC NHẬN CHO GVCN SAU NHẬP HỌC
// ============================================================================

export async function handoverConfirmedPvdhToGvcn(params: {
  actor: PvdhActor;
  recordId: string;
  targetClassId?: string;
  includeSensitiveNotes?: boolean;
  handoverNote?: string;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const record = await db.pvdhAssessmentRecord.findUnique({ where: { id: params.recordId } });
  if (!record) throw new PvdhDomainError("Không tìm thấy phiếu định hướng.", 404, "NOT_FOUND");
  if (!record.isLocked) {
    throw new PvdhDomainError(
      "Chỉ được bàn giao cho GVCN sau khi phiếu định hướng đã được xác nhận và khóa.",
      409,
      "NOT_CONFIRMED"
    );
  }

  const student = await findInputStudentByStableKey(record.studentId);
  if (!student) throw new PvdhDomainError("Không tìm thấy hồ sơ học sinh.", 404, "STUDENT_NOT_FOUND");

  const rights = await resolveStudentPvdhAccess({ actor: params.actor, student, existingRecord: record });
  if (!rights.canHandover) {
    throw new PvdhDomainError("Bạn không có quyền bàn giao hồ sơ định hướng sau nhập học.", 403, "FORBIDDEN");
  }

  // Xác định lớp nhập học thực tế của học sinh
  let resolvedClassId = params.targetClassId || student.enrollmentClassId || null;
  let enrolledStudentId: string | null = null;

  const codeKey = student.enrollmentCode || student.studentCode;
  if (codeKey) {
    const enrolledStu = await prisma.student
      .findFirst({
        where: { studentCode: String(codeKey) },
        orderBy: { id: "desc" },
        select: { id: true, classId: true },
      })
      .catch(() => null);
    if (enrolledStu) {
      enrolledStudentId = enrolledStu.id;
      if (!resolvedClassId) resolvedClassId = enrolledStu.classId;
    }
  }

  if (!resolvedClassId) {
    throw new PvdhDomainError(
      "Học sinh chưa có lớp nhập học chính thức. Vui lòng xếp lớp nhập học trước khi bàn giao cho GVCN.",
      422,
      "NOT_ENROLLED_TO_CLASS"
    );
  }

  const targetClass = await prisma.class
    .findUnique({
      where: { id: resolvedClassId },
      include: {
        teachers: { include: { teacher: true } },
      },
    })
    .catch(() => null);

  if (!targetClass) {
    throw new PvdhDomainError("Không tìm thấy lớp nhập học đích.", 404, "CLASS_NOT_FOUND");
  }

  let gvcnTeacher: { id: string; userId: string; teacherName: string } | null = null;
  if (targetClass.homeroomTeacherId) {
    const ids = String(targetClass.homeroomTeacherId)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      gvcnTeacher = await prisma.teacher
        .findFirst({
          where: {
            OR: [{ id: { in: ids } }, { userId: { in: ids } }, { teacherCode: { in: ids } }],
          },
          select: { id: true, userId: true, teacherName: true },
        })
        .catch(() => null);
    }
  }
  if (!gvcnTeacher && targetClass.teachers?.length) {
    const hr = targetClass.teachers.find((t: any) =>
      ["HOMEROOM", "GVCN"].includes(String(t.roleInClass || "").toUpperCase())
    );
    if (hr?.teacher) {
      gvcnTeacher = {
        id: hr.teacher.id,
        userId: hr.teacher.userId,
        teacherName: hr.teacher.teacherName,
      };
    }
  }

  const ver = await db.pvdhTemplateVersion.findUnique({ where: { id: record.templateVersionId } });
  const snapshotObj = record.confirmedSnapshotJson
    ? safeJsonParse<any>(record.confirmedSnapshotJson, {})
    : await buildRenderPayloadFromRecord(student, record, ver);

  const handover = await db.pvdhHandover.create({
    data: {
      recordId: record.id,
      studentId: student.id,
      enrolledStudentId,
      studentCode: student.enrollmentCode || student.studentCode,
      periodId: student.periodId,
      campusId: targetClass.campusId,
      targetClassId: targetClass.id,
      targetClassName: targetClass.className,
      targetGvcnTeacherId: gvcnTeacher?.id || null,
      targetGvcnUserId: gvcnTeacher?.userId || null,
      targetGvcnName: gvcnTeacher?.teacherName || null,
      handoverSnapshotJson: JSON.stringify(snapshotObj),
      includeSensitiveNotes: Boolean(params.includeSensitiveNotes),
      handoverNote: params.handoverNote || null,
      handedOverByUserId: params.actor.userId,
      handedOverByName: params.actor.userName,
      receiveStatus: "PENDING_RECEIPT",
    },
  });

  await db.pvdhAssessmentRecord.update({
    where: { id: record.id },
    data: {
      workflowStatus: "HANDED_OVER",
      updatedById: params.actor.userId,
    },
  });

  await db.pvdhReviewHistory.create({
    data: {
      recordId: record.id,
      studentId: student.id,
      action: "HANDOVER",
      fromStatus: record.workflowStatus,
      toStatus: "HANDED_OVER",
      reasonOrNote: `Bàn giao cho GVCN lớp ${targetClass.className}${gvcnTeacher ? ` (${gvcnTeacher.teacherName})` : ""}`,
      actorUserId: params.actor.userId,
      actorName: params.actor.userName,
      actorRole: params.actor.role,
    },
  });

  await writeSafeAudit({
    entityType: "HANDOVER",
    entityId: handover.id,
    studentId: student.id,
    recordId: record.id,
    templateCode: record.templateCode,
    versionCode: record.templateVersionCode,
    action: "HANDOVER_TO_GVCN",
    actor: params.actor,
    summary: `Bàn giao phiếu định hướng đã xác nhận của ${student.studentCode} cho GVCN lớp ${targetClass.className}`,
    metadata: { targetClassId: targetClass.id, targetClassName: targetClass.className },
  });

  return handover;
}

export async function acknowledgePvdhHandoverByGvcn(params: {
  actor: PvdhActor;
  handoverId: string;
  gvcnFeedbackNote?: string;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const handover = await db.pvdhHandover.findUnique({ where: { id: params.handoverId } });
  if (!handover) throw new PvdhDomainError("Không tìm thấy bản ghi bàn giao.", 404, "NOT_FOUND");

  const isTargetGvcn =
    (handover.targetGvcnUserId && handover.targetGvcnUserId === params.actor.userId) ||
    (params.actor.teacherId && handover.targetGvcnTeacherId === params.actor.teacherId);

  let isClassHomeroom = isTargetGvcn;
  if (!isClassHomeroom && params.actor.teacherId) {
    const cls = await prisma.class
      .findUnique({
        where: { id: handover.targetClassId },
        include: { teachers: true },
      })
      .catch(() => null);
    if (cls) {
      const hrIds = String(cls.homeroomTeacherId || "").split(",").map((x) => x.trim());
      if (hrIds.includes(params.actor.teacherId) || hrIds.includes(params.actor.userId)) {
        isClassHomeroom = true;
      } else if (
        (cls.teachers || []).some(
          (t) =>
            t.teacherId === params.actor.teacherId &&
            ["HOMEROOM", "GVCN"].includes(String(t.roleInClass || "").toUpperCase())
        )
      ) {
        isClassHomeroom = true;
      }
    }
  }

  if (!isClassHomeroom && !params.actor.isSystemWideAdmin) {
    throw new PvdhDomainError(
      "Chỉ Giáo viên chủ nhiệm đúng lớp được bàn giao mới có quyền xác nhận tiếp nhận.",
      403,
      "FORBIDDEN"
    );
  }

  const updated = await db.pvdhHandover.update({
    where: { id: handover.id },
    data: {
      receiveStatus: "ACKNOWLEDGED",
      acknowledgedByUserId: params.actor.userId,
      acknowledgedByName: params.actor.userName,
      acknowledgedAt: new Date().toISOString(),
      gvcnFeedbackNote: params.gvcnFeedbackNote || handover.gvcnFeedbackNote || null,
    },
  });

  await writeSafeAudit({
    entityType: "HANDOVER",
    entityId: handover.id,
    studentId: handover.studentId,
    recordId: handover.recordId,
    action: "GVCN_ACKNOWLEDGE_HANDOVER",
    actor: params.actor,
    summary: `GVCN xác nhận tiếp nhận bàn giao định hướng cho HS ${handover.studentCode} (Lớp ${handover.targetClassName})`,
  });

  return updated;
}

export async function listGvcnHandoversForActor(actor: PvdhActor) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  if (actor.isSystemWideAdmin) {
    return db.pvdhHandover.findMany({ orderBy: [{ handedOverAt: "desc" }], take: 100 });
  }

  const classIdSet = new Set<string>();
  if (actor.teacherId) {
    const [hrClasses, tcaClasses] = await Promise.all([
      prisma.class
        .findMany({
          where: {
            OR: [
              { homeroomTeacherId: { contains: actor.teacherId } },
              { homeroomTeacherId: { contains: actor.userId } },
            ],
          },
          select: { id: true },
        })
        .catch(() => []),
      (prisma as any).teacherClassAssignment
        ? (prisma as any).teacherClassAssignment
            .findMany({
              where: {
                teacherId: actor.teacherId,
                roleInClass: { in: ["HOMEROOM", "GVCN"] },
              },
              select: { classId: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);
    hrClasses.forEach((c: any) => classIdSet.add(c.id));
    tcaClasses.forEach((c: any) => classIdSet.add(c.classId));
  }

  const all = await db.pvdhHandover.findMany({ orderBy: [{ handedOverAt: "desc" }] });
  return all.filter(
    (h: any) =>
      h.targetGvcnUserId === actor.userId ||
      (actor.teacherId && h.targetGvcnTeacherId === actor.teacherId) ||
      classIdSet.has(h.targetClassId)
  );
}

// ============================================================================
// 5. XUẤT FILE PDF ĐƠN LẺ (ĐÚNG PHIÊN BẢN ĐÃ CHỌN) & XUẤT HÀNG LOẠT / EXCEL
// ============================================================================

export async function getPvdhDocumentOutput(params: {
  actor: PvdhActor;
  studentId: string;
  attemptNumber?: number;
  format: "pdf" | "html";
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const student = await findInputStudentByStableKey(params.studentId);
  if (!student) throw new PvdhDomainError("Không tìm thấy hồ sơ học sinh.", 404, "STUDENT_NOT_FOUND");

  const record = params.attemptNumber
    ? await db.pvdhAssessmentRecord.findFirst({
        where: {
          studentId: student.id,
          periodId: student.periodId,
          attemptNumber: params.attemptNumber,
        },
      })
    : await db.pvdhAssessmentRecord.findFirst({
        where: { studentId: student.id, isLatestAttempt: true },
        orderBy: [{ attemptNumber: "desc" }],
      });

  const rights = await resolveStudentPvdhAccess({
    actor: params.actor,
    student,
    existingRecord: record,
  });

  if (!rights.allowedToRead) {
    throw new PvdhDomainError("Bạn không có quyền tải phiếu định hướng của học sinh này.", 403, "FORBIDDEN");
  }

  // Nếu phiếu đã khóa và có bản snapshot phiên bản cố định -> luôn xuất đúng phiên bản đã chốt,
  // KHÔNG âm thầm dùng cấu hình mới!
  if (record?.isLocked && record.confirmedSnapshotJson) {
    const pinnedSnapshot = safeJsonParse<PvdhRenderPayload>(record.confirmedSnapshotJson, null as any);
    if (pinnedSnapshot) {
      if (params.format === "html") {
        return {
          contentType: "text/html; charset=utf-8",
          fileName: `${record.templateCode}_${student.studentCode}_${record.templateVersionCode}.html`,
          buffer: Buffer.from(buildPvdhDocumentHtml(pinnedSnapshot), "utf-8"),
        };
      }

      const docs = await db.pvdhGeneratedDocument.findMany({
        where: { recordId: record.id, documentStatus: "CONFIRMED" },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      });
      if (docs[0]?.storageKey) {
        const storedBuf = await readPrivatePvdhPdf(docs[0].storageKey);
        if (storedBuf) {
          return {
            contentType: "application/pdf",
            fileName: docs[0].fileName,
            buffer: storedBuf,
          };
        }
      }

      const regen = await generatePvdhPdfBuffer(pinnedSnapshot);
      return {
        contentType: "application/pdf",
        fileName: regen.fileName,
        buffer: regen.pdfBuffer,
      };
    }
  }

  let ver: any = null;
  let effectiveRec: any = record;
  if (effectiveRec) {
    ver = await db.pvdhTemplateVersion.findUnique({ where: { id: effectiveRec.templateVersionId } });
  } else {
    const resolved = await resolveApplicablePvdhTemplate({
      grade: student.grade || "1",
      educationSystem: student.surveyFormType || student.surveySystem || "ALL",
      campusId: student.batch?.campusId || student.period?.campusId || "ALL",
      periodId: student.periodId || "ALL",
    });
    ver = resolved.version;
    effectiveRec = {
      id: "PREVIEW_DRAFT",
      attemptNumber: 1,
      templateCode: resolved.template.code,
      templateVersionCode: resolved.version.versionCode,
      gradeAtCreation: student.grade || "1",
      workflowStatus: "DRAFT",
      isLocked: false,
      studentResponsesJson: "{}",
      parentResponsesJson: "{}",
      planFurtherTopicsJson: "[]",
      followUpActionsJson: "[]",
    };
  }

  const renderPayload = await buildRenderPayloadFromRecord(student, effectiveRec, ver);
  if (params.format === "html") {
    return {
      contentType: "text/html; charset=utf-8",
      fileName: `${renderPayload.templateCode}_${student.studentCode}_${renderPayload.templateVersionCode}.html`,
      buffer: Buffer.from(buildPvdhDocumentHtml(renderPayload), "utf-8"),
    };
  }

  const generated = await generatePvdhPdfBuffer(renderPayload);

  await writeSafeAudit({
    entityType: "EXPORT",
    entityId: effectiveRec.id,
    studentId: student.id,
    recordId: effectiveRec.id,
    templateCode: renderPayload.templateCode,
    versionCode: renderPayload.templateVersionCode,
    action: "DOWNLOAD_SINGLE_PDF",
    actor: params.actor,
    summary: `Tải PDF phiếu định hướng ${renderPayload.templateCode} (${renderPayload.templateVersionCode}) cho hồ sơ ${student.studentCode}`,
  });

  return {
    contentType: "application/pdf",
    fileName: generated.fileName,
    buffer: generated.pdfBuffer,
  };
}

/**
 * Job xuất hàng loạt ZIP (chứa từng PDF riêng biệt) hoặc Excel danh sách tổng hợp theo đúng quyền người gọi,
 * có báo cáo tiến độ & danh sách lỗi từng hồ sơ (không phát hành link công khai!).
 */
export async function runBatchPvdhExportJob(params: {
  actor: PvdhActor;
  studentIds: string[];
  exportType: "PDF_ZIP" | "EXCEL_SUMMARY";
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const ids = Array.from(new Set((params.studentIds || []).filter(Boolean))).slice(0, 150);
  if (ids.length === 0) {
    throw new PvdhDomainError("Danh sách hồ sơ cần xuất đang trống.", 400, "EMPTY_SELECTION");
  }

  const resultsReport: Array<{
    studentId: string;
    studentCode?: string;
    status: "SUCCESS" | "SKIPPED_FORBIDDEN" | "ERROR";
    fileName?: string;
    error?: string;
  }> = [];

  if (params.exportType === "PDF_ZIP") {
    const zip = new JSZip();
    let successCount = 0;

    for (const sid of ids) {
      try {
        const doc = await getPvdhDocumentOutput({
          actor: params.actor,
          studentId: sid,
          format: "pdf",
        });
        zip.file(doc.fileName, doc.buffer);
        successCount++;
        resultsReport.push({
          studentId: sid,
          status: "SUCCESS",
          fileName: doc.fileName,
        });
      } catch (err: any) {
        const isForbidden = err instanceof PvdhDomainError && err.statusCode === 403;
        resultsReport.push({
          studentId: sid,
          status: isForbidden ? "SKIPPED_FORBIDDEN" : "ERROR",
          error: err?.message || "Lỗi kết xuất PDF",
        });
      }
    }

    if (successCount === 0) {
      throw new PvdhDomainError(
        "Không có hồ sơ nào đủ quyền hoặc hợp lệ để kết xuất hàng loạt.",
        403,
        "BATCH_EXPORT_NONE_ALLOWED",
        { report: resultsReport }
      );
    }

    zip.file(
      "_BAO_CAO_TIEN_DO_XUAT_PHIEU.json",
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          exportedBy: params.actor.userName,
          totalRequested: ids.length,
          successCount,
          failedOrSkippedCount: ids.length - successCount,
          items: resultsReport,
        },
        null,
        2
      )
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    await writeSafeAudit({
      entityType: "EXPORT",
      entityId: `batch_${Date.now()}`,
      action: "BATCH_EXPORT_PDF_ZIP",
      actor: params.actor,
      summary: `Xuất hàng loạt PDF định hướng (${successCount}/${ids.length} hồ sơ thành công)`,
      metadata: { totalRequested: ids.length, successCount },
    });

    return {
      contentType: "application/zip",
      fileName: `PVDH_HangLoat_${new Date().toISOString().slice(0, 10)}.zip`,
      buffer: zipBuffer,
      report: resultsReport,
    };
  } else {
    const summaryRows: any[] = [];
    for (const sid of ids) {
      try {
        const ws = await getOrInitStudentPvdhWorkspace({
          actor: params.actor,
          studentId: sid,
        });
        const rec = ws.record;
        const st = ws.student;
        const statusInfo =
          PVDH_WORKFLOW_STATUS_LABELS[(rec?.workflowStatus as PvdhWorkflowStatus) || "DRAFT"] ||
          PVDH_WORKFLOW_STATUS_LABELS.DRAFT;
        const topicsLabel = (rec?.planFurtherTopics || []).join(", ") || "Chưa nhập";
        const latestHandover = ws.handovers?.[0];

        summaryRows.push({
          studentCode: st.studentCode,
          studentName: st.fullName,
          grade: String(st.grade || ""),
          programName: st.surveySystem || "",
          campusName: st.registeredCampus || "",
          periodName: st.periodName || "",
          templateCode: rec?.templateCode || ws.version?.templateCode || "",
          templateVersionCode: rec?.templateVersionCode || ws.version?.versionCode || "",
          workflowStatusLabel: rec ? statusInfo.label : "Chưa nhập kết quả",
          studentInterviewerName: rec?.studentInterviewerName || "",
          parentInterviewerName: rec?.parentInterviewerName || "",
          planStrengthsPriority: rec?.planStrengthsPriority || "",
          planGoalsActionsText: rec?.planGoalsActionsText || "",
          furtherTopicsLabel: topicsLabel,
          planHandoverNotes: rec?.planHandoverNotes || "",
          handoverStatusLabel: latestHandover
            ? latestHandover.receiveStatus === "ACKNOWLEDGED"
              ? `Đã tiếp nhận (${latestHandover.targetClassName})`
              : `Chờ GVCN nhận (${latestHandover.targetClassName})`
            : "Chưa bàn giao",
        });

        resultsReport.push({
          studentId: sid,
          studentCode: st.studentCode,
          status: "SUCCESS",
        });
      } catch (err: any) {
        resultsReport.push({
          studentId: sid,
          status: err?.statusCode === 403 ? "SKIPPED_FORBIDDEN" : "ERROR",
          error: err?.message || "Lỗi trích xuất",
        });
      }
    }

    if (summaryRows.length === 0) {
      throw new PvdhDomainError(
        "Không có hồ sơ nào trong phạm vi quyền để xuất danh sách Excel.",
        403,
        "BATCH_EXPORT_NONE_ALLOWED",
        { report: resultsReport }
      );
    }

    const xlsxBuf = buildPvdhSummaryExcelBuffer(summaryRows);
    await writeSafeAudit({
      entityType: "EXPORT",
      entityId: `excel_${Date.now()}`,
      action: "EXPORT_EXCEL_SUMMARY",
      actor: params.actor,
      summary: `Xuất danh sách tổng hợp định hướng Excel (${summaryRows.length} hồ sơ)`,
    });

    return {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: `TongHop_DinhHuong_PVDH_${new Date().toISOString().slice(0, 10)}.xlsx`,
      buffer: xlsxBuf,
      report: resultsReport,
    };
  }
}

// ============================================================================
// 6. DANH SÁCH LỌC & PHÂN TRANG PHÍA SERVER THEO ĐÚNG QUYỀN
// ============================================================================

export async function listOrientationRecordsPaginated(params: {
  actor: PvdhActor;
  periodId?: string;
  campusId?: string;
  grade?: string;
  program?: string;
  assigneeUserId?: string;
  workflowStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.min(100, Math.max(5, Number(params.pageSize || 20)));

  const stuWhere: any = {};
  if (params.periodId && params.periodId !== "ALL") {
    stuWhere.periodId = params.periodId;
  }

  const students = await prisma.inputAssessmentStudent.findMany({
    where: stuWhere,
    include: {
      period: { select: { id: true, code: true, name: true, campusId: true } },
      batch: {
        select: {
          id: true,
          name: true,
          campusId: true,
          campus: { select: { id: true, campusCode: true, campusName: true } },
        },
      },
      enrollmentClass: { select: { id: true, className: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });

  const allLatestRecords = await db.pvdhAssessmentRecord.findMany({
    where: { isLatestAttempt: true },
  });
  const recByStudentId = new Map<string, any>();
  for (const r of allLatestRecords) {
    recByStudentId.set(r.studentId, r);
  }

  // Lấy phân công của GV nếu không phải quản trị toàn hệ thống
  let assignedKeys = new Set<string>();
  if (!params.actor.isSystemWideAdmin) {
    const myAss = await prisma.inputAssessmentTeacherAssignment
      .findMany({
        where: { userId: params.actor.userId },
        include: { subject: true },
      })
      .catch(() => []);
    for (const a of myAss) {
      const sc = String(a.subject?.code || "").toUpperCase();
      const sn = String(a.subject?.name || "").toLowerCase().normalize("NFC");
      if (sc === "PDHDV" || sc === "PVDH" || sn.includes("định hướng")) {
        assignedKeys.add(`${a.periodId}::${normalizeK12GradeNumber(a.grade) || "ALL"}`);
      }
    }
  }

  const q = String(params.search || "").trim().toLowerCase();
  const filterGrade = params.grade && params.grade !== "ALL" ? normalizeK12GradeNumber(params.grade) : null;
  const filterProgram = params.program && params.program !== "ALL" ? params.program.toLowerCase() : null;

  const authorizedRows: any[] = [];
  for (const st of students) {
    const rec = recByStudentId.get(st.id) || null;

    // Kiểm tra quyền đọc ở tầng server
    let allowed = params.actor.isSystemWideAdmin;
    if (!allowed && (params.actor.canCoordinate || params.actor.canReviewAndLock)) {
      allowed = isStudentInActorCampus(params.actor, st);
    }
    if (!allowed) {
      const stG = normalizeK12GradeNumber(st.grade);
      if (
        rec?.studentInterviewerUserId === params.actor.userId ||
        rec?.parentInterviewerUserId === params.actor.userId ||
        assignedKeys.has(`${st.periodId}::${stG}`) ||
        assignedKeys.has(`${st.periodId}::ALL`)
      ) {
        allowed = true;
      }
    }
    if (!allowed) continue;

    // Lọc theo tham số truy vấn
    if (params.campusId && params.campusId !== "ALL") {
      const cId = st.batch?.campusId || st.period?.campusId || st.registeredCampus || "";
      if (cId !== params.campusId && st.batch?.campus?.campusCode !== params.campusId) continue;
    }
    if (filterGrade && normalizeK12GradeNumber(st.grade) !== filterGrade) continue;
    if (filterProgram) {
      const sys = String(st.surveyFormType || st.surveySystem || "").toLowerCase();
      if (!sys.includes(filterProgram)) continue;
    }
    if (params.assigneeUserId && params.assigneeUserId !== "ALL") {
      if (
        rec?.studentInterviewerUserId !== params.assigneeUserId &&
        rec?.parentInterviewerUserId !== params.assigneeUserId
      ) {
        continue;
      }
    }
    const wfStatus = rec?.workflowStatus || "NOT_ENTERED";
    if (params.workflowStatus && params.workflowStatus !== "ALL" && wfStatus !== params.workflowStatus) {
      continue;
    }
    if (q) {
      const hitName = String(st.fullName || "").toLowerCase().includes(q);
      const hitCode = String(st.studentCode || "").toLowerCase().includes(q);
      if (!hitName && !hitCode) continue;
    }

    const expectedTplCode = rec?.templateCode || getDefaultPvdhCodeForGrade(st.grade) || "PVDH-01";
    authorizedRows.push({
      studentId: st.id,
      studentCode: st.studentCode,
      fullName: st.fullName,
      grade: st.grade,
      program: st.surveyFormType || st.surveySystem || "",
      campusName:
        st.batch?.campus?.campusCode ||
        st.batch?.campus?.campusName ||
        st.registeredCampus ||
        "",
      periodId: st.periodId,
      periodName: st.period?.name || "",
      batchName: st.batch?.name || "",
      enrollmentStatus: st.enrollmentStatus,
      enrollmentClassName: st.enrollmentClass?.className || "",
      recordId: rec?.id || null,
      templateCode: expectedTplCode,
      templateVersionCode: rec?.templateVersionCode || "v1.0",
      workflowStatus: wfStatus,
      isLocked: Boolean(rec?.isLocked),
      studentSectionStatus: rec?.studentSectionStatus || "NOT_ENTERED",
      teacherSectionStatus: rec?.teacherSectionStatus || "NOT_ENTERED",
      parentSectionStatus: rec?.parentSectionStatus || "NOT_ENTERED",
      orientationSectionStatus: rec?.orientationSectionStatus || "NOT_ENTERED",
      studentInterviewerName: rec?.studentInterviewerName || "",
      parentInterviewerName: rec?.parentInterviewerName || "",
      updatedAt: rec?.updatedAt || null,
    });
  }

  const total = authorizedRows.length;
  const items = authorizedRows.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

// ============================================================================
// 7. CẤU HÌNH 3 LỚP FILE ĐIỂM KHẢO SÁT ĐẦU VÀO & MAPPING FILE XUẤT
// ============================================================================

export async function listKsdvFileTemplatesWithMappings() {
  await ensurePvdhSchema();
  const db = getPvdhDb();
  const [templates, mappings] = await Promise.all([
    db.ksdvFileTemplate.findMany({ orderBy: [{ priorityOrder: "asc" }, { code: "asc" }] }),
    db.ksdvExportMapping.findMany({ orderBy: [{ sortOrder: "asc" }] }),
  ]);

  return templates.map((t: any) => ({
    ...t,
    periodIds: safeJsonParse<string[]>(t.periodIdsJson, ["ALL"]),
    educationSystems: safeJsonParse<string[]>(t.educationSystemsJson, ["ALL"]),
    campusIds: safeJsonParse<string[]>(t.campusIdsJson, ["ALL"]),
    grades: safeJsonParse<string[]>(t.gradesJson, ["ALL"]),
    schemaConfig: safeJsonParse<Record<string, any>>(t.schemaConfigJson, {}),
    signatureBlocks: safeJsonParse<any[]>(t.signatureBlocksJson, []),
    mappings: mappings.filter((m: any) => m.fileTemplateId === t.id),
  }));
}

export async function saveKsdvFileTemplateAndMappings(params: {
  actor: PvdhActor;
  id?: string;
  code: string;
  name: string;
  resultType: "SCORE" | "RUBRIC" | "CRITERIA" | "ORIENTATION";
  subjectId?: string | null;
  subjectCode: string;
  subjectName: string;
  academicYearId?: string;
  periodIds?: string[];
  educationSystems?: string[];
  campusIds?: string[];
  grades?: string[];
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  priorityOrder?: number;
  exportFormat: "HTML_PDF" | "XLSX" | "DOCX";
  pageSize?: string;
  pageOrientation?: string;
  copyCount?: number;
  signatureBlocks?: any[];
  fileNamePattern?: string;
  schemaConfig?: Record<string, any>;
  sourceVerified?: boolean;
  missingSourceNote?: string | null;
  mappings: ExportMappingItemInput[];
  publishNow?: boolean;
}) {
  if (!params.actor.canManageConfig) {
    throw new PvdhDomainError("Bạn không có quyền cấu hình File điểm khảo sát đầu vào.", 403, "FORBIDDEN");
  }
  await ensurePvdhSchema();
  const db = getPvdhDb();

  const schemaCfg = params.schemaConfig || {};

  // Kiểm tra công thức điểm an toàn nếu là loại Điểm số có công thức tùy chỉnh
  if (params.resultType === "SCORE" && schemaCfg.formula === "CUSTOM" && schemaCfg.formulaCustom) {
    const fCheck = validateSafeScoreFormula(
      String(schemaCfg.formulaCustom),
      Number(schemaCfg.columnCount || 10)
    );
    if (!fCheck.valid) {
      throw new PvdhDomainError(fCheck.error || "Công thức điểm không hợp lệ.", 422, "UNSAFE_FORMULA");
    }
  }

  // Không cho gán Tổng điểm cho mẫu Định hướng hoặc TCI
  if (params.resultType === "ORIENTATION" || params.resultType === "CRITERIA") {
    schemaCfg.hasTotalScore = false;
    schemaCfg.hasCompositeColumn = false;
  }

  // Không cho phát hành cấu hình đang thiếu nguồn tài liệu kiểm chứng (VD: Rubric chưa có nguồn chính thức)
  if (params.publishNow && params.sourceVerified === false) {
    throw new PvdhDomainError(
      "Chưa thể phát hành mẫu này do chưa có tài liệu nguồn kiểm chứng. Vui lòng lưu ở trạng thái Nháp.",
      422,
      "UNVERIFIED_SOURCE"
    );
  }

  const mapCheck = validateExportMappings({
    resultType: params.resultType,
    exportFormat: params.exportFormat,
    mappings: params.mappings || [],
  });

  if (params.publishNow && !mapCheck.valid) {
    throw new PvdhDomainError(
      mapCheck.errors[0] || "Lỗi cấu hình mapping xuất file.",
      422,
      "INVALID_EXPORT_MAPPING",
      mapCheck
    );
  }

  const contentCategory =
    params.resultType === "ORIENTATION"
      ? "ORIENTATION_INTERVIEW"
      : params.resultType === "CRITERIA"
      ? "SUBJECT_CRITERIA"
      : params.resultType === "RUBRIC"
      ? "SUBJECT_RUBRIC"
      : "SUBJECT_SCORE";

  const targetStatus = params.publishNow ? "ACTIVE" : "DRAFT";
  const nowIso = new Date().toISOString();

  // Kiểm tra xung đột phạm vi nếu phát hành ACTIVE
  if (targetStatus === "ACTIVE") {
    const allFileTpls = await listKsdvFileTemplatesWithMappings();
    const sameSubjectActives: ScopeComparableTemplate[] = allFileTpls
      .filter((t: any) => t.status === "ACTIVE" && t.subjectCode === params.subjectCode && t.id !== params.id)
      .map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        grades: t.grades,
        educationSystems: t.educationSystems,
        campusIds: t.campusIds,
        periodIds: t.periodIds,
        effectiveFrom: t.effectiveFrom,
        effectiveTo: t.effectiveTo,
        priorityOrder: t.priorityOrder,
        status: t.status,
      }));

    const scopeCheck = detectTemplateScopeConflicts(
      {
        id: params.id || "NEW",
        code: params.code,
        name: params.name,
        grades: params.grades || ["ALL"],
        educationSystems: params.educationSystems || ["ALL"],
        campusIds: params.campusIds || ["ALL"],
        periodIds: params.periodIds || ["ALL"],
        effectiveFrom: params.effectiveFrom,
        effectiveTo: params.effectiveTo,
        priorityOrder: params.priorityOrder ?? 100,
        status: "ACTIVE",
      },
      sameSubjectActives
    );

    if (!scopeCheck.canPublish) {
      throw new PvdhDomainError(
        scopeCheck.blockingConflicts[0].reason,
        409,
        "SCOPE_CONFLICT",
        scopeCheck
      );
    }
  }

  let savedTpl: any = null;
  if (params.id) {
    const existing = await db.ksdvFileTemplate.findUnique({ where: { id: params.id } });
    if (!existing) throw new PvdhDomainError("Không tìm thấy cấu hình file.", 404, "NOT_FOUND");
    savedTpl = await db.ksdvFileTemplate.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        resultType: params.resultType,
        contentCategory,
        subjectId: params.subjectId || existing.subjectId,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        academicYearId: params.academicYearId || existing.academicYearId,
        periodIdsJson: JSON.stringify(params.periodIds || ["ALL"]),
        educationSystemsJson: JSON.stringify(params.educationSystems || ["ALL"]),
        campusIdsJson: JSON.stringify(params.campusIds || ["ALL"]),
        gradesJson: JSON.stringify(params.grades || ["ALL"]),
        effectiveFrom: params.effectiveFrom ?? null,
        effectiveTo: params.effectiveTo ?? null,
        priorityOrder: params.priorityOrder ?? 100,
        status: targetStatus,
        schemaConfigJson: JSON.stringify(schemaCfg),
        exportFormat: params.exportFormat,
        pageSize: params.pageSize || "A4",
        pageOrientation: params.pageOrientation || "PORTRAIT",
        copyCount: params.copyCount || 1,
        signatureBlocksJson: JSON.stringify(params.signatureBlocks || []),
        fileNamePattern: params.fileNamePattern || existing.fileNamePattern,
        sourceVerified: params.sourceVerified !== false,
        missingSourceNote: params.missingSourceNote || null,
        ...(targetStatus === "ACTIVE" ? { publishedAt: nowIso } : {}),
      },
    });
  } else {
    const existingByCode = await db.ksdvFileTemplate.findMany({
      where: { code: params.code },
      orderBy: [{ versionNumber: "desc" }],
    });
    const nextVer = (existingByCode[0]?.versionNumber || 0) + 1;

    savedTpl = await db.ksdvFileTemplate.create({
      data: {
        code: params.code,
        name: params.name,
        resultType: params.resultType,
        contentCategory,
        subjectId: params.subjectId || null,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        academicYearId: params.academicYearId || "ALL",
        periodIdsJson: JSON.stringify(params.periodIds || ["ALL"]),
        educationSystemsJson: JSON.stringify(params.educationSystems || ["ALL"]),
        campusIdsJson: JSON.stringify(params.campusIds || ["ALL"]),
        gradesJson: JSON.stringify(params.grades || ["ALL"]),
        effectiveFrom: params.effectiveFrom ?? null,
        effectiveTo: params.effectiveTo ?? null,
        priorityOrder: params.priorityOrder ?? 100,
        versionNumber: nextVer,
        versionCode: `v${nextVer}.0`,
        status: targetStatus,
        schemaConfigJson: JSON.stringify(schemaCfg),
        exportFormat: params.exportFormat,
        pageSize: params.pageSize || "A4",
        pageOrientation: params.pageOrientation || "PORTRAIT",
        copyCount: params.copyCount || 1,
        signatureBlocksJson: JSON.stringify(params.signatureBlocks || []),
        fileNamePattern:
          params.fileNamePattern || "{subjectCode}_{studentCode}_{periodCode}_v{version}",
        sourceVerified: params.sourceVerified !== false,
        missingSourceNote: params.missingSourceNote || null,
        createdById: params.actor.userId,
        createdByName: params.actor.userName,
        publishedAt: targetStatus === "ACTIVE" ? nowIso : null,
      },
    });
  }

  await db.ksdvExportMapping.deleteMany({ where: { fileTemplateId: savedTpl.id } });
  for (let i = 0; i < (params.mappings || []).length; i++) {
    const m = params.mappings[i];
    await db.ksdvExportMapping.create({
      data: {
        fileTemplateId: savedTpl.id,
        fieldKey: m.fieldKey,
        sourcePath: m.sourcePath,
        targetFormat: m.targetFormat || params.exportFormat,
        targetRef: m.targetRef,
        dataType: m.dataType || "TEXT",
        formatPattern: m.formatPattern || null,
        isRequired: Boolean(m.isRequired),
        emptyValuePolicy: m.emptyValuePolicy || "KEEP_BLANK",
        sortOrder: i + 1,
      },
    });
  }

  await writeSafeAudit({
    entityType: "FILE_CONFIG",
    entityId: savedTpl.id,
    templateCode: savedTpl.code,
    versionCode: savedTpl.versionCode,
    action: params.publishNow ? "PUBLISH_FILE_CONFIG" : "SAVE_FILE_CONFIG_DRAFT",
    actor: params.actor,
    summary: `${params.publishNow ? "Phát hành" : "Lưu nháp"} cấu hình file xuất ${savedTpl.code} (${savedTpl.versionCode})`,
  });

  return {
    template: savedTpl,
    mappingValidation: mapCheck,
  };
}
