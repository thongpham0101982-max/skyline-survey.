import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ensureTciSchema, getTciDb } from "./schema-init";
import {
    TCI_SUBJECT_CODE,
    TCI_SUBJECT_NAME,
    TCI_DEFAULT_TEMPLATE_CODE,
    DEFAULT_TCI_CRITERIA_16,
    DEFAULT_TCI_FOOTER_CONFIG,
    DEFAULT_TCI_EXPORT_CONFIG,
    TciCriterionConfig,
    TciFooterConfig,
    TciExportConfig,
    TciEvidenceSummaryItem,
    normalizeCriterionResults,
    computeTciSummary,
    groupCriteriaByStatus,
    validateTciCompletion,
} from "./constants";
import {
    generateTciPdfBuffer,
    saveImmutableSignedTciPdf,
    readImmutableSignedTciPdf,
    buildTciAssessmentHtml,
    TciDocumentRenderPayload,
} from "./pdf-service";

export interface TciActorContext {
    userId: string;
    userName: string;
    userEmail?: string | null;
    role: string;
    teacherId?: string | null;
    campusId?: string | null;
}

const ADMIN_CONFIG_ROLES = new Set([
    "ADMIN",
    "KT_DBCL",
    "BGH",
    "HT",
    "PHT",
    "GDCS",
    "GIAO_VU_CS",
    "HV",
]);

const REVIEWER_ROLES = new Set([
    "ADMIN",
    "KT_DBCL",
    "BGH",
    "HT",
    "PHT",
    "GDCS",
    "GIAO_VU_CS",
    "HV",
    "TBP",
]);

const REOPEN_AUTHORIZED_ROLES = new Set([
    "ADMIN",
    "KT_DBCL",
    "BGH",
    "HT",
    "PHT",
    "GDCS",
    "GIAO_VU_CS",
]);

export function canConfigureTciTemplate(role: string): boolean {
    return ADMIN_CONFIG_ROLES.has(String(role || "").toUpperCase());
}

export function canReviewTciResult(role: string): boolean {
    return REVIEWER_ROLES.has(String(role || "").toUpperCase());
}

export function canReopenTciResult(role: string): boolean {
    return REOPEN_AUTHORIZED_ROLES.has(String(role || "").toUpperCase());
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw || typeof raw !== "string") return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function parseTemplateObject(row: any) {
    if (!row) return null;
    const criteria = safeJsonParse<TciCriterionConfig[]>(row.criteriaJson, DEFAULT_TCI_CRITERIA_16);
    const footerConfig = {
        ...DEFAULT_TCI_FOOTER_CONFIG,
        ...safeJsonParse<Partial<TciFooterConfig>>(row.footerConfigJson, {}),
    };
    const exportConfig = {
        ...DEFAULT_TCI_EXPORT_CONFIG,
        ...safeJsonParse<Partial<TciExportConfig>>(row.exportConfigJson, {}),
    };

    return {
        ...row,
        criteria: Array.isArray(criteria) && criteria.length > 0 ? criteria : DEFAULT_TCI_CRITERIA_16,
        footerConfig,
        exportConfig,
    };
}

async function writeTciAuditLog(params: {
    entityType: "TEMPLATE" | "ASSESSMENT_RECORD" | "EVIDENCE" | "SIGNATURE" | "REVIEW";
    entityId: string;
    studentId?: string | null;
    recordId?: string | null;
    templateId?: string | null;
    action: string;
    actor: TciActorContext;
    reason?: string | null;
    before?: any;
    after?: any;
    metadata?: any;
}) {
    const db = getTciDb();
    await db.tciAuditLog.create({
        data: {
            entityType: params.entityType,
            entityId: params.entityId,
            studentId: params.studentId || null,
            recordId: params.recordId || null,
            templateId: params.templateId || null,
            action: params.action,
            actorUserId: params.actor.userId,
            actorName: params.actor.userName || "Người dùng",
            actorRole: params.actor.role || null,
            reason: params.reason || null,
            beforeJson: params.before !== undefined ? JSON.stringify(params.before) : null,
            afterJson: params.after !== undefined ? JSON.stringify(params.after) : null,
            metadataJson: params.metadata !== undefined ? JSON.stringify(params.metadata) : null,
        },
    });
}

// ============================================================================
// 1. QUẢN LÝ MẪU PHIẾU KHẢO SÁT TCI & PHIÊN BẢN (TEMPLATE VERSIONING)
// ============================================================================

export async function listTciTemplates(filters?: {
    academicYearId?: string;
    periodId?: string;
    educationSystemId?: string;
    grade?: string;
    status?: string;
}) {
    await ensureTciSchema();
    const db = getTciDb();
    const where: Record<string, any> = { subjectCode: TCI_SUBJECT_CODE };
    if (filters?.status) where.status = filters.status;
    if (filters?.grade && filters.grade !== "ALL") where.grade = filters.grade;

    const rows = await db.tciTemplate.findMany({
        where,
        orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    });

    const enriched = await Promise.all(
        rows.map(async (row) => {
            const parsed = parseTemplateObject(row);
            const usageCount = await db.tciAssessmentRecord.count({
                where: { templateId: row.id },
            });
            return {
                ...parsed,
                usageCount,
                isImmutable: usageCount > 0,
            };
        })
    );

    return enriched;
}

export async function getActiveTciTemplate(params?: {
    templateId?: string | null;
    academicYearId?: string | null;
    periodId?: string | null;
    educationSystemId?: string | null;
    grade?: string | null;
}) {
    await ensureTciSchema();
    const db = getTciDb();

    if (params?.templateId) {
        const byId = await db.tciTemplate.findUnique({ where: { id: params.templateId } });
        if (byId) {
            const usageCount = await db.tciAssessmentRecord.count({ where: { templateId: byId.id } });
            return { ...parseTemplateObject(byId), usageCount, isImmutable: usageCount > 0 };
        }
    }

    const activeRows = await db.tciTemplate.findMany({
        where: { subjectCode: TCI_SUBJECT_CODE, status: "ACTIVE" },
        orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
    });

    let chosen = activeRows[0];
    if (params?.periodId && params.periodId !== "ALL") {
        const matchPeriod = activeRows.find((r) => r.periodId === params.periodId);
        if (matchPeriod) chosen = matchPeriod;
    }

    if (!chosen) {
        const allRows = await db.tciTemplate.findMany({
            where: { subjectCode: TCI_SUBJECT_CODE },
            orderBy: [{ versionNumber: "desc" }],
        });
        chosen = allRows[0];
    }

    if (!chosen) return null;
    const usageCount = await db.tciAssessmentRecord.count({ where: { templateId: chosen.id } });
    return { ...parseTemplateObject(chosen), usageCount, isImmutable: usageCount > 0 };
}

/**
 * Lưu nháp hoặc cập nhật mẫu TCI:
 * - Nếu mẫu đã phát sinh kết quả đánh giá (usageCount > 0), CHẶN sửa trực tiếp nội dung tiêu chí.
 * - Bắt buộc người dùng tạo phiên bản mới (cloneTemplateVersion).
 */
export async function saveTciTemplateDraft(params: {
    id?: string;
    code?: string;
    name: string;
    academicYearId?: string;
    periodId?: string;
    educationSystemId?: string;
    grade?: string;
    criteria: TciCriterionConfig[];
    footerConfig?: Partial<TciFooterConfig>;
    exportConfig?: Partial<TciExportConfig>;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    if (!canConfigureTciTemplate(params.actor.role)) {
        throw new Error("Bạn không có quyền cấu hình mẫu phiếu khảo sát môn TCI.");
    }

    if (!Array.isArray(params.criteria) || params.criteria.length !== 16) {
        throw new Error("Bộ chuẩn TCI bắt buộc có đúng 16 tiêu chí (STT 1 đến STT 16).");
    }

    // Chuẩn hóa danh sách 16 tiêu chí với khóa ổn định TCI_C01..TCI_C16
    const normalizedCriteria: TciCriterionConfig[] = params.criteria.map((c, idx) => {
        const stt = idx + 1;
        const stableId = c.criterionId || `TCI_C${String(stt).padStart(2, "0")}`;
        const defaultCriterion = DEFAULT_TCI_CRITERIA_16[idx];
        const codes = Array.isArray(c.indicatorCodes)
            ? c.indicatorCodes.map((x) => String(x).trim()).filter(Boolean)
            : String(c.indicatorCodes || "")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);

        if (codes.length === 0) {
            throw new Error(`Tiêu chí STT ${stt} thiếu Mã chỉ số.`);
        }
        if (!c.content || !c.content.trim()) {
            throw new Error(`Tiêu chí STT ${stt} thiếu nội dung đánh giá.`);
        }

        return {
            ...defaultCriterion,
            ...c,
            criterionId: stableId,
            stt,
            indicatorCodes: codes,
            content: c.content.trim(),
            resultOptions: ["DAT", "KHONG_DAT", "KHONG_LAM"],
            maxImages: Math.max(1, Number(c.maxImages || defaultCriterion?.maxImages || 3)),
            maxFileSizeMb: Math.max(1, Number(c.maxFileSizeMb || defaultCriterion?.maxFileSizeMb || 5)),
            allowedMimeTypes:
                Array.isArray(c.allowedMimeTypes) && c.allowedMimeTypes.length > 0
                    ? c.allowedMimeTypes
                    : ["image/jpeg", "image/png", "image/webp"],
        };
    });

    const db = getTciDb();
    const footerConfig = { ...DEFAULT_TCI_FOOTER_CONFIG, ...(params.footerConfig || {}) };
    const exportConfig = { ...DEFAULT_TCI_EXPORT_CONFIG, ...(params.exportConfig || {}) };

    if (params.id) {
        const existing = await db.tciTemplate.findUnique({ where: { id: params.id } });
        if (!existing) {
            throw new Error("Không tìm thấy mẫu phiếu TCI cần cập nhật.");
        }

        const usageCount = await db.tciAssessmentRecord.count({ where: { templateId: existing.id } });
        if (usageCount > 0) {
            // Kiểm tra xem nội dung đánh giá / cấu trúc tiêu chí có bị thay đổi không
            const oldCriteria = safeJsonParse<TciCriterionConfig[]>(existing.criteriaJson, []);
            const structuralChanged =
                oldCriteria.length !== normalizedCriteria.length ||
                oldCriteria.some((oldC, i) => {
                    const newC = normalizedCriteria[i];
                    return (
                        oldC.criterionId !== newC.criterionId ||
                        oldC.stt !== newC.stt ||
                        oldC.content !== newC.content ||
                        oldC.indicatorCodes.join(",") !== newC.indicatorCodes.join(",")
                    );
                });

            if (structuralChanged) {
                throw new Error(
                    `Mẫu phiếu "${existing.name}" (${existing.versionCode}) đã phát sinh ${usageCount} hồ sơ kết quả khảo sát nên không được sửa trực tiếp nội dung/cấu trúc tiêu chí. Vui lòng nhấn "Sao chép phiên bản" để tạo phiên bản mới.`
                );
            }
        }

        const updated = await db.tciTemplate.update({
            where: { id: existing.id },
            data: {
                name: params.name.trim(),
                academicYearId: params.academicYearId || existing.academicYearId || "ALL",
                periodId: params.periodId || existing.periodId || "ALL",
                educationSystemId: params.educationSystemId || existing.educationSystemId || "ALL",
                grade: params.grade || existing.grade || "Khối 1",
                criteriaJson: JSON.stringify(normalizedCriteria),
                footerConfigJson: JSON.stringify(footerConfig),
                exportConfigJson: JSON.stringify(exportConfig),
                updatedById: params.actor.userId,
                updatedByName: params.actor.userName,
            },
        });

        await writeTciAuditLog({
            entityType: "TEMPLATE",
            entityId: existing.id,
            templateId: existing.id,
            action: "UPDATE_TEMPLATE",
            actor: params.actor,
            before: { name: existing.name, versionCode: existing.versionCode },
            after: { name: updated.name, versionCode: updated.versionCode },
        });

        return { ...parseTemplateObject(updated), usageCount, isImmutable: usageCount > 0 };
    }

    // Tạo mới bản nháp
    const code = (params.code || TCI_DEFAULT_TEMPLATE_CODE).trim().toUpperCase();
    const existingVersions = await db.tciTemplate.findMany({
        where: { code },
        orderBy: [{ versionNumber: "desc" }],
    });
    const nextVersionNumber = (existingVersions[0]?.versionNumber || 0) + 1;
    const versionCode = `v${nextVersionNumber}.0`;

    const tciSubject = await prisma.assessmentSubject.findUnique({ where: { code: TCI_SUBJECT_CODE } });

    const created = await db.tciTemplate.create({
        data: {
            code,
            name: params.name.trim(),
            subjectId: tciSubject?.id || null,
            subjectCode: TCI_SUBJECT_CODE,
            subjectName: TCI_SUBJECT_NAME,
            academicYearId: params.academicYearId || "ALL",
            periodId: params.periodId || "ALL",
            educationSystemId: params.educationSystemId || "ALL",
            grade: params.grade || "Khối 1",
            versionNumber: nextVersionNumber,
            versionCode,
            status: "DRAFT",
            criteriaJson: JSON.stringify(normalizedCriteria),
            footerConfigJson: JSON.stringify(footerConfig),
            exportConfigJson: JSON.stringify(exportConfig),
            createdById: params.actor.userId,
            createdByName: params.actor.userName,
            updatedById: params.actor.userId,
            updatedByName: params.actor.userName,
        },
    });

    await writeTciAuditLog({
        entityType: "TEMPLATE",
        entityId: created.id,
        templateId: created.id,
        action: "CREATE_TEMPLATE",
        actor: params.actor,
        after: { code: created.code, versionCode: created.versionCode },
    });

    return { ...parseTemplateObject(created), usageCount: 0, isImmutable: false };
}

/**
 * Sao chép phiên bản mẫu (Clone Version):
 * Tạo phiên bản mới ở trạng thái DRAFT để chỉnh sửa mà không làm ảnh hưởng các kết quả cũ
 */
export async function cloneTciTemplateVersion(params: {
    sourceTemplateId: string;
    newName?: string;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    if (!canConfigureTciTemplate(params.actor.role)) {
        throw new Error("Bạn không có quyền sao chép phiên bản mẫu phiếu TCI.");
    }

    const db = getTciDb();
    const source = await db.tciTemplate.findUnique({ where: { id: params.sourceTemplateId } });
    if (!source) {
        throw new Error("Không tìm thấy mẫu phiếu gốc để sao chép.");
    }

    const allVersions = await db.tciTemplate.findMany({
        where: { code: source.code },
        orderBy: [{ versionNumber: "desc" }],
    });
    const nextVersionNumber = (allVersions[0]?.versionNumber || source.versionNumber || 1) + 1;
    const versionCode = `v${nextVersionNumber}.0`;

    const cloned = await db.tciTemplate.create({
        data: {
            code: source.code,
            name: params.newName?.trim() || `${source.name}`,
            subjectId: source.subjectId,
            subjectCode: source.subjectCode || TCI_SUBJECT_CODE,
            subjectName: source.subjectName || TCI_SUBJECT_NAME,
            academicYearId: source.academicYearId || "ALL",
            periodId: source.periodId || "ALL",
            educationSystemId: source.educationSystemId || "ALL",
            grade: source.grade || "Khối 1",
            versionNumber: nextVersionNumber,
            versionCode,
            parentTemplateId: source.id,
            status: "DRAFT",
            criteriaJson: source.criteriaJson,
            footerConfigJson: source.footerConfigJson,
            exportConfigJson: source.exportConfigJson,
            createdById: params.actor.userId,
            createdByName: params.actor.userName,
            updatedById: params.actor.userId,
            updatedByName: params.actor.userName,
        },
    });

    await writeTciAuditLog({
        entityType: "TEMPLATE",
        entityId: cloned.id,
        templateId: cloned.id,
        action: "CLONE_TEMPLATE",
        actor: params.actor,
        before: { sourceTemplateId: source.id, sourceVersion: source.versionCode },
        after: { clonedTemplateId: cloned.id, versionCode: cloned.versionCode },
    });

    return { ...parseTemplateObject(cloned), usageCount: 0, isImmutable: false };
}

/**
 * Kích hoạt mẫu phiếu (Activate Template) hoặc Ngừng áp dụng
 */
export async function updateTciTemplateStatus(params: {
    templateId: string;
    status: "ACTIVE" | "INACTIVE" | "DRAFT";
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    if (!canConfigureTciTemplate(params.actor.role)) {
        throw new Error("Bạn không có quyền thay đổi trạng thái áp dụng của mẫu phiếu TCI.");
    }

    const db = getTciDb();
    const target = await db.tciTemplate.findUnique({ where: { id: params.templateId } });
    if (!target) {
        throw new Error("Không tìm thấy mẫu phiếu TCI.");
    }

    if (params.status === "ACTIVE") {
        // Chuyển các phiên bản đang ACTIVE khác cùng code + grade + periodId sang INACTIVE
        // (Kết quả cũ vẫn giữ nguyên khóa ngoại templateId tới phiên bản cũ)
        const activeSiblings = await db.tciTemplate.findMany({
            where: {
                code: target.code,
                grade: target.grade,
                periodId: target.periodId,
                status: "ACTIVE",
            },
        });
        for (const sib of activeSiblings) {
            if (sib.id !== target.id) {
                await db.tciTemplate.update({
                    where: { id: sib.id },
                    data: { status: "INACTIVE" },
                });
            }
        }
    }

    const updated = await db.tciTemplate.update({
        where: { id: target.id },
        data: {
            status: params.status,
            activatedAt: params.status === "ACTIVE" ? new Date().toISOString() : target.activatedAt,
            activatedById: params.status === "ACTIVE" ? params.actor.userId : target.activatedById,
            updatedById: params.actor.userId,
            updatedByName: params.actor.userName,
        },
    });

    await writeTciAuditLog({
        entityType: "TEMPLATE",
        entityId: target.id,
        templateId: target.id,
        action: params.status === "ACTIVE" ? "ACTIVATE_TEMPLATE" : `STATUS_${params.status}`,
        actor: params.actor,
        before: { status: target.status },
        after: { status: updated.status },
    });

    const usageCount = await db.tciAssessmentRecord.count({ where: { templateId: updated.id } });
    return { ...parseTemplateObject(updated), usageCount, isImmutable: usageCount > 0 };
}

// ============================================================================
// 2. KIỂM TRA PHÂN CÔNG & QUYỀN TRUY CẬP HỒ SƠ KHẢO SÁT TCI
// ============================================================================

export async function resolveStudentAndTciAssignment(params: {
    studentId: string;
    periodId?: string | null;
}) {
    await ensureTciSchema();

    const student = await prisma.inputAssessmentStudent.findUnique({
        where: { id: params.studentId },
        include: {
            batch: {
                include: {
                    period: true,
                    campus: true,
                },
            },
            period: {
                include: {
                    campus: true,
                },
            },
        },
    });

    const tciSubject = await prisma.assessmentSubject.findUnique({
        where: { code: TCI_SUBJECT_CODE },
    });

    const resolvedPeriodId =
        params.periodId && params.periodId !== "ALL"
            ? params.periodId
            : student?.periodId || student?.batch?.periodId || "ALL";

    // Tìm phân công môn TCI của học sinh này (theo đợt hoặc kỳ khảo sát)
    let assignment: any = null;
    if (tciSubject) {
        const rawAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
            where: {
                subjectId: tciSubject.id,
                ...(student?.batchId
                    ? { OR: [{ batchId: student.batchId }, { batchId: null }] }
                    : {}),
            },
            include: {
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const matched: any =
            rawAssignments.find((a: any) => a.batchId && a.batchId === student?.batchId) ||
            rawAssignments.find((a: any) => !a.batchId && a.periodId === resolvedPeriodId) ||
            rawAssignments[0] ||
            null;

        if (matched) {
            assignment = {
                ...matched,
                teacherId: matched.teacherId || matched.userId,
                teacher: matched.teacher || {
                    id: matched.user?.id || matched.userId,
                    fullName: matched.user?.fullName || matched.teacherName || null,
                },
            };
        }
    }

    return {
        student,
        tciSubject,
        periodId: resolvedPeriodId,
        assignment,
    };
}

export async function assertActorCanAccessStudentTci(params: {
    actor: TciActorContext;
    studentId: string;
    periodId?: string | null;
    mode: "VIEW" | "EDIT" | "SIGN";
}) {
    const { student, tciSubject, periodId, assignment } = await resolveStudentAndTciAssignment({
        studentId: params.studentId,
        periodId: params.periodId,
    });

    const roleUpper = String(params.actor.role || "").toUpperCase();
    const isPrivilegedReviewer = canReviewTciResult(roleUpper) || canConfigureTciTemplate(roleUpper);

    const matchesAssignment = Boolean(
        assignment &&
            ((params.actor.teacherId &&
                (assignment.teacherId === params.actor.teacherId ||
                    assignment.userId === params.actor.teacherId)) ||
                (params.actor.userId &&
                    (assignment.userId === params.actor.userId ||
                        assignment.teacherId === params.actor.userId)))
    );

    if (params.mode === "VIEW" && isPrivilegedReviewer) {
        return { student, tciSubject, periodId, assignment, isAssignedTeacher: matchesAssignment };
    }

    // Đối với GVBM: bắt buộc phải có phân công môn TCI cho học sinh/đợt này
    if (!matchesAssignment && !isPrivilegedReviewer) {
        throw new Error(
            "Bạn không được phân công khảo sát môn TCI cho học sinh này nên không có quyền truy cập hoặc thực hiện thao tác."
        );
    }

    // Khi KÝ PHIẾU (mode === "SIGN"): Chỉ người khảo sát được phân công mới được ký bằng chữ ký của chính mình
    if (params.mode === "SIGN" && assignment && !matchesAssignment) {
        throw new Error(
            "Chỉ giáo viên được phân công trực tiếp khảo sát học sinh này mới được phép ký xác nhận lên phiếu."
        );
    }

    return {
        student,
        tciSubject,
        periodId,
        assignment,
        isAssignedTeacher: matchesAssignment,
    };
}

// ============================================================================
// 3. ĐỒNG BỘ TƯƠNG THÍCH NGƯỢC VỚI StudentAssessmentScore & Tiến độ Giai đoạn 4
// ============================================================================

async function syncLegacyScoreAndStageProgress(params: {
    record: any;
    criteriaConfig: TciCriterionConfig[];
    actor: TciActorContext;
}) {
    const { record, criteriaConfig } = params;
    if (!record.studentId || !record.subjectId) return;

    const normalized = normalizeCriterionResults(record.criteriaResultsJson, criteriaConfig);
    const orderedChoices = criteriaConfig.map((c) => {
        const st = normalized[c.criterionId]?.status;
        if (st === "DAT") return "3";
        if (st === "KHONG_DAT") return "2";
        if (st === "KHONG_LAM") return "1";
        return "";
    });

    const humanParts: string[] = [];
    if (record.generalComment?.trim()) humanParts.push(record.generalComment.trim());
    if (record.highlightsComment?.trim()) humanParts.push(`Điểm nổi bật: ${record.highlightsComment.trim()}`);
    if (record.supportNeededComment?.trim()) humanParts.push(`Cần hỗ trợ: ${record.supportNeededComment.trim()}`);
    if (record.teacherRecommendation?.trim()) humanParts.push(`Đề xuất: ${record.teacherRecommendation.trim()}`);

    const fallbackSummaryComment =
        humanParts.length > 0
            ? humanParts.join(" • ")
            : `Đạt: ${record.countDat}/16 • Không đạt: ${record.countKhongDat}/16 • Không làm: ${record.countKhongLam}/16 — ${
                  record.signatureStatus === "SIGNED"
                      ? `Đã ký xác nhận (${record.signerName || record.assessorName || "GVBM"})`
                      : record.signatureStatus === "PENDING_RESIGN"
                        ? "Chờ ký lại (sau mở khóa)"
                        : "Bản nháp (Chưa ký)"
              }`;

    const commentsPayload = [
        record.highlightsComment?.trim() || fallbackSummaryComment,
        record.supportNeededComment || "",
        record.teacherRecommendation || "",
        record.generalComment || "",
        JSON.stringify({
            _tciMeta: {
                recordId: record.id,
                resultVersion: record.resultVersion,
                templateId: record.templateId,
                templateVersionCode: record.templateVersionCode,
                evaluationStatus: record.evaluationStatus,
                signatureStatus: record.signatureStatus,
                reviewStatus: record.reviewStatus,
                countEvaluated: record.countEvaluated,
                countDat: record.countDat,
                countKhongDat: record.countKhongDat,
                countKhongLam: record.countKhongLam,
                countChuaDanhGia: record.countChuaDanhGia,
                signerName: record.signerName,
                signedAt: record.signedAt,
                signedPdfFileName: record.signedPdfFileName,
            },
        }),
    ];

    try {
        await prisma.studentAssessmentScore.upsert({
            where: {
                studentId_subjectId: {
                    studentId: record.studentId,
                    subjectId: record.subjectId,
                },
            },
            update: {
                scores: JSON.stringify(orderedChoices),
                comments: JSON.stringify(commentsPayload),
                teacherId: record.assessorUserId || params.actor.userId,
                teacherName: record.assessorName || params.actor.userName,
            },
            create: {
                studentId: record.studentId,
                subjectId: record.subjectId,
                scores: JSON.stringify(orderedChoices),
                comments: JSON.stringify(commentsPayload),
                teacherId: record.assessorUserId || params.actor.userId,
                teacherName: record.assessorName || params.actor.userName,
            },
        });
    } catch (e) {
        console.warn("[TCI Sync] Could not upsert StudentAssessmentScore:", e);
    }

    // Cập nhật tiến độ Giai đoạn 4 (Tổ chức Khảo sát & Chấm điểm)
    // Lưu ý quan trọng (Mục 13):
    // - Môn TCI chỉ được tính là ĐÃ HOÀN THÀNH khi đã đánh giá 16/16 VÀ ĐÃ KÝ (signatureStatus === "SIGNED").
    // - Không tự động hoàn tất xét duyệt tuyển sinh (Stage 6) và không tự gửi thư/email.
    try {
        const studentWithScores = await prisma.inputAssessmentStudent.findUnique({
            where: { id: record.studentId },
            include: {
                scores: { include: { subject: true } },
            },
        });

        if (studentWithScores) {
            const studentAssignments = await prisma.inputAssessmentTeacherAssignment.findMany({
                where: {
                    ...(studentWithScores.batchId
                        ? { OR: [{ batchId: studentWithScores.batchId }, { batchId: null }] }
                        : {}),
                },
                include: { subject: true },
            });

            const requiredSubjectIds = new Set<string>(
                studentAssignments.map((a) => a.subjectId).filter(Boolean)
            );
            requiredSubjectIds.add(record.subjectId);

            let completedSubjectCount = 0;
            for (const subjId of requiredSubjectIds) {
                if (subjId === record.subjectId) {
                    if (record.evaluationStatus === "COMPLETED" && record.signatureStatus === "SIGNED") {
                        completedSubjectCount += 1;
                    }
                    continue;
                }
                const sc = studentWithScores.scores.find((s) => s.subjectId === subjId);
                if (!sc) continue;
                try {
                    const arr = JSON.parse(sc.scores || "[]");
                    if (Array.isArray(arr) && arr.some((v) => v !== "" && v !== null && v !== undefined)) {
                        completedSubjectCount += 1;
                    }
                } catch {
                    // ignore
                }
            }

            const allSubjectsCompleted =
                requiredSubjectIds.size > 0 && completedSubjectCount >= requiredSubjectIds.size;

            const stageConfDelegate = (prisma as any).entranceStageConfirmation;
            if (stageConfDelegate?.upsert) {
                await stageConfDelegate.upsert({
                    where: {
                        studentId_stageNumber: {
                            studentId: record.studentId,
                            stageNumber: 4,
                        },
                    },
                    update: {
                        status: allSubjectsCompleted ? "COMPLETED" : "IN_PROGRESS",
                        confirmedAt: allSubjectsCompleted ? new Date() : null,
                        confirmedById: params.actor.userId,
                        confirmedByName: params.actor.userName,
                        notes: allSubjectsCompleted
                            ? `Hoàn thành chấm & ký phiếu TCI (${record.countDat}/16 Đạt)`
                            : `Đang thực hiện môn TCI (${record.countEvaluated}/16 tiêu chí, ${
                                  record.signatureStatus === "SIGNED" ? "Đã ký" : "Chưa ký"
                              })`,
                    },
                    create: {
                        studentId: record.studentId,
                        stageNumber: 4,
                        status: allSubjectsCompleted ? "COMPLETED" : "IN_PROGRESS",
                        confirmedAt: allSubjectsCompleted ? new Date() : null,
                        confirmedById: params.actor.userId,
                        confirmedByName: params.actor.userName,
                        notes: allSubjectsCompleted
                            ? `Hoàn thành chấm & ký phiếu TCI (${record.countDat}/16 Đạt)`
                            : `Đang thực hiện môn TCI (${record.countEvaluated}/16 tiêu chí, ${
                                  record.signatureStatus === "SIGNED" ? "Đã ký" : "Chưa ký"
                              })`,
                    },
                });
            }
        }
    } catch (e) {
        console.warn("[TCI Sync] Could not update EntranceStageConfirmation Stage 4:", e);
    }
}

// ============================================================================
// 4. TRUY VẤN & KHỞI TẠO HỒ SƠ ĐÁNH GIÁ TCI CỦA HỌC SINH
// ============================================================================

export async function getOrInitStudentTciRecord(params: {
    studentId: string;
    periodId?: string | null;
    resultVersion?: number | null;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const { student, tciSubject, periodId, assignment } = await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: params.studentId,
        periodId: params.periodId,
        mode: "VIEW",
    });

    const db = getTciDb();

    // Lấy danh sách tất cả phiên bản kết quả của học sinh này
    const allVersions = await db.tciAssessmentRecord.findMany({
        where: {
            studentId: params.studentId,
            subjectCode: TCI_SUBJECT_CODE,
        },
        orderBy: [{ resultVersion: "desc" }],
    });

    let record = params.resultVersion
        ? allVersions.find((r) => r.resultVersion === Number(params.resultVersion)) || allVersions[0]
        : allVersions.find((r) => r.isLatestVersion) || allVersions[0];

    // Nếu chưa có bản ghi TCI nào, khởi tạo bản ghi v1 ở trạng thái NOT_STARTED (Chưa nhập, không chọn sẵn kết quả)
    if (!record) {
        const activeTemplate = await getActiveTciTemplate({
            periodId,
            grade: student?.grade || "Khối 1",
        });

        const emptyCriteriaMap = normalizeCriterionResults({}, activeTemplate?.criteria || DEFAULT_TCI_CRITERIA_16);

        const studentAny = student as any;
        record = await db.tciAssessmentRecord.create({
            data: {
                studentId: params.studentId,
                studentCode: student?.studentCode || null,
                studentName: student?.fullName || null,
                periodId: periodId || "ALL",
                batchId: student?.batchId || null,
                campusId: studentAny?.campusId || student?.batch?.campusId || student?.period?.campusId || null,
                grade: student?.grade || "Khối 1",
                subjectId: tciSubject?.id || "TCI_SUBJECT",
                subjectCode: TCI_SUBJECT_CODE,
                assignmentId: assignment?.id || null,
                templateId: activeTemplate?.id || "tcitpl_default_v1",
                templateCode: activeTemplate?.code || TCI_DEFAULT_TEMPLATE_CODE,
                templateVersionNumber: activeTemplate?.versionNumber || 1,
                templateVersionCode: activeTemplate?.versionCode || "v1.0",
                resultVersion: 1,
                isLatestVersion: true,
                assessmentDate: assignment?.startTime
                    ? new Date(assignment.startTime).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10),
                assignedTeacherId: assignment?.teacherId || null,
                assignedTeacherName: assignment?.teacher?.fullName || null,
                criteriaResultsJson: JSON.stringify(emptyCriteriaMap),
                countEvaluated: 0,
                countDat: 0,
                countKhongDat: 0,
                countKhongLam: 0,
                countChuaDanhGia: 16,
                evaluationStatus: "NOT_STARTED",
                signatureStatus: "UNSIGNED",
                reviewStatus: "PENDING",
                lockVersion: 1,
            },
        });
        allVersions.unshift(record);
    } else if (assignment?.teacherId && record.assignedTeacherId !== assignment.teacherId) {
        // Mục 5: Nếu đổi GV khi đã có dữ liệu, cập nhật assignedTeacherId nhưng BẢO TOÀN người nhập (assessor), lịch sử và người ký (signer)
        const prevTeacherId = record.assignedTeacherId;
        const prevTeacherName = record.assignedTeacherName;
        record = await db.tciAssessmentRecord.update({
            where: { id: record.id },
            data: {
                assignmentId: assignment.id,
                assignedTeacherId: assignment.teacherId,
                assignedTeacherName: assignment.teacher?.fullName || record.assignedTeacherName,
                // Tuyệt đối không ghi đè assessorUserId, signerUserId, signatureImageBase64
            },
        });
        await writeTciAuditLog({
            entityType: "ASSESSMENT_RECORD",
            entityId: record.id,
            studentId: record.studentId,
            recordId: record.id,
            action: "REASSIGN_TEACHER",
            actor: params.actor,
            before: { assignedTeacherId: prevTeacherId, assignedTeacherName: prevTeacherName },
            after: {
                assignedTeacherId: assignment.teacherId,
                assignedTeacherName: assignment.teacher?.fullName,
                preservedAssessorName: record.assessorName,
                preservedSignerName: record.signerName,
            },
        });
    }

    // Lấy đúng phiên bản mẫu phiếu gắn với kết quả này (Version Pinning)
    const pinnedTemplate =
        (await getActiveTciTemplate({ templateId: record.templateId })) ||
        (await getActiveTciTemplate({ periodId }));

    const criteriaConfig: TciCriterionConfig[] =
        pinnedTemplate?.criteria || DEFAULT_TCI_CRITERIA_16;
    const footerConfig: TciFooterConfig =
        pinnedTemplate?.footerConfig || DEFAULT_TCI_FOOTER_CONFIG;
    const exportConfig: TciExportConfig =
        pinnedTemplate?.exportConfig || DEFAULT_TCI_EXPORT_CONFIG;

    const evidencesRaw = await db.tciProductEvidence.findMany({
        where: {
            recordId: record.id,
            status: "ACTIVE",
        },
        orderBy: [{ criterionStt: "asc" }, { createdAt: "asc" }],
    });

    const evidences: TciEvidenceSummaryItem[] = evidencesRaw.map((ev) => ({
        id: ev.id,
        criterionId: ev.criterionId,
        criterionStt: ev.criterionStt,
        indicatorCode: ev.indicatorCode,
        fileName: ev.fileName,
        mimeType: ev.mimeType,
        fileSizeBytes: ev.fileSizeBytes,
        rotationDeg: ev.rotationDeg || 0,
        imageDataBase64: ev.imageDataBase64,
        uploadedByUserId: ev.uploadedByUserId,
        uploadedByName: ev.uploadedByName,
        createdAt: ev.createdAt instanceof Date ? ev.createdAt.toISOString() : String(ev.createdAt),
    }));

    const criteriaResults = normalizeCriterionResults(record.criteriaResultsJson, criteriaConfig);
    const summary = computeTciSummary(criteriaResults, criteriaConfig);
    const groupedCriteria = groupCriteriaByStatus(criteriaResults, criteriaConfig, evidences);

    const auditLogs = await db.tciAuditLog.findMany({
        where: { studentId: params.studentId },
        orderBy: [{ createdAt: "desc" }],
        take: 30,
    });

    return {
        record: {
            ...record,
            criteriaResults,
            summary,
            groupedCriteria,
            evidences,
        },
        template: {
            id: pinnedTemplate?.id || record.templateId,
            code: pinnedTemplate?.code || record.templateCode,
            name: pinnedTemplate?.name || TCI_SUBJECT_NAME,
            versionNumber: pinnedTemplate?.versionNumber || record.templateVersionNumber,
            versionCode: pinnedTemplate?.versionCode || record.templateVersionCode,
            status: pinnedTemplate?.status || "ACTIVE",
            criteria: criteriaConfig,
            footerConfig,
            exportConfig,
        },
        student: student
            ? {
                  id: student.id,
                  studentCode: student.studentCode,
                  fullName: student.fullName,
                  dob: (student as any).dob || student.dateOfBirth || null,
                  gender: student.gender,
                  grade: student.grade,
                  campusName:
                      (student as any).campus?.name ||
                      student.batch?.campus?.campusName ||
                      (student.batch?.campus as any)?.name ||
                      student.period?.campus?.campusName ||
                      student.admissionCampus ||
                      null,
                  batchId: student.batchId,
                  batchName: student.batch?.name || null,
                  periodId: student.batch?.periodId || periodId,
                  periodName: student.batch?.period?.name || student.period?.name || null,
                  educationSystemName:
                      (student as any).educationSystem?.name ||
                      student.targetType ||
                      student.surveyFormType ||
                      null,
              }
            : null,
        assignment: assignment
            ? {
                  id: assignment.id,
                  teacherId: assignment.teacherId,
                  teacherName: assignment.teacher?.fullName || null,
                  startTime: assignment.startTime,
                  endTime: assignment.endTime,
                  roomLocation: assignment.roomLocation,
              }
            : null,
        versionHistory: allVersions.map((v) => ({
            id: v.id,
            resultVersion: v.resultVersion,
            isLatestVersion: v.isLatestVersion,
            templateVersionCode: v.templateVersionCode,
            evaluationStatus: v.evaluationStatus,
            signatureStatus: v.signatureStatus,
            reviewStatus: v.reviewStatus,
            countEvaluated: v.countEvaluated,
            countDat: v.countDat,
            countKhongDat: v.countKhongDat,
            countKhongLam: v.countKhongLam,
            countChuaDanhGia: v.countChuaDanhGia,
            assessorName: v.assessorName,
            signerName: v.signerName,
            signedAt: v.signedAt,
            signedPdfFileName: v.signedPdfFileName,
            reopenReason: v.reopenReason,
            reopenedByName: v.reopenedByName,
            reopenedAt: v.reopenedAt,
            updatedAt: v.updatedAt,
        })),
        auditLogs,
    };
}

// ============================================================================
// 5. LƯU NHÁP KẾT QUẢ ĐÁNH GIÁ TCI (SAVE DRAFT)
// ============================================================================

export async function saveTciAssessmentDraft(params: {
    studentId: string;
    periodId?: string | null;
    assessmentDate?: string | null;
    criteriaResults: unknown;
    generalComment?: string | null;
    highlightsComment?: string | null;
    supportNeededComment?: string | null;
    teacherRecommendation?: string | null;
    expectedLockVersion?: number | null;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const { student, tciSubject, periodId, assignment } = await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: params.studentId,
        periodId: params.periodId,
        mode: "EDIT",
    });

    const db = getTciDb();
    const currentBundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId,
        actor: params.actor,
    });

    const currentRecord = currentBundle.record;
    const criteriaConfig = currentBundle.template.criteria;

    // 1. Chặn sửa phiếu đã ký xác nhận
    if (currentRecord.signatureStatus === "SIGNED") {
        throw new Error(
            "Phiếu khảo sát này đã được ký xác nhận và khóa dữ liệu. Muốn chỉnh sửa phải có quyền mở khóa tạo phiên bản kết quả mới."
        );
    }

    // 2. Kiểm tra Optimistic Locking (chống ghi đè khi mở nhiều tab)
    if (
        typeof params.expectedLockVersion === "number" &&
        currentRecord.lockVersion &&
        params.expectedLockVersion !== currentRecord.lockVersion
    ) {
        throw new Error(
            "Dữ liệu phiếu vừa được cập nhật ở một cửa sổ/thiết bị khác. Vui lòng tải lại phiếu để không ghi đè dữ liệu."
        );
    }

    const normalizedResults = normalizeCriterionResults(params.criteriaResults, criteriaConfig);
    const summary = computeTciSummary(normalizedResults, criteriaConfig);

    const hasAnyText = Boolean(
        params.generalComment?.trim() ||
            params.highlightsComment?.trim() ||
            params.supportNeededComment?.trim() ||
            params.teacherRecommendation?.trim()
    );

    let nextEvalStatus = "NOT_STARTED";
    if (summary.isAllEvaluated) {
        nextEvalStatus = "PENDING_SIGNATURE";
    } else if (summary.countEvaluated > 0 || hasAnyText || currentBundle.record.evidences.length > 0) {
        nextEvalStatus = "IN_PROGRESS";
    } else if (currentRecord.signatureStatus === "PENDING_RESIGN") {
        nextEvalStatus = "REOPENED";
    }

    const updated = await db.tciAssessmentRecord.update({
        where: { id: currentRecord.id },
        data: {
            studentCode: student?.studentCode || currentRecord.studentCode,
            studentName: student?.fullName || currentRecord.studentName,
            subjectId: tciSubject?.id || currentRecord.subjectId,
            assignmentId: assignment?.id || currentRecord.assignmentId,
            assessmentDate: params.assessmentDate || currentRecord.assessmentDate,
            assessorUserId: params.actor.userId,
            assessorTeacherId: params.actor.teacherId || currentRecord.assessorTeacherId,
            assessorName: params.actor.userName,
            criteriaResultsJson: JSON.stringify(normalizedResults),
            countEvaluated: summary.countEvaluated,
            countDat: summary.countDat,
            countKhongDat: summary.countKhongDat,
            countKhongLam: summary.countKhongLam,
            countChuaDanhGia: summary.countChuaDanhGia,
            generalComment: params.generalComment ?? currentRecord.generalComment ?? "",
            highlightsComment: params.highlightsComment ?? currentRecord.highlightsComment ?? "",
            supportNeededComment: params.supportNeededComment ?? currentRecord.supportNeededComment ?? "",
            teacherRecommendation: params.teacherRecommendation ?? currentRecord.teacherRecommendation ?? "",
            evaluationStatus: nextEvalStatus,
            lockVersion: (currentRecord.lockVersion || 1) + 1,
        },
    });

    await writeTciAuditLog({
        entityType: "ASSESSMENT_RECORD",
        entityId: updated.id,
        studentId: updated.studentId,
        recordId: updated.id,
        templateId: updated.templateId,
        action: "SAVE_DRAFT",
        actor: params.actor,
        after: {
            resultVersion: updated.resultVersion,
            countEvaluated: summary.countEvaluated,
            countDat: summary.countDat,
            countKhongDat: summary.countKhongDat,
            countKhongLam: summary.countKhongLam,
            countChuaDanhGia: summary.countChuaDanhGia,
            evaluationStatus: nextEvalStatus,
        },
    });

    await syncLegacyScoreAndStageProgress({
        record: updated,
        criteriaConfig,
        actor: params.actor,
    });

    return getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId,
        actor: params.actor,
    });
}

// ============================================================================
// 6. QUẢN LÝ ẢNH SẢN PHẨM TẠI CÂU 16 (VÀ CÂU 13 NẾU CẤU HÌNH)
// ============================================================================

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function verifyImageBase64AndMime(dataUrlOrBase64: string, declaredMime: string): {
    cleanDataUrl: string;
    byteLength: number;
    sha256: string;
} {
    const raw = String(dataUrlOrBase64 || "").trim();
    if (!raw) {
        throw new Error("Dữ liệu ảnh trống.");
    }

    let mime = declaredMime.toLowerCase().trim();
    let base64Body = raw;

    const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (match) {
        mime = match[1].toLowerCase();
        base64Body = match[2];
    }

    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
        throw new Error(
            `Định dạng tệp "${mime}" không được hỗ trợ. Hệ thống chỉ chấp nhận ảnh JPEG (.jpg), PNG (.png) hoặc WebP (.webp).`
        );
    }

    const buffer = Buffer.from(base64Body, "base64");
    if (buffer.length < 16) {
        throw new Error("Tệp ảnh không hợp lệ hoặc bị hỏng.");
    }

    // Kiểm tra chữ ký byte đầu (Magic Bytes) chống giả mạo đuôi tệp
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
    const isWebp =
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP";

    if (!isJpeg && !isPng && !isWebp) {
        throw new Error(
            "Nội dung tệp không phải là định dạng ảnh hợp lệ (JPEG, PNG, WebP). Vui lòng chọn đúng tệp ảnh."
        );
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    return {
        cleanDataUrl: `data:${mime};base64,${base64Body}`,
        byteLength: buffer.length,
        sha256,
    };
}

export async function uploadTciProductEvidence(params: {
    studentId: string;
    periodId?: string | null;
    criterionId: string;
    fileName: string;
    mimeType: string;
    imageDataBase64: string;
    rotationDeg?: number;
    replaceEvidenceId?: string | null;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const { periodId, assignment } = await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: params.studentId,
        periodId: params.periodId,
        mode: "EDIT",
    });

    const bundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId,
        actor: params.actor,
    });

    const record = bundle.record;
    if (record.signatureStatus === "SIGNED") {
        throw new Error("Phiếu đã ký xác nhận, không thể tải thêm hoặc thay thế ảnh sản phẩm.");
    }

    const criterionConfig = bundle.template.criteria.find(
        (c) => c.criterionId === params.criterionId || `STT_${c.stt}` === params.criterionId
    );
    if (!criterionConfig) {
        throw new Error(`Không tìm thấy cấu hình tiêu chí "${params.criterionId}" trong mẫu phiếu.`);
    }
    if (!criterionConfig.allowProductImage) {
        throw new Error(`Tiêu chí STT ${criterionConfig.stt} không bật cấu hình đính kèm ảnh sản phẩm.`);
    }

    const { cleanDataUrl, byteLength, sha256 } = verifyImageBase64AndMime(
        params.imageDataBase64,
        params.mimeType
    );

    const maxBytes = (criterionConfig.maxFileSizeMb || 5) * 1024 * 1024;
    if (byteLength > maxBytes) {
        throw new Error(
            `Dung lượng ảnh (${(byteLength / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn cho phép (${criterionConfig.maxFileSizeMb || 5} MB).`
        );
    }

    const db = getTciDb();

    // Nếu thay thế ảnh cũ, đánh dấu DELETED ảnh cũ
    if (params.replaceEvidenceId) {
        const existingEv = await db.tciProductEvidence.findUnique({
            where: { id: params.replaceEvidenceId },
        });
        if (existingEv && existingEv.recordId === record.id) {
            await db.tciProductEvidence.update({
                where: { id: existingEv.id },
                data: { status: "DELETED" },
            });
        }
    } else {
        const currentActiveCount = await db.tciProductEvidence.count({
            where: {
                recordId: record.id,
                criterionId: criterionConfig.criterionId,
                status: "ACTIVE",
            },
        });
        const maxImages = criterionConfig.maxImages || 3;
        if (currentActiveCount >= maxImages) {
            throw new Error(
                `Tiêu chí STT ${criterionConfig.stt} chỉ cho phép đính kèm tối đa ${maxImages} ảnh sản phẩm. Vui lòng xóa hoặc thay thế ảnh hiện có.`
            );
        }
    }

    const safeRotation = [0, 90, 180, 270].includes(Number(params.rotationDeg))
        ? Number(params.rotationDeg)
        : 0;

    const created = await db.tciProductEvidence.create({
        data: {
            recordId: record.id,
            studentId: record.studentId,
            periodId: record.periodId,
            subjectId: record.subjectId,
            assignmentId: assignment?.id || record.assignmentId || null,
            resultVersion: record.resultVersion,
            criterionId: criterionConfig.criterionId,
            criterionStt: criterionConfig.stt,
            indicatorCode: criterionConfig.indicatorCodes.join(","),
            fileName: params.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_") || `SanPham_Cau${criterionConfig.stt}.jpg`,
            mimeType: params.mimeType.toLowerCase(),
            fileSizeBytes: byteLength,
            rotationDeg: safeRotation,
            imageDataBase64: cleanDataUrl,
            fileSha256: sha256,
            uploadedByUserId: params.actor.userId,
            uploadedByName: params.actor.userName,
            status: "ACTIVE",
        },
    });

    await writeTciAuditLog({
        entityType: "EVIDENCE",
        entityId: created.id,
        studentId: record.studentId,
        recordId: record.id,
        action: params.replaceEvidenceId ? "REPLACE_EVIDENCE" : "UPLOAD_EVIDENCE",
        actor: params.actor,
        after: {
            criterionId: created.criterionId,
            criterionStt: created.criterionStt,
            fileName: created.fileName,
            fileSizeBytes: created.fileSizeBytes,
            rotationDeg: created.rotationDeg,
        },
    });

    return created;
}

export async function rotateTciProductEvidence(params: {
    evidenceId: string;
    rotationDeg: number;
    rotatedImageDataBase64?: string | null;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const db = getTciDb();
    const ev = await db.tciProductEvidence.findUnique({ where: { id: params.evidenceId } });
    if (!ev || ev.status !== "ACTIVE") {
        throw new Error("Không tìm thấy ảnh sản phẩm.");
    }

    await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: ev.studentId,
        periodId: ev.periodId,
        mode: "EDIT",
    });

    const record = await db.tciAssessmentRecord.findUnique({ where: { id: ev.recordId } });
    if (record?.signatureStatus === "SIGNED") {
        throw new Error("Phiếu đã ký xác nhận, không thể xoay hoặc chỉnh sửa ảnh sản phẩm.");
    }

    const normalizedDeg = ((Number(params.rotationDeg || 0) % 360) + 360) % 360;
    const updateData: Record<string, any> = {
        rotationDeg: normalizedDeg,
    };

    if (params.rotatedImageDataBase64) {
        const verified = verifyImageBase64AndMime(params.rotatedImageDataBase64, ev.mimeType);
        updateData.imageDataBase64 = verified.cleanDataUrl;
        updateData.fileSizeBytes = verified.byteLength;
        updateData.fileSha256 = verified.sha256;
        // Nếu ảnh đã được xoay trực tiếp trên canvas client và lưu lại bitmap mới thì rotationDeg = 0 để không xoay kép
        updateData.rotationDeg = 0;
    }

    const updated = await db.tciProductEvidence.update({
        where: { id: ev.id },
        data: updateData,
    });

    await writeTciAuditLog({
        entityType: "EVIDENCE",
        entityId: ev.id,
        studentId: ev.studentId,
        recordId: ev.recordId,
        action: "ROTATE_EVIDENCE",
        actor: params.actor,
        before: { rotationDeg: ev.rotationDeg },
        after: { rotationDeg: updated.rotationDeg },
    });

    return updated;
}

export async function deleteTciProductEvidence(params: {
    evidenceId: string;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const db = getTciDb();
    const ev = await db.tciProductEvidence.findUnique({ where: { id: params.evidenceId } });
    if (!ev || ev.status !== "ACTIVE") {
        throw new Error("Không tìm thấy ảnh sản phẩm cần xóa.");
    }

    await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: ev.studentId,
        periodId: ev.periodId,
        mode: "EDIT",
    });

    const record = await db.tciAssessmentRecord.findUnique({ where: { id: ev.recordId } });
    if (record?.signatureStatus === "SIGNED") {
        throw new Error("Phiếu đã ký xác nhận, không thể xóa ảnh sản phẩm.");
    }

    const deleted = await db.tciProductEvidence.update({
        where: { id: ev.id },
        data: { status: "DELETED" },
    });

    await writeTciAuditLog({
        entityType: "EVIDENCE",
        entityId: ev.id,
        studentId: ev.studentId,
        recordId: ev.recordId,
        action: "DELETE_EVIDENCE",
        actor: params.actor,
        before: { fileName: ev.fileName, criterionStt: ev.criterionStt },
    });

    return deleted;
}

// ============================================================================
// 7. TRA CỨU CHỮ KÝ SỐ CỦA TÔI & KÝ XÁC NHẬN HOÀN THÀNH + XUẤT PDF BẤT BIẾN
// ============================================================================

export async function resolveActorSignatureProfile(actor: TciActorContext): Promise<{
    hasSignature: boolean;
    signatureType: "CERTIFICATE_CA" | "TEACHER_SIGNATURE_IMAGE" | null;
    signatureImageBase64: string | null;
    signerName: string;
    signerRole: string;
    certificateSerial?: string | null;
    provider?: string | null;
}> {
    // 1. Kiểm tra TeacherSignatureProfile (cấu hình tại /teacher/chu-ky-so)
    const lookupTeacherId = actor.teacherId || actor.userId;
    if (lookupTeacherId) {
        try {
            const teacherSig: any = await prisma.teacherSignatureProfile.findUnique({
                where: { teacherId: lookupTeacherId },
                include: { teacher: true },
            });
            if (teacherSig) {
                const sigImg =
                    teacherSig.visualAppearanceUrl ||
                    teacherSig.signatureBase64 ||
                    teacherSig.signatureImage ||
                    null;
                const certSerial =
                    teacherSig.serialNumber || teacherSig.certificateSerial || null;
                const isCertConnected =
                    (teacherSig.connectionStatus === "CONNECTED" || teacherSig.isActive === true) &&
                    teacherSig.provider &&
                    teacherSig.provider !== "NOT_CONFIGURED" &&
                    Boolean(certSerial || teacherSig.provider === "VNPT_SMARTCA" || teacherSig.provider === "VIETTEL_CA");

                const isActiveSig =
                    teacherSig.connectionStatus === "CONNECTED" ||
                    teacherSig.isActive === true ||
                    (teacherSig.connectionStatus !== "REVOKED" &&
                        teacherSig.connectionStatus !== "EXPIRED" &&
                        Boolean(sigImg));

                if (isActiveSig && (sigImg || isCertConnected)) {
                    return {
                        hasSignature: true,
                        signatureType: isCertConnected ? "CERTIFICATE_CA" : "TEACHER_SIGNATURE_IMAGE",
                        signatureImageBase64: sigImg,
                        signerName:
                            teacherSig.teacher?.teacherName ||
                            teacherSig.teacher?.fullName ||
                            actor.userName,
                        signerRole: teacherSig.signatureRoleText || "Giáo viên khảo sát",
                        certificateSerial: certSerial,
                        provider: teacherSig.provider,
                    };
                }
            }
        } catch {
            // ignore
        }
    }

    // 2. Kiểm tra TeacherSignatureProfile theo teacher.userId nếu actor.teacherId chưa khớp
    if (actor.userId) {
        try {
            const byUser: any = await (prisma.teacherSignatureProfile as any).findFirst?.({
                where: { teacher: { userId: actor.userId } },
                include: { teacher: true },
            });
            if (byUser && (byUser.visualAppearanceUrl || byUser.connectionStatus === "CONNECTED")) {
                const isCert =
                    byUser.connectionStatus === "CONNECTED" &&
                    byUser.provider &&
                    byUser.provider !== "NOT_CONFIGURED" &&
                    Boolean(byUser.serialNumber);
                return {
                    hasSignature: true,
                    signatureType: isCert ? "CERTIFICATE_CA" : "TEACHER_SIGNATURE_IMAGE",
                    signatureImageBase64: byUser.visualAppearanceUrl || null,
                    signerName: byUser.teacher?.teacherName || actor.userName,
                    signerRole: byUser.signatureRoleText || "Giáo viên khảo sát",
                    certificateSerial: byUser.serialNumber,
                    provider: byUser.provider,
                };
            }
        } catch {
            // ignore
        }
    }

    return {
        hasSignature: false,
        signatureType: null,
        signatureImageBase64: null,
        signerName: actor.userName,
        signerRole: "Giáo viên khảo sát",
    };
}

/**
 * Ký và xác nhận hoàn thành phiếu khảo sát môn TCI:
 * - Idempotent: Nếu phiếu đã ký rồi, trả về ngay kết quả đã ký mà không tạo bản ký trùng.
 * - Kiểm tra đủ 16/16 tiêu chí, ảnh minh chứng bắt buộc, nhận xét bắt buộc.
 * - Kiểm tra giáo viên đã cấu hình chữ ký tại "Chữ ký số của tôi" (/teacher/chu-ky-so).
 * - Sinh snapshot JSON + SHA-256 + xuất file PDF bất biến.
 * - Nếu quá trình tạo PDF lỗi, giữ nguyên dữ liệu nháp để GV ký lại, không báo hoàn thành sai.
 */
export async function signAndCompleteTciAssessment(params: {
    studentId: string;
    periodId?: string | null;
    assessmentDate?: string | null;
    criteriaResults?: unknown;
    generalComment?: string | null;
    highlightsComment?: string | null;
    supportNeededComment?: string | null;
    teacherRecommendation?: string | null;
    hasUploadingOrErroredEvidence?: boolean;
    actor: TciActorContext;
}) {
    await ensureTciSchema();

    const { periodId } = await assertActorCanAccessStudentTci({
        actor: params.actor,
        studentId: params.studentId,
        periodId: params.periodId,
        mode: "SIGN",
    });

    // Nếu client gửi kèm dữ liệu mới nhất trên form, lưu nháp trước khi kiểm tra ký
    let currentBundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId,
        actor: params.actor,
    });

    // Idempotent check: Nếu đã ký rồi thì trả về ngay không ký trùng
    if (currentBundle.record.signatureStatus === "SIGNED" && currentBundle.record.evaluationStatus === "COMPLETED") {
        return {
            alreadySigned: true,
            bundle: currentBundle,
        };
    }

    if (params.criteriaResults !== undefined) {
        currentBundle = await saveTciAssessmentDraft({
            studentId: params.studentId,
            periodId,
            assessmentDate: params.assessmentDate,
            criteriaResults: params.criteriaResults,
            generalComment: params.generalComment,
            highlightsComment: params.highlightsComment,
            supportNeededComment: params.supportNeededComment,
            teacherRecommendation: params.teacherRecommendation,
            actor: params.actor,
        });
    }

    const record = currentBundle.record;
    const template = currentBundle.template;

    // 1. Kiểm tra điều kiện hoàn thành 16/16 tiêu chí + ảnh sản phẩm + nhận xét bắt buộc
    const validation = validateTciCompletion({
        criteriaResults: record.criteriaResults,
        criteriaConfig: template.criteria,
        footerConfig: template.footerConfig,
        evidences: record.evidences,
        hasUploadingOrErroredEvidence: params.hasUploadingOrErroredEvidence,
        generalComment: record.generalComment,
        highlightsComment: record.highlightsComment,
        supportNeededComment: record.supportNeededComment,
        teacherRecommendation: record.teacherRecommendation,
    });

    if (!validation.valid) {
        const err: any = new Error(validation.errors.join(" "));
        err.code = "VALIDATION_FAILED";
        err.validation = validation;
        throw err;
    }

    // 2. Kiểm tra cấu hình "Chữ ký số của tôi"
    const sigProfile = await resolveActorSignatureProfile(params.actor);
    if (!sigProfile.hasSignature) {
        const err: any = new Error(
            "Bạn chưa thiết lập chữ ký tại mục “Chữ ký số của tôi”. Hệ thống đã lưu an toàn toàn bộ dữ liệu đánh giá nháp. Vui lòng thiết lập chữ ký trước khi ký xác nhận phiếu."
        );
        err.code = "MISSING_SIGNATURE_PROFILE";
        err.redirectUrl = "/teacher/chu-ky-so";
        throw err;
    }

    const signedAt = new Date();
    const signedAtIso = signedAt.toISOString();

    // 3. Tạo Snapshot dữ liệu tại thời điểm ký và mã băm SHA-256
    const snapshotObject = {
        recordId: record.id,
        resultVersion: record.resultVersion,
        studentId: record.studentId,
        studentCode: currentBundle.student?.studentCode || record.studentCode,
        studentName: currentBundle.student?.fullName || record.studentName,
        grade: currentBundle.student?.grade || record.grade,
        periodId: record.periodId,
        templateId: template.id,
        templateCode: template.code,
        templateVersionCode: template.versionCode,
        assessmentDate: record.assessmentDate || signedAtIso.slice(0, 10),
        criteriaResults: record.criteriaResults,
        summary: validation.summary,
        generalComment: record.generalComment || "",
        highlightsComment: record.highlightsComment || "",
        supportNeededComment: record.supportNeededComment || "",
        teacherRecommendation: record.teacherRecommendation || "",
        evidences: record.evidences.map((ev: any) => ({
            id: ev.id,
            criterionId: ev.criterionId,
            criterionStt: ev.criterionStt,
            fileName: ev.fileName,
            mimeType: ev.mimeType,
            rotationDeg: ev.rotationDeg,
        })),
        signer: {
            userId: params.actor.userId,
            teacherId: params.actor.teacherId || null,
            name: sigProfile.signerName,
            role: sigProfile.signerRole,
            signatureType: sigProfile.signatureType,
            signedAt: signedAtIso,
        },
    };

    const signedSnapshotJson = JSON.stringify(snapshotObject);
    const signedSnapshotHash = crypto.createHash("sha256").update(signedSnapshotJson).digest("hex");

    // 4. Tạo file PDF bất biến trước khi chốt trạng thái SIGNED
    // (Nếu tạo PDF lỗi, dữ liệu đánh giá nháp vẫn được giữ nguyên, không bị đánh dấu hoàn thành sai)
    const renderPayload: TciDocumentRenderPayload = {
        recordId: record.id,
        resultVersion: record.resultVersion,
        templateCode: template.code,
        templateName: template.name,
        templateVersionCode: template.versionCode,
        studentId: record.studentId,
        studentCode: currentBundle.student?.studentCode || record.studentCode || record.studentId,
        studentName: currentBundle.student?.fullName || record.studentName || "Học sinh",
        studentDob: currentBundle.student?.dob ? new Date(currentBundle.student.dob).toISOString() : null,
        studentGender: currentBundle.student?.gender || null,
        grade: currentBundle.student?.grade || record.grade || "Khối 1",
        campusName: currentBundle.student?.campusName || null,
        periodName: currentBundle.student?.periodName || record.periodId,
        periodCode: record.periodId,
        batchName: currentBundle.student?.batchName || null,
        educationSystemName: currentBundle.student?.educationSystemName || null,
        assessmentDate: record.assessmentDate || signedAtIso.slice(0, 10),
        assignedTeacherName: currentBundle.assignment?.teacherName || record.assignedTeacherName,
        assessorName: sigProfile.signerName,
        criteriaConfig: template.criteria,
        footerConfig: template.footerConfig,
        exportConfig: template.exportConfig,
        criteriaResults: record.criteriaResults,
        evidences: record.evidences,
        generalComment: record.generalComment,
        highlightsComment: record.highlightsComment,
        supportNeededComment: record.supportNeededComment,
        teacherRecommendation: record.teacherRecommendation,
        signatureStatus: "SIGNED",
        signatureType: sigProfile.signatureType,
        signerName: sigProfile.signerName,
        signerRole: sigProfile.signerRole,
        signatureImageBase64: sigProfile.signatureImageBase64,
        signedAt: signedAtIso,
        signedSnapshotHash,
    };

    const { pdfBuffer, htmlContent, pdfSha256, fileName } = await generateTciPdfBuffer(renderPayload);
    const { storageKey } = await saveImmutableSignedTciPdf({
        recordId: record.id,
        resultVersion: record.resultVersion,
        fileName,
        pdfBuffer,
        htmlContent,
    });

    // 5. Cập nhật trạng thái ĐÃ KÝ & KHÓA PHIẾU
    const db = getTciDb();
    const signedRecord = await db.tciAssessmentRecord.update({
        where: { id: record.id },
        data: {
            assessorUserId: params.actor.userId,
            assessorTeacherId: params.actor.teacherId || record.assessorTeacherId,
            assessorName: sigProfile.signerName,
            evaluationStatus: "COMPLETED",
            signatureStatus: "SIGNED",
            signatureType: sigProfile.signatureType,
            signerUserId: params.actor.userId,
            signerTeacherId: params.actor.teacherId || null,
            signerName: sigProfile.signerName,
            signerRole: sigProfile.signerRole,
            signatureImageBase64: sigProfile.signatureImageBase64,
            signedAt: signedAtIso,
            signedSnapshotJson,
            signedSnapshotHash,
            signedPdfStorageKey: storageKey,
            signedPdfFileName: fileName,
            signedPdfSha256: pdfSha256,
            signedPdfSizeBytes: pdfBuffer.length,
            reviewStatus: record.reviewStatus === "REOPENED" ? "PENDING" : record.reviewStatus || "PENDING",
            lockVersion: (record.lockVersion || 1) + 1,
        },
    });

    await writeTciAuditLog({
        entityType: "SIGNATURE",
        entityId: signedRecord.id,
        studentId: signedRecord.studentId,
        recordId: signedRecord.id,
        templateId: signedRecord.templateId,
        action: "SIGN_COMPLETED",
        actor: params.actor,
        after: {
            resultVersion: signedRecord.resultVersion,
            signatureType: sigProfile.signatureType,
            signerName: sigProfile.signerName,
            signedAt: signedAtIso,
            signedPdfFileName: fileName,
            signedPdfSha256: pdfSha256,
            signedSnapshotHash,
        },
    });

    await syncLegacyScoreAndStageProgress({
        record: signedRecord,
        criteriaConfig: template.criteria,
        actor: params.actor,
    });

    const updatedBundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId,
        actor: params.actor,
    });

    return {
        alreadySigned: false,
        bundle: updatedBundle,
    };
}

// ============================================================================
// 8. XÉT DUYỆT KẾT QUẢ & MỞ KHÓA TẠO PHIÊN BẢN MỚI (REVIEW & REOPEN)
// ============================================================================

export async function reviewTciAssessmentRecord(params: {
    studentId: string;
    periodId?: string | null;
    decision: "APPROVED" | "SUPPLEMENT_REQUESTED";
    reviewNote?: string | null;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    if (!canReviewTciResult(params.actor.role)) {
        throw new Error("Bạn không có quyền xét duyệt kết quả khảo sát đầu vào môn TCI.");
    }

    const bundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId: params.periodId,
        actor: params.actor,
    });

    const record = bundle.record;

    // Quy tắc bắt buộc (Mục 11): Người xét duyệt không thể chốt duyệt một bản nháp chưa hoàn thành hoặc chưa ký
    if (params.decision === "APPROVED") {
        if (record.signatureStatus !== "SIGNED" || record.evaluationStatus !== "COMPLETED") {
            throw new Error(
                "Không thể phê duyệt kết quả môn TCI khi phiếu đang ở trạng thái Nháp hoặc Chưa được giáo viên ký xác nhận hoàn thành."
            );
        }
        if (record.countChuaDanhGia > 0 || record.countEvaluated < 16) {
            throw new Error(
                `Phiếu chưa đánh giá đủ 16/16 tiêu chí (còn ${record.countChuaDanhGia} tiêu chí chưa đánh giá) nên không thể chốt duyệt.`
            );
        }
    }

    const db = getTciDb();
    const nowIso = new Date().toISOString();

    const updated = await db.tciAssessmentRecord.update({
        where: { id: record.id },
        data: {
            reviewStatus: params.decision,
            reviewerUserId: params.actor.userId,
            reviewerName: params.actor.userName,
            reviewedAt: nowIso,
            reviewNote: params.reviewNote?.trim() || null,
            lockVersion: (record.lockVersion || 1) + 1,
        },
    });

    await writeTciAuditLog({
        entityType: "REVIEW",
        entityId: record.id,
        studentId: record.studentId,
        recordId: record.id,
        action: params.decision === "APPROVED" ? "REVIEW_APPROVE" : "REVIEW_SUPPLEMENT",
        actor: params.actor,
        reason: params.reviewNote || null,
        before: { reviewStatus: record.reviewStatus },
        after: { reviewStatus: updated.reviewStatus, reviewedAt: nowIso },
    });

    await syncLegacyScoreAndStageProgress({
        record: updated,
        criteriaConfig: bundle.template.criteria,
        actor: params.actor,
    });

    return getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId: record.periodId,
        actor: params.actor,
    });
}

/**
 * Mở khóa / Yêu cầu đánh giá lại sau khi đã ký (Mục 12):
 * - Bắt buộc có quyền (Admin / Khảo thí / BGH / Giáo vụ) và bắt buộc nhập lý do.
 * - Giữ nguyên kết quả và file PDF đã ký cũ trong lịch sử (isLatestVersion = false).
 * - Tạo phiên bản kết quả mới (resultVersion + 1, isLatestVersion = true) ở trạng thái REOPENED / PENDING_RESIGN.
 * - Hủy hiệu lực phê duyệt cũ (reviewStatus = "REOPENED") để thay đổi chưa ký lại không giữ nguyên phê duyệt cũ.
 */
export async function reopenSignedTciAssessment(params: {
    studentId: string;
    periodId?: string | null;
    reason: string;
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    if (!canReopenTciResult(params.actor.role)) {
        throw new Error(
            "Chỉ Quản trị viên, Ban Khảo thí & ĐBCL, Ban Giám hiệu hoặc Giáo vụ mới có quyền mở khóa phiếu TCI đã ký."
        );
    }

    const cleanReason = String(params.reason || "").trim();
    if (!cleanReason || cleanReason.length < 5) {
        throw new Error("Vui lòng nhập lý do mở khóa / yêu cầu đánh giá lại (tối thiểu 5 ký tự).");
    }

    const bundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId: params.periodId,
        actor: params.actor,
    });

    const oldRecord = bundle.record;
    if (oldRecord.signatureStatus !== "SIGNED") {
        throw new Error("Phiếu hiện tại chưa ký khóa nên giáo viên có thể tiếp tục chỉnh sửa mà không cần mở khóa phiên bản mới.");
    }

    const db = getTciDb();
    const nowIso = new Date().toISOString();
    const nextResultVersion = (oldRecord.resultVersion || 1) + 1;

    // 1. Đánh dấu bản ghi đã ký cũ là isLatestVersion = false (giữ nguyên toàn bộ chữ ký, snapshot và PDF cũ)
    await db.tciAssessmentRecord.update({
        where: { id: oldRecord.id },
        data: {
            isLatestVersion: false,
        },
    });

    // 2. Tạo phiên bản kết quả mới (resultVersion + 1) yêu cầu GV ký lại và hủy hiệu lực duyệt cũ
    const newRecord = await db.tciAssessmentRecord.create({
        data: {
            studentId: oldRecord.studentId,
            studentCode: oldRecord.studentCode,
            studentName: oldRecord.studentName,
            periodId: oldRecord.periodId,
            batchId: oldRecord.batchId,
            campusId: oldRecord.campusId,
            grade: oldRecord.grade,
            subjectId: oldRecord.subjectId,
            subjectCode: oldRecord.subjectCode,
            assignmentId: oldRecord.assignmentId,
            templateId: oldRecord.templateId,
            templateCode: oldRecord.templateCode,
            templateVersionNumber: oldRecord.templateVersionNumber,
            templateVersionCode: oldRecord.templateVersionCode,
            resultVersion: nextResultVersion,
            isLatestVersion: true,
            previousRecordId: oldRecord.id,
            assessmentDate: oldRecord.assessmentDate,
            assignedTeacherId: oldRecord.assignedTeacherId,
            assignedTeacherName: oldRecord.assignedTeacherName,
            assessorUserId: oldRecord.assessorUserId,
            assessorTeacherId: oldRecord.assessorTeacherId,
            assessorName: oldRecord.assessorName,
            criteriaResultsJson: oldRecord.criteriaResultsJson,
            countEvaluated: oldRecord.countEvaluated,
            countDat: oldRecord.countDat,
            countKhongDat: oldRecord.countKhongDat,
            countKhongLam: oldRecord.countKhongLam,
            countChuaDanhGia: oldRecord.countChuaDanhGia,
            generalComment: oldRecord.generalComment,
            highlightsComment: oldRecord.highlightsComment,
            supportNeededComment: oldRecord.supportNeededComment,
            teacherRecommendation: oldRecord.teacherRecommendation,
            evaluationStatus: "REOPENED",
            signatureStatus: "PENDING_RESIGN",
            signatureType: null,
            signerUserId: null,
            signerTeacherId: null,
            signerName: null,
            signerRole: null,
            signatureImageBase64: null,
            signedAt: null,
            signedSnapshotJson: null,
            signedSnapshotHash: null,
            signedPdfStorageKey: null,
            signedPdfFileName: null,
            signedPdfSha256: null,
            signedPdfSizeBytes: null,
            reviewStatus: "REOPENED",
            reviewerUserId: null,
            reviewerName: null,
            reviewedAt: null,
            reviewNote: null,
            reopenReason: cleanReason,
            reopenedById: params.actor.userId,
            reopenedByName: params.actor.userName,
            reopenedAt: nowIso,
            lockVersion: 1,
        },
    });

    // 3. Sao chép các bản ghi minh chứng ảnh đang ACTIVE sang phiên bản kết quả mới để GV không phải tải lại từ đầu
    for (const ev of oldRecord.evidences) {
        await db.tciProductEvidence.create({
            data: {
                recordId: newRecord.id,
                studentId: newRecord.studentId,
                periodId: newRecord.periodId,
                subjectId: newRecord.subjectId,
                assignmentId: newRecord.assignmentId,
                resultVersion: nextResultVersion,
                criterionId: ev.criterionId,
                criterionStt: ev.criterionStt,
                indicatorCode: ev.indicatorCode,
                fileName: ev.fileName,
                mimeType: ev.mimeType,
                fileSizeBytes: ev.fileSizeBytes,
                rotationDeg: ev.rotationDeg,
                imageDataBase64: ev.imageDataBase64 || "",
                fileSha256: crypto.createHash("sha256").update(ev.imageDataBase64 || "").digest("hex"),
                uploadedByUserId: ev.uploadedByUserId,
                uploadedByName: ev.uploadedByName,
                status: "ACTIVE",
            },
        });
    }

    await writeTciAuditLog({
        entityType: "ASSESSMENT_RECORD",
        entityId: newRecord.id,
        studentId: newRecord.studentId,
        recordId: newRecord.id,
        templateId: newRecord.templateId,
        action: "REOPEN_VERSION",
        actor: params.actor,
        reason: cleanReason,
        before: {
            previousRecordId: oldRecord.id,
            previousResultVersion: oldRecord.resultVersion,
            previousReviewStatus: oldRecord.reviewStatus,
        },
        after: {
            newRecordId: newRecord.id,
            newResultVersion: newRecord.resultVersion,
            evaluationStatus: "REOPENED",
            signatureStatus: "PENDING_RESIGN",
            reviewStatus: "REOPENED",
        },
    });

    await syncLegacyScoreAndStageProgress({
        record: newRecord,
        criteriaConfig: bundle.template.criteria,
        actor: params.actor,
    });

    return getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId: newRecord.periodId,
        actor: params.actor,
    });
}

// ============================================================================
// 9. LẤY FILE PDF ĐÃ KÝ HOẶC BẢN XEM TRƯỚC HTML/PDF
// ============================================================================

export async function getStudentTciDocumentOutput(params: {
    studentId: string;
    periodId?: string | null;
    resultVersion?: number | null;
    format: "pdf" | "html" | "word";
    actor: TciActorContext;
}) {
    await ensureTciSchema();
    const bundle = await getOrInitStudentTciRecord({
        studentId: params.studentId,
        periodId: params.periodId,
        resultVersion: params.resultVersion,
        actor: params.actor,
    });

    const record = bundle.record;
    const template = bundle.template;

    // Nếu là bản đã ký và yêu cầu tải PDF, đọc đúng bản PDF bất biến đã lưu khi ký
    if (params.format === "pdf" && record.signatureStatus === "SIGNED" && record.signedPdfStorageKey) {
        const storedPdf = await readImmutableSignedTciPdf(record.signedPdfStorageKey);
        if (storedPdf) {
            return {
                buffer: storedPdf,
                contentType: "application/pdf",
                fileName: record.signedPdfFileName || `TCI_${record.studentCode || record.studentId}_v${record.resultVersion}.pdf`,
                isSigned: true,
            };
        }
    }

    // Nếu xem từ snapshot đã ký (khi đĩa tạm trên cloud vừa khởi động lại), dựng lại từ đúng signedSnapshotJson bất biến
    const snapshot = record.signedSnapshotJson ? safeJsonParse<any>(record.signedSnapshotJson, null) : null;

    const renderPayload: TciDocumentRenderPayload = {
        recordId: record.id,
        resultVersion: record.resultVersion,
        templateCode: template.code,
        templateName: template.name,
        templateVersionCode: template.versionCode,
        studentId: record.studentId,
        studentCode: snapshot?.studentCode || bundle.student?.studentCode || record.studentCode || record.studentId,
        studentName: snapshot?.studentName || bundle.student?.fullName || record.studentName || "Học sinh",
        studentDob: bundle.student?.dob ? new Date(bundle.student.dob).toISOString() : null,
        studentGender: bundle.student?.gender || null,
        grade: snapshot?.grade || bundle.student?.grade || record.grade || "Khối 1",
        campusName: bundle.student?.campusName || null,
        periodName: bundle.student?.periodName || record.periodId,
        periodCode: record.periodId,
        batchName: bundle.student?.batchName || null,
        educationSystemName: bundle.student?.educationSystemName || null,
        assessmentDate: snapshot?.assessmentDate || record.assessmentDate,
        assignedTeacherName: bundle.assignment?.teacherName || record.assignedTeacherName,
        assessorName: record.signerName || record.assessorName || bundle.assignment?.teacherName,
        criteriaConfig: template.criteria,
        footerConfig: template.footerConfig,
        exportConfig: template.exportConfig,
        criteriaResults: snapshot?.criteriaResults || record.criteriaResults,
        evidences: record.evidences,
        generalComment: snapshot?.generalComment ?? record.generalComment,
        highlightsComment: snapshot?.highlightsComment ?? record.highlightsComment,
        supportNeededComment: snapshot?.supportNeededComment ?? record.supportNeededComment,
        teacherRecommendation: snapshot?.teacherRecommendation ?? record.teacherRecommendation,
        signatureStatus: record.signatureStatus,
        signatureType: record.signatureType,
        signerName: record.signerName,
        signerRole: record.signerRole,
        signatureImageBase64: record.signatureImageBase64,
        signedAt: record.signedAt,
        signedSnapshotHash: record.signedSnapshotHash,
    };

    if (params.format === "html") {
        const html = buildTciAssessmentHtml(renderPayload);
        return {
            buffer: Buffer.from(html, "utf-8"),
            contentType: "text/html; charset=utf-8",
            fileName: `TCI_${renderPayload.studentCode}_v${record.resultVersion}.html`,
            isSigned: record.signatureStatus === "SIGNED",
        };
    }

    if (params.format === "word") {
        const html = buildTciAssessmentHtml(renderPayload);
        const wordDoc = `\ufeff<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${html.replace("<!DOCTYPE html>", "").replace('<html lang="vi">', "")}`;
        return {
            buffer: Buffer.from(wordDoc, "utf-8"),
            contentType: "application/msword; charset=utf-8",
            fileName: `TCI_${renderPayload.studentCode}_v${record.resultVersion}.doc`,
            isSigned: record.signatureStatus === "SIGNED",
        };
    }

    const { pdfBuffer, fileName } = await generateTciPdfBuffer(renderPayload);
    return {
        buffer: pdfBuffer,
        contentType: "application/pdf",
        fileName: record.signedPdfFileName || fileName,
        isSigned: record.signatureStatus === "SIGNED",
    };
}
