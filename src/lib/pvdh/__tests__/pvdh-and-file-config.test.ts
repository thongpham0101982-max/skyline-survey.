import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  PVDH_SEED_TEMPLATES,
  classifyAssessmentContentCategory,
  getDefaultPvdhCodeForGrade,
  formatFollowUpActionsToText,
} from "../constants";
import {
  detectTemplateScopeConflicts,
  resolveSubjectAssessmentStatus,
  sanitizeSpreadsheetCell,
  validateExportMappings,
  validatePvdhRecordData,
  validateSafeScoreFormula,
} from "../validation";
import { calculateCompositeScore } from "@/lib/grading/formula-calculator";

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG CHO PVDH (KHỐI 1–12) & CẤU HÌNH FILE KSDV 3 LỚP
 * Tuân thủ nghiêm ngặt GEMINI.md Quy tắc #1:
 * - 100% sử dụng In-Memory Mock cho `@/lib/db`, `schema-init`, `pdf-service`, `@/lib/auth`
 * - Tuyệt đối KHÔNG ghi/sửa/xóa bất kỳ dữ liệu nào trên `local.db`, `dev.db` hoặc Turso Cloud.
 */

const mem = {
  pvdhTemplates: new Map<string, any>(),
  pvdhVersions: new Map<string, any>(),
  pvdhRecords: new Map<string, any>(),
  pvdhReviews: new Map<string, any>(),
  pvdhDocs: new Map<string, any>(),
  pvdhHandovers: new Map<string, any>(),
  pvdhAuditLogs: [] as any[],
  ksdvFileTemplates: new Map<string, any>(),
  ksdvMappings: new Map<string, any>(),

  inputStudents: new Map<string, any>(),
  enrolledStudents: new Map<string, any>(),
  classes: new Map<string, any>(),
  assignments: [] as any[],
  signatureProfiles: new Map<string, any>(),
  legacyOrientationRecords: new Map<string, any>(),
  studentScores: new Map<string, any>(),
  storedFiles: new Map<string, Buffer>(),
};

let seq = 1;

function matchCondition(val: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
    if ("in" in cond && Array.isArray(cond.in)) {
      return cond.in.includes(val);
    }
    if ("not" in cond) {
      return val !== cond.not;
    }
    if ("contains" in cond) {
      return String(val || "").toLowerCase().includes(String(cond.contains || "").toLowerCase());
    }
  }
  return val === cond;
}

function matchesWhere(item: any, where?: Record<string, any>): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (k === "OR" && Array.isArray(v)) {
      if (!v.some((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (k === "AND" && Array.isArray(v)) {
      if (!v.every((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (!matchCondition(item[k], v)) return false;
  }
  return true;
}

function makeDelegate(mapGetter: () => Map<string, any>, prefix: string) {
  return {
    findMany: async (args?: { where?: any; orderBy?: any; take?: number; skip?: number }) => {
      let arr = Array.from(mapGetter().values()).filter((x) => matchesWhere(x, args?.where));
      if (args?.orderBy) {
        const orders = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        arr.sort((a, b) => {
          for (const o of orders) {
            const [col, dir] = Object.entries(o)[0] as [string, string];
            if (a[col] !== b[col]) {
              const cmp = a[col] > b[col] ? 1 : -1;
              return String(dir).toLowerCase() === "desc" ? -cmp : cmp;
            }
          }
          return 0;
        });
      }
      if (typeof args?.skip === "number") arr = arr.slice(args.skip);
      if (typeof args?.take === "number") arr = arr.slice(0, args.take);
      return arr.map((x) => ({ ...x }));
    },
    findFirst: async function (args?: { where?: any; orderBy?: any }) {
      const rows = await this.findMany({ ...args, take: 1 });
      return rows[0] || null;
    },
    findUnique: async function (args: { where: any }) {
      const rows = await this.findMany({ where: args.where, take: 1 });
      return rows[0] || null;
    },
    count: async function (args?: { where?: any }) {
      const rows = await this.findMany({ where: args?.where });
      return rows.length;
    },
    create: async function (args: { data: Record<string, any> }) {
      const now = new Date().toISOString();
      const id = args.data.id || `${prefix}_${seq++}`;
      const row = {
        ...args.data,
        id,
        createdAt: args.data.createdAt || now,
        updatedAt: args.data.updatedAt || now,
      };
      mapGetter().set(id, row);
      return { ...row };
    },
    update: async function (args: { where: Record<string, any>; data: Record<string, any> }) {
      const existing = await this.findFirst({ where: args.where });
      if (!existing) return null;
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date().toISOString(),
      };
      mapGetter().set(existing.id, updated);
      return { ...updated };
    },
    updateMany: async function (args: { where?: Record<string, any>; data: Record<string, any> }) {
      const list = await this.findMany({ where: args.where });
      for (const item of list) {
        mapGetter().set(item.id, {
          ...item,
          ...args.data,
          updatedAt: new Date().toISOString(),
        });
      }
      return { count: list.length };
    },
    delete: async function (args: { where: Record<string, any> }) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) mapGetter().delete(existing.id);
      return existing;
    },
    deleteMany: async function (args?: { where?: Record<string, any> }) {
      const list = await this.findMany({ where: args?.where });
      for (const item of list) {
        mapGetter().delete(item.id);
      }
      return { count: list.length };
    },
  };
}

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    inputAssessmentStudent: {
      findUnique: vi.fn(async ({ where }: any) => mem.inputStudents.get(where.id) || null),
      findFirst: vi.fn(async ({ where }: any) => {
        const list = Array.from(mem.inputStudents.values()).filter((s) => matchesWhere(s, where));
        return list[0] || null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(mem.inputStudents.values()).filter((s) => matchesWhere(s, where));
      }),
    },
    inputAssessmentTeacherAssignment: {
      findMany: vi.fn(async ({ where }: any) => {
        return mem.assignments.filter((a) => matchesWhere(a, where));
      }),
    },
    inputAssessmentSessionExaminer: {
      findMany: vi.fn(async () => []),
    },
    student: {
      findFirst: vi.fn(async ({ where }: any) => {
        const list = Array.from(mem.enrolledStudents.values()).filter((s) => matchesWhere(s, where));
        return list[0] || null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(mem.enrolledStudents.values()).filter((s) => matchesWhere(s, where));
      }),
    },
    class: {
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(mem.classes.values()).filter((c) => matchesWhere(c, where));
      }),
      findUnique: vi.fn(async ({ where }: any) => mem.classes.get(where.id) || null),
    },
    teacher: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => ({
        id: where.id,
        fullName: `Nhân sự ${where.id}`,
      })),
    },
    teacherSignatureProfile: {
      findUnique: vi.fn(async ({ where }: any) => mem.signatureProfiles.get(where.teacherId) || null),
    },
    studentOrientationRecord: {
      findUnique: vi.fn(async ({ where }: any) => mem.legacyOrientationRecords.get(where.studentId) || null),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `leg_${seq++}`, ...data };
        mem.legacyOrientationRecords.set(data.studentId, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const prev = mem.legacyOrientationRecords.get(where.studentId) || {};
        const next = { ...prev, ...data };
        mem.legacyOrientationRecords.set(where.studentId, next);
        return next;
      }),
    },
    studentAssessmentScore: {
      findMany: vi.fn(async () => Array.from(mem.studentScores.values())),
    },
  },
}));

vi.mock("@/lib/entrance-progress/entranceProgressEngine", () => ({
  executeEntranceWorkflowAction: vi.fn(async () => ({ success: true })),
}));

vi.mock("../schema-init", () => ({
  ensurePvdhSchema: vi.fn(async () => {}),
  getPvdhDb: vi.fn(() => ({
    pvdhTemplate: makeDelegate(() => mem.pvdhTemplates, "pvdhtpl"),
    pvdhTemplateVersion: makeDelegate(() => mem.pvdhVersions, "pvdhver"),
    pvdhAssessmentRecord: makeDelegate(() => mem.pvdhRecords, "pvdhrec"),
    pvdhReviewHistory: makeDelegate(() => mem.pvdhReviews, "pvdhrev"),
    pvdhGeneratedDocument: makeDelegate(() => mem.pvdhDocs, "pvdhdoc"),
    pvdhHandover: makeDelegate(() => mem.pvdhHandovers, "pvdhhnd"),
    pvdhAuditLog: {
      create: async ({ data }: any) => {
        const row = { id: `aud_${seq++}`, ...data, createdAt: new Date().toISOString() };
        mem.pvdhAuditLogs.unshift(row);
        return row;
      },
      findMany: async ({ where }: any) => {
        return mem.pvdhAuditLogs.filter((l) => matchesWhere(l, where));
      },
    },
    ksdvFileTemplate: makeDelegate(() => mem.ksdvFileTemplates, "ksdvtpl"),
    ksdvExportMapping: makeDelegate(() => mem.ksdvMappings, "ksdvmap"),
  })),
}));

vi.mock("../pdf-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pdf-service")>();
  return {
    ...actual,
    savePrivatePvdhPdf: vi.fn(async ({ recordId, versionNumber, fileName, buffer }: any) => {
      const storageKey = `pvdh-pdfs/${recordId}/v${versionNumber}_${fileName}`;
      mem.storedFiles.set(storageKey, buffer);
      return { storageKey, filePath: storageKey };
    }),
    readPrivatePvdhPdf: vi.fn(async (storageKey: string) => {
      return mem.storedFiles.get(storageKey) || null;
    }),
  };
});

import {
  acknowledgePvdhHandoverByGvcn,
  clonePvdhTemplate,
  createNewPvdhTemplateVersion,
  deletePvdhTemplate,
  executePvdhWorkflowTransition,
  getOrInitStudentPvdhWorkspace,
  getPvdhDocumentOutput,
  handoverConfirmedPvdhToGvcn,
  listGvcnHandoversForActor,
  resolveApplicablePvdhTemplate,
  runBatchPvdhExportJob,
  saveKsdvFileTemplateAndMappings,
  savePvdhRecord,
  setPvdhTemplatePublishStatus,
  switchRecordTemplateWithMapping,
  updatePvdhTemplateVersion,
} from "../service";
import { PvdhActor, sanitizePvdhRecordForViewer } from "../auth-guard";

function makeActor(overrides: Partial<PvdhActor>): PvdhActor {
  return {
    authenticated: true,
    userId: "USR_DEFAULT",
    userName: "Cán bộ mặc định",
    userEmail: "staff@skylineschool.edu.vn",
    role: "TEACHER",
    teacherId: "TCH_DEFAULT",
    teacherPosition: "Giáo viên",
    campusIds: ["CAMPUS_1"],
    campusCodes: ["CS1"],
    isSystemWideAdmin: false,
    canManageConfig: false,
    canCoordinate: false,
    canReviewAndLock: false,
    canReopenLocked: false,
    isParent: false,
    ...overrides,
  };
}

function seedInMemoryTemplatesAndSampleContext() {
  mem.pvdhTemplates.clear();
  mem.pvdhVersions.clear();
  mem.pvdhRecords.clear();
  mem.pvdhReviews.clear();
  mem.pvdhDocs.clear();
  mem.pvdhHandovers.clear();
  mem.pvdhAuditLogs = [];
  mem.ksdvFileTemplates.clear();
  mem.ksdvMappings.clear();
  mem.inputStudents.clear();
  mem.enrolledStudents.clear();
  mem.classes.clear();
  mem.assignments = [];
  mem.signatureProfiles.clear();
  mem.legacyOrientationRecords.clear();
  mem.studentScores.clear();
  mem.storedFiles.clear();

  const now = new Date().toISOString();
  for (const seed of PVDH_SEED_TEMPLATES) {
    const tplId = `pvdhtpl_${seed.code.toLowerCase().replace("-", "_")}`;
    const verId = `${tplId}_v1`;
    mem.pvdhTemplates.set(tplId, {
      id: tplId,
      code: seed.code,
      name: seed.name,
      description: seed.description,
      gradeGroup: seed.gradeGroup,
      gradesJson: JSON.stringify(seed.grades),
      educationSystemsJson: JSON.stringify(["ALL"]),
      campusIdsJson: JSON.stringify(["ALL"]),
      periodIdsJson: JSON.stringify(["ALL"]),
      effectiveFrom: null,
      effectiveTo: null,
      priorityOrder: seed.priorityOrder,
      status: "ACTIVE",
      currentVersionNumber: 1,
      currentVersionCode: "v1.0",
      sourceNote: "Mẫu đề xuất phục vụ triển khai",
      createdAt: now,
      updatedAt: now,
    });
    mem.pvdhVersions.set(verId, {
      id: verId,
      templateId: tplId,
      templateCode: seed.code,
      versionNumber: 1,
      versionCode: "v1.0",
      status: "ACTIVE",
      nameSnapshot: seed.name,
      purposeText: (seed as any).purposeText || seed.description,
      gradesJson: JSON.stringify(seed.grades),
      educationSystemsJson: JSON.stringify(["ALL"]),
      campusIdsJson: JSON.stringify(["ALL"]),
      periodIdsJson: JSON.stringify(["ALL"]),
      effectiveFrom: null,
      effectiveTo: null,
      priorityOrder: seed.priorityOrder,
      sectionsJson: JSON.stringify(seed.sections),
      fieldsJson: JSON.stringify(seed.fields),
      exportLayoutJson: JSON.stringify(seed.exportLayout),
      changeSummary: "Khởi tạo mẫu đề xuất ban đầu",
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

function buildCompleteValidPayload(templateCode: string) {
  const seed = PVDH_SEED_TEMPLATES.find((s) => s.code === templateCode)!;
  const studentResponses: Record<string, any> = {};
  const parentResponses: Record<string, any> = {};

  seed.fields
    .filter((f) => f.sectionCode === "II_STUDENT")
    .forEach((f, idx) => {
      studentResponses[f.fieldKey] =
        idx === 5
          ? {
              responseText: "",
              notRecorded: true,
              notRecordedReason: "Thời lượng trao đổi có hạn, hẹn bổ sung",
            }
          : {
              responseText: `Chia sẻ chi tiết của học sinh cho nhóm ${idx + 1} (${f.label}) với nhiều câu văn tiếng Việt có dấu đầy đủ.`,
              notRecorded: false,
              notRecordedReason: "",
            };
    });

  seed.fields
    .filter((f) => f.sectionCode === "IV_PARENT")
    .forEach((f, idx) => {
      parentResponses[f.fieldKey] = {
        responseText: `Ý kiến trao đổi thực tế của phụ huynh tại mục ${idx + 1} (${f.label}).`,
        notRecorded: false,
        notRecordedReason: "",
      };
    });

  return {
    parentFullName: "Trần Thị Minh Châu",
    parentRelationship: "Mẹ",
    parentContactChannel: "Trực tiếp tại cơ sở / 0905123456",
    interviewDate: "2026-11-16",
    studentInterviewDate: "2026-11-16",
    parentInterviewDate: "2026-11-16",
    studentResponses,
    obsStrengthsInterests: "Tự tin trình bày ý kiến, yêu thích đọc sách khoa học và vẽ tranh.",
    obsCommunicationStyle: "Lễ phép, giao tiếp mắt tốt, biết lắng nghe câu hỏi.",
    obsParticipationLevel: "Hợp tác tích cực trong suốt buổi trò chuyện.",
    obsSupportNeeds: "Cần làm quen nhịp sinh hoạt bán trú trong 2 tuần đầu.",
    parentResponses,
    planStrengthsPriority: "Điểm mạnh ngôn ngữ; ưu tiên đồng hành ổn định nề nếp đầu năm.",
    planGoalsActionsText: "Xây dựng thói quen tự chuẩn bị sách vở và tham gia CLB đọc sách.",
    followUpActions: [
      {
        id: "ACT_1",
        actionContent: "Trao đổi nhanh cuối tuần thứ 2 sau nhập học",
        owner: "GVCN & PHHS",
        dueDate: "2026-12-01",
        progressIndicator: "Học sinh chủ động hòa nhập nhóm bạn trong lớp",
      },
    ],
    planCoordinator: "GVCN khối tiếp nhận & Tổ Tư vấn học đường",
    planReviewDate: "2026-12-05",
    planFurtherTopics: ["THICH_NGHI" as const],
    planFurtherOtherText: "",
    planReferralReason: "Theo dõi thêm nhịp thích nghi giờ nghỉ trưa tại trường mới.",
    planReferralReceiver: "GVCN lớp tiếp nhận",
    planHandoverNotes: "Lưu ý khích lệ em phát biểu trong giờ Tiếng Anh và Toán.",
  };
}

describe("PVDH (Khối 1–12) & Cấu hình File KSDV 3 Lớp — 13 Kịch bản Nghiệm thu", () => {
  const sysAdmin = makeActor({
    userId: "ADMIN_SYS",
    userName: "Quản trị Khảo thí",
    role: "ADMIN",
    isSystemWideAdmin: true,
    canManageConfig: true,
    canCoordinate: true,
    canReviewAndLock: true,
    canReopenLocked: true,
  });

  beforeEach(() => {
    seedInMemoryTemplatesAndSampleContext();
  });

  it("1 & 2. Khối 1..12 mở đúng PVDH-01..05; mỗi mẫu có đủ 6 nhóm HS, 4 trường GV, 5 nhóm PHHS và Mục V", async () => {
    const expectedByGrade: Record<number, string> = {
      1: "PVDH-01",
      2: "PVDH-02",
      3: "PVDH-02",
      4: "PVDH-03",
      5: "PVDH-03",
      6: "PVDH-04",
      7: "PVDH-04",
      8: "PVDH-04",
      9: "PVDH-04",
      10: "PVDH-05",
      11: "PVDH-05",
      12: "PVDH-05",
    };

    for (let g = 1; g <= 12; g++) {
      expect(getDefaultPvdhCodeForGrade(`Khối ${g}`)).toBe(expectedByGrade[g]);
      const resolved = await resolveApplicablePvdhTemplate({ grade: `Khối ${g}` });
      expect(resolved.template.code).toBe(expectedByGrade[g]);
    }

    expect(PVDH_SEED_TEMPLATES).toHaveLength(5);
    for (const tpl of PVDH_SEED_TEMPLATES) {
      expect(tpl.description).not.toContain("đã ban hành");
      expect(tpl.fields.filter((f) => f.sectionCode === "II_STUDENT")).toHaveLength(6);
      expect(tpl.fields.filter((f) => f.sectionCode === "III_TEACHER")).toHaveLength(4);
      expect(tpl.fields.filter((f) => f.sectionCode === "IV_PARENT")).toHaveLength(5);
      expect(tpl.fields.filter((f) => f.sectionCode === "V_ORIENTATION").length).toBeGreaterThanOrEqual(6);
    }

    // Kiểm tra câu chuyển cấp khối 9 của PVDH-04
    const pvdh04 = PVDH_SEED_TEMPLATES.find((t) => t.code === "PVDH-04")!;
    const q5 = pvdh04.fields.find((f) => f.fieldKey === "hs_q5")!;
    expect(JSON.stringify(q5)).toContain("THCS");
  });

  it("3 & 4. Lưu nháp được phép thiếu; hoàn tất báo đúng fieldKey thiếu; KHÔNG sinh điểm môn hoặc tự kết luận tiếp nhận", async () => {
    mem.inputStudents.set("STU_K6", {
      id: "STU_K6",
      studentCode: "HS26K601",
      fullName: "Lê Hoàng Bách",
      grade: "Khối 6",
      surveyFormType: "HNS",
      periodId: "PER_26",
      batchId: "BAT_01",
      admissionCampus: "Cơ sở 1",
      admissionResult: null,
      batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát 2026-2027", campusId: "CAMPUS_1" },
    });

    mem.assignments.push({
      id: "ASG_PDH_K6",
      periodId: "PER_26",
      batchId: "BAT_01",
      userId: "GV_PV_01",
      grade: "Khối 6",
      subject: { id: "SUB_PDH", code: "PDHDV", name: "Phiếu định hướng đầu vào" },
    });

    const gvActor = makeActor({
      userId: "GV_PV_01",
      userName: "Cô Phạm Thu Hà",
      teacherId: "TCH_PV_01",
      campusIds: ["CAMPUS_1"],
    });

    // Lưu nháp thiếu trường vẫn thành công
    const draftWs = await savePvdhRecord({
      actor: gvActor,
      studentId: "STU_K6",
      mode: "DRAFT",
      completionScope: "FULL",
      payload: {
        obsStrengthsInterests: "Ghi nhận bước đầu khi đang phỏng vấn",
      },
    });
    expect(draftWs.record.workflowStatus).toBe("DRAFT");
    expect(draftWs.record.obsStrengthsInterests).toContain("Ghi nhận bước đầu");

    // Hoàn tất khi còn thiếu sẽ báo lỗi kèm danh sách fieldKey thiếu cụ thể
    await expect(
      savePvdhRecord({
        actor: gvActor,
        studentId: "STU_K6",
        mode: "COMPLETE",
        completionScope: "FULL",
        expectedLockVersion: draftWs.record.lockVersion,
        payload: {
          obsStrengthsInterests: "Ghi nhận bước đầu",
        },
      })
    ).rejects.toMatchObject({
      statusCode: 422,
    });

    // Hoàn tất đủ dữ liệu thành công, reload giữ nguyên toàn bộ nội dung
    const validPayload = buildCompleteValidPayload("PVDH-04");
    const completedWs = await savePvdhRecord({
      actor: gvActor,
      studentId: "STU_K6",
      mode: "COMPLETE",
      completionScope: "FULL",
      expectedLockVersion: draftWs.record.lockVersion,
      payload: validPayload,
    });
    expect(completedWs.record.workflowStatus).toBe("COMPLETED");
    expect(completedWs.record.studentResponses.hs_q6.notRecorded).toBe(true);
    expect(completedWs.record.studentResponses.hs_q6.notRecordedReason).toContain("Thời lượng");

    // Kiểm chứng nguyên tắc 4: không phát sinh bản ghi điểm môn học và không tự đổi admissionResult
    expect(mem.studentScores.size).toBe(0);
    expect(mem.inputStudents.get("STU_K6").admissionResult).toBeNull();
    expect(classifyAssessmentContentCategory({ code: "PDHDV", name: "Phiếu định hướng đầu vào" })).toBe(
      "ORIENTATION_INTERVIEW"
    );
  });

  it("5. Phân quyền chặt: GV không được phân công, khác cơ sở, và PHHS bị chặn 403 trên đọc/ghi/PDF/batch", async () => {
    mem.inputStudents.set("STU_SEC", {
      id: "STU_SEC",
      studentCode: "HS26SEC",
      fullName: "Phạm Bảo Ngọc",
      grade: "Khối 2",
      periodId: "PER_26",
      batchId: "BAT_01",
      batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát", campusId: "CAMPUS_1" },
    });

    await savePvdhRecord({
      actor: sysAdmin,
      studentId: "STU_SEC",
      mode: "COMPLETE",
      completionScope: "FULL",
      payload: buildCompleteValidPayload("PVDH-02"),
    });

    const unassignedTeacher = makeActor({
      userId: "GV_STRANGER",
      teacherId: "TCH_STRANGER",
      campusIds: ["CAMPUS_1"],
    });
    await expect(
      getOrInitStudentPvdhWorkspace({ actor: unassignedTeacher, studentId: "STU_SEC" })
    ).rejects.toMatchObject({ statusCode: 403 });

    await expect(
      getPvdhDocumentOutput({ actor: unassignedTeacher, studentId: "STU_SEC", format: "pdf" })
    ).rejects.toMatchObject({ statusCode: 403 });

    const otherCampusReviewer = makeActor({
      userId: "BGH_CS2",
      role: "GDCS",
      canReviewAndLock: true,
      campusIds: ["CAMPUS_2"],
      campusCodes: ["CS2"],
    });
    await expect(
      getOrInitStudentPvdhWorkspace({ actor: otherCampusReviewer, studentId: "STU_SEC" })
    ).rejects.toMatchObject({ statusCode: 403 });

    const parentActor = makeActor({
      userId: "PARENT_01",
      role: "PARENT",
      isParent: true,
    });
    await expect(
      getOrInitStudentPvdhWorkspace({ actor: parentActor, studentId: "STU_SEC" })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      runBatchPvdhExportJob({ actor: parentActor, exportType: "PDF_ZIP", studentIds: ["STU_SEC"] })
    ).rejects.toMatchObject({ statusCode: 403 });

    const sanitized = sanitizePvdhRecordForViewer(
      { id: "rec", internalSensitiveNotes: "Nội dung mật nội bộ" },
      {
        allowedToRead: true,
        canEditStudentPart: false,
        canEditParentPart: false,
        canEditOrientationPart: false,
        canReviewLock: false,
        canReopen: false,
        canHandover: false,
        isGvcnViewer: true,
        canViewSensitiveHealth: true,
        includeSensitiveInHandover: false,
      }
    );
    expect(sanitized?.internalSensitiveNotes).toBeUndefined();
  });

  it("6 & 13. Sáu trạng thái kết quả môn khảo sát tách biệt rõ; ô trống không biến thành 0/Không đạt; tính điểm môn học hiện hữu giữ nguyên", () => {
    expect(resolveSubjectAssessmentStatus({ rawScores: ["", null], passScore: 5 }).status).toBe("NOT_ENTERED");
    expect(resolveSubjectAssessmentStatus({ isApplicable: false, rawScores: [] }).status).toBe("NOT_APPLICABLE");
    expect(resolveSubjectAssessmentStatus({ isExempt: true, rawScores: [] }).status).toBe("EXEMPT");
    expect(resolveSubjectAssessmentStatus({ isAbsentOrNotTaken: true, rawScores: [] }).status).toBe("NOT_TAKEN");
    expect(resolveSubjectAssessmentStatus({ compositeScore: 4.5, passScore: 5.0 }).status).toBe("NOT_PASSED");
    expect(resolveSubjectAssessmentStatus({ compositeScore: 7.5, passScore: 5.0 }).status).toBe("PASSED");

    // Kiểm tra công thức tính điểm môn khảo sát hiện có (Toán / EPT) hoạt động nguyên vẹn
    const eptSum = calculateCompositeScore(
      { col0: 20, col1: 18, col2: 15, col3: 22 },
      {
        formula: "SUM",
        columnCount: 4,
        roundingRule: "ROUND_1",
      }
    );
    expect(Number(eptSum)).toBe(75);
  });

  it("7. Bất biến phiên bản: phát hành v2.0 không làm đổi phiếu đã khóa ở v1.0; mở khóa lại bắt buộc lý do, ghi lịch sử và hủy xác nhận cũ", async () => {
    mem.inputStudents.set("STU_VER", {
      id: "STU_VER",
      studentCode: "HS26VER",
      fullName: "Nguyễn Gia Huy",
      grade: "Khối 1",
      periodId: "PER_26",
      batchId: "BAT_01",
      batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát", campusId: "CAMPUS_1" },
    });

    const saved = await savePvdhRecord({
      actor: sysAdmin,
      studentId: "STU_VER",
      mode: "COMPLETE",
      completionScope: "FULL",
      payload: buildCompleteValidPayload("PVDH-01"),
    });

    // Xác nhận & khóa phiếu ở v1.0
    const locked = await executePvdhWorkflowTransition({
      actor: sysAdmin,
      recordId: saved.record.id,
      action: "VERIFY_LOCK",
      reasonOrNote: "Đã thẩm định đầy đủ thông tin Khối 1",
    });
    expect(locked.record.workflowStatus).toBe("VERIFIED_LOCKED");
    expect(locked.record.templateVersionNumber).toBe(1);

    // Không cho xóa mẫu đang được hồ sơ tham chiếu
    const tpl01Id = "pvdhtpl_pvdh_01";
    await expect(deletePvdhTemplate({ actor: sysAdmin, templateId: tpl01Id })).rejects.toMatchObject({
      statusCode: 409,
    });

    // Không cho sửa trực tiếp cấu trúc (fields) của v1.0 đã khóa phiếu
    await expect(
      updatePvdhTemplateVersion({
        actor: sysAdmin,
        templateId: tpl01Id,
        versionId: `${tpl01Id}_v1`,
        fields: PVDH_SEED_TEMPLATES[0].fields.slice(0, 5),
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "VERSION_IMMUTABLE",
    });

    // Tạo phiên bản mới v2.0, chỉnh nhãn câu 1 và phát hành
    const v2 = await createNewPvdhTemplateVersion({
      actor: sysAdmin,
      templateId: tpl01Id,
      changeSummary: "Cập nhật nhãn câu 1 cho đợt 2",
    });
    const seed01 = PVDH_SEED_TEMPLATES[0];
    const modifiedFields = seed01.fields.map((f) =>
      f.fieldKey === "hs_q1" ? { ...f, label: "1. Tự giới thiệu (Phiên bản v2.0 mới)" } : f
    );
    await updatePvdhTemplateVersion({
      actor: sysAdmin,
      templateId: tpl01Id,
      versionId: v2.id,
      fields: modifiedFields,
    });
    await setPvdhTemplatePublishStatus({
      actor: sysAdmin,
      templateId: tpl01Id,
      versionId: v2.id,
      targetStatus: "ACTIVE",
    });

    // Kiểm chứng phiếu cũ của STU_VER vẫn giữ nguyên v1.0 và nhãn gốc!
    const reloadedLocked = await getOrInitStudentPvdhWorkspace({
      actor: sysAdmin,
      studentId: "STU_VER",
    });
    expect(reloadedLocked.record.templateVersionNumber).toBe(1);
    const q1Old = reloadedLocked.version.fields.find((f: any) => f.fieldKey === "hs_q1");
    expect(q1Old?.label).not.toContain("v2.0");

    // Mở khóa lại không có lý do -> bị chặn
    await expect(
      executePvdhWorkflowTransition({
        actor: sysAdmin,
        recordId: saved.record.id,
        action: "REOPEN",
        reasonOrNote: "ngắn",
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    // Mở khóa lại có lý do hợp lệ -> hủy trạng thái xác nhận cũ & ghi lịch sử
    const reopened = await executePvdhWorkflowTransition({
      actor: sysAdmin,
      recordId: saved.record.id,
      action: "REOPEN",
      reasonOrNote: "Cần bổ sung thêm ý kiến trao đổi của phụ huynh về sức khỏe",
    });
    expect(reopened.record.isLocked).toBe(false);
    expect(reopened.record.confirmedByName).toBeNull();
    expect(reopened.reviewHistory.some((h: any) => h.action === "REOPEN")).toBe(true);
  });

  it("8. Kiểm tra cấu hình 3 lớp: chặn trùng targetRef, thiếu trường nguồn, công thức nguy hiểm, rubric chưa kiểm chứng và trùng phạm vi cùng ưu tiên", async () => {
    const badMappingCheck = validateExportMappings({
      resultType: "SCORE",
      exportFormat: "XLSX",
      mappings: [
        {
          fieldKey: "student_code",
          sourcePath: "student.studentCode",
          targetRef: "INVALID_CELL!!",
          targetFormat: "XLSX",
          dataType: "TEXT",
        },
        {
          fieldKey: "hacked_field",
          sourcePath: "unknown.hackedField",
          targetRef: "B4",
          targetFormat: "XLSX",
          dataType: "TEXT",
        },
      ],
      requiredFieldKeys: ["missing_required_col"],
    });
    expect(badMappingCheck.valid).toBe(false);
    expect(badMappingCheck.errors.length).toBeGreaterThanOrEqual(3);

    expect(validateSafeScoreFormula("process.exit(1)").valid).toBe(false);
    expect(validateSafeScoreFormula("([col0]*2 + [col1]) / 3").valid).toBe(true);

    // Chặn phát hành mẫu Rubric chưa được kiểm chứng tài liệu nguồn (sourceVerified = false)
    const draftRubric = await saveKsdvFileTemplateAndMappings({
      actor: sysAdmin,
      code: "TAVD_RUBRIC_UNVERIFIED",
      name: "Mẫu Tiếng Anh vấn đáp (Chưa đối chiếu rubric gốc)",
      resultType: "RUBRIC",
      subjectCode: "TAvd",
      subjectName: "Tiếng Anh (vấn đáp)",
      grades: ["1", "2"],
      exportFormat: "XLSX",
      sourceVerified: false,
      publishNow: false,
      mappings: [
        {
          fieldKey: "student_code",
          sourcePath: "student.studentCode",
          targetRef: "A2",
          targetFormat: "XLSX",
          dataType: "TEXT",
        },
      ],
    });
    expect(draftRubric.template.status).toBe("DRAFT");

    await expect(
      saveKsdvFileTemplateAndMappings({
        actor: sysAdmin,
        id: draftRubric.template.id,
        code: "TAVD_RUBRIC_UNVERIFIED",
        name: "Mẫu Tiếng Anh vấn đáp",
        resultType: "RUBRIC",
        subjectCode: "TAvd",
        subjectName: "Tiếng Anh (vấn đáp)",
        grades: ["1", "2"],
        exportFormat: "XLSX",
        sourceVerified: false,
        publishNow: true,
        mappings: [],
      })
    ).rejects.toMatchObject({ code: "UNVERIFIED_SOURCE" });

    // Chặn phát hành 2 mẫu PVDH trùng khối + hệ + cơ sở + cùng mức ưu tiên
    const cloned = await clonePvdhTemplate({
      actor: sysAdmin,
      sourceTemplateId: "pvdhtpl_pvdh_01",
      newCode: "PVDH-01-DUP",
      newName: "Mẫu Khối 1 trùng độ ưu tiên",
      priorityOrder: 100,
    });
    const clonedVersions = Array.from(mem.pvdhVersions.values()).filter(
      (v) => v.templateId === cloned.id
    );
    await expect(
      setPvdhTemplatePublishStatus({
        actor: sysAdmin,
        templateId: cloned.id,
        versionId: clonedVersions[0].id,
        targetStatus: "ACTIVE",
      })
    ).rejects.toMatchObject({ code: "SCOPE_CONFLICT" });

    // Mức ưu tiên khác nhau (10 vs 100) cho phép phát hành và giải thích rõ thứ tự ưu tiên
    const diffPrioCheck = detectTemplateScopeConflicts(
      {
        id: "cand",
        code: "PVDH-01-HNG",
        name: "Mẫu Khối 1 HNG",
        grades: ["1"],
        educationSystems: ["HNG"],
        campusIds: ["ALL"],
        periodIds: ["ALL"],
        priorityOrder: 10,
        status: "ACTIVE",
      },
      [
        {
          id: "existing",
          code: "PVDH-01",
          name: "Mẫu Khối 1 chung",
          grades: ["1"],
          educationSystems: ["ALL"],
          campusIds: ["ALL"],
          periodIds: ["ALL"],
          priorityOrder: 100,
          status: "ACTIVE",
        },
      ]
    );
    expect(diffPrioCheck.canPublish).toBe(true);
    expect(JSON.stringify(diffPrioCheck.prioritizedOverlaps[0])).toContain("PVDH-01-HNG");
  });

  it("9. Xuất HTML & PDF cho cả 5 mẫu PVDH-01..05: văn bản dài, checkbox ☑/☐, watermark Bản nháp khi chưa khóa, 3 cột chữ ký và nhãn 'Ký xác nhận bằng ảnh chữ ký'", async () => {
    const sampleGrades = [
      { code: "PVDH-01", grade: "Khối 1" },
      { code: "PVDH-02", grade: "Khối 3" },
      { code: "PVDH-03", grade: "Khối 5" },
      { code: "PVDH-04", grade: "Khối 9" },
      { code: "PVDH-05", grade: "Khối 11" },
    ];

    mem.signatureProfiles.set("TCH_SIGN", {
      id: "SIG_01",
      teacherId: "TCH_SIGN",
      connectionStatus: "CONNECTED",
      visualAppearanceUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    const signerActor = makeActor({
      userId: "ADMIN_SIGN",
      userName: "Cô Nguyễn Minh Phương",
      teacherId: "TCH_SIGN",
      role: "ADMIN",
      isSystemWideAdmin: true,
      canManageConfig: true,
      canCoordinate: true,
      canReviewAndLock: true,
      canReopenLocked: true,
    });

    const createdStudentIds: string[] = [];

    for (let i = 0; i < sampleGrades.length; i++) {
      const item = sampleGrades[i];
      const stId = `STU_PDF_${i + 1}`;
      createdStudentIds.push(stId);
      mem.inputStudents.set(stId, {
        id: stId,
        studentCode: `HS260${i + 1}`,
        fullName: `Học sinh Kiểm thử ${item.code}`,
        grade: item.grade,
        surveyFormType: "HNS",
        periodId: "PER_26",
        batchId: "BAT_01",
        admissionCampus: "Cơ sở 1",
        batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
        period: { id: "PER_26", code: "KS26", name: "Khảo sát 2026", campusId: "CAMPUS_1" },
      });

      const payload = buildCompleteValidPayload(item.code);
      payload.obsStrengthsInterests =
        "Đoạn văn dài nhiều dòng để kiểm thử ngắt trang tự động trên khổ A4: ".repeat(12);

      const ws = await savePvdhRecord({
        actor: signerActor,
        studentId: stId,
        mode: "COMPLETE",
        completionScope: "FULL",
        payload,
      });

      // Khi chưa khóa: HTML có watermark BẢN NHÁP – CHƯA XÁC NHẬN
      const unlockedHtmlDoc = await getPvdhDocumentOutput({
        actor: signerActor,
        studentId: stId,
        format: "html",
      });
      const unlockedHtml = unlockedHtmlDoc.buffer.toString("utf-8");
      expect(unlockedHtml).toContain("BẢN NHÁP");
      expect(unlockedHtml).toContain(item.code);
      expect(unlockedHtml).toContain("☑");
      expect(unlockedHtml).toContain("☐");
      expect(unlockedHtml).toContain("Người phỏng vấn");
      expect(unlockedHtml).toContain("PHHS");
      expect(unlockedHtml).toContain("Học sinh nếu phù hợp");

      // Sau khi xác nhận & khóa kèm ảnh chữ ký: không còn watermark nháp, dùng đúng cụm từ "Ký xác nhận bằng ảnh chữ ký"
      await executePvdhWorkflowTransition({
        actor: signerActor,
        recordId: ws.record.id,
        action: "VERIFY_LOCK",
        useSignatureProfile: true,
      });

      const lockedHtmlDoc = await getPvdhDocumentOutput({
        actor: signerActor,
        studentId: stId,
        format: "html",
      });
      const lockedHtml = lockedHtmlDoc.buffer.toString("utf-8");
      expect(lockedHtml).toContain("Ký xác nhận bằng ảnh chữ ký");
      expect(lockedHtml).not.toContain("Chữ ký số được xác thực");

      const pdfDoc = await getPvdhDocumentOutput({
        actor: signerActor,
        studentId: stId,
        format: "pdf",
      });
      expect(pdfDoc.fileName).not.toContain("0905123456");
      expect(pdfDoc.buffer.subarray(0, 8).toString("ascii")).toContain("%PDF-1.");
    }

    // Kiểm tra xuất ZIP hàng loạt & Xuất Excel tổng hợp (chống công thức độc hại Formula Injection)
    const zipExport = await runBatchPvdhExportJob({
      actor: signerActor,
      exportType: "PDF_ZIP",
      studentIds: createdStudentIds,
    });
    const zipLoaded = await JSZip.loadAsync(zipExport.buffer);
    expect(Object.keys(zipLoaded.files).length).toBeGreaterThanOrEqual(5);

    const excelExport = await runBatchPvdhExportJob({
      actor: signerActor,
      exportType: "EXCEL_SUMMARY",
      studentIds: createdStudentIds,
    });
    const wb = XLSX.read(excelExport.buffer, { type: "buffer" });
    expect(wb.SheetNames.length).toBeGreaterThanOrEqual(1);
    expect(sanitizeSpreadsheetCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
  });

  it("10. Mục V: 'Không' và lựa chọn cần tìm hiểu thêm loại trừ nhau; bắt buộc lý do/người nhận khi có tìm hiểu thêm; chỉ bắt buộc mốc trao đổi lại khi có hành động tiếp nối", () => {
    const seed03 = PVDH_SEED_TEMPLATES.find((t) => t.code === "PVDH-03")!;
    const base = buildCompleteValidPayload("PVDH-03");

    // Không có hành động tiếp nối và chọn "KHONG" tìm hiểu thêm -> KHÔNG yêu cầu planReviewDate, lý do hay đầu mối nhận
    const noFollowUpCheck = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: seed03.fields,
      input: {
        ...base,
        followUpActions: [],
        planCoordinator: "",
        planFurtherTopics: ["KHONG"],
        planReferralReason: "",
        planReferralReceiver: "",
        planReviewDate: "",
      },
    });
    expect(noFollowUpCheck.valid).toBe(true);

    // Chọn cần tìm hiểu thêm ("HOC_TAP") nhưng để trống lý do & đầu mối tiếp nhận -> Bị chặn
    const missingInquiryMetaCheck = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: seed03.fields,
      input: {
        ...base,
        planFurtherTopics: ["HOC_TAP" as const],
        planReferralReason: "",
        planReferralReceiver: "",
        planReviewDate: "",
      },
    });
    expect(missingInquiryMetaCheck.valid).toBe(false);
    expect(missingInquiryMetaCheck.issues.map((i) => i.fieldKey)).toEqual(
      expect.arrayContaining([
        "plan_referral_reason",
        "plan_referral_receiver",
        "plan_review_date",
      ])
    );

    // Chọn đồng thời "KHONG" và "TIENG_ANH" -> bị chặn loại trừ
    const conflictTopicCheck = validatePvdhRecordData({
      mode: "DRAFT",
      scope: "FULL",
      fields: seed03.fields,
      input: {
        ...base,
        planFurtherTopics: ["KHONG" as const, "TIENG_ANH" as const],
      },
    });
    expect(conflictTopicCheck.valid).toBe(false);

    const mappedText = formatFollowUpActionsToText(base.followUpActions);
    expect(mappedText).toContain("Trao đổi nhanh cuối tuần thứ 2");
    expect(mappedText).toContain("GVCN & PHHS");
  });

  it("11. Đổi khối cảnh báo & chuyển mẫu có kiểm soát; chống ghi đè đồng thời (409); phân công tách HS/PHHS; bàn giao & GVCN xác nhận đã đọc", async () => {
    mem.inputStudents.set("STU_E2E", {
      id: "STU_E2E",
      studentCode: "HS26E2E",
      enrollmentCode: "HS26E2E",
      enrollmentClassId: "CLS_6A1",
      fullName: "Đặng Minh Khôi",
      grade: "Khối 5",
      periodId: "PER_26",
      batchId: "BAT_01",
      batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát", campusId: "CAMPUS_1" },
    });

    mem.classes.set("CLS_6A1", {
      id: "CLS_6A1",
      classCode: "6A1",
      className: "6A1",
      homeroomTeacherId: "TCH_GVCN_6A1",
      campusId: "CAMPUS_1",
      teachers: [{ teacherId: "TCH_GVCN_6A1", roleInClass: "GVCN" }],
    });

    const gvStudent = makeActor({
      userId: "USR_GV_HS",
      userName: "Cô Lan (Phỏng vấn HS)",
      teacherId: "TCH_GV_HS",
    });
    const gvParent = makeActor({
      userId: "USR_GV_PH",
      userName: "Thầy Minh (Trao đổi PHHS)",
      teacherId: "TCH_GV_PH",
    });

    // Điều phối phân công tách riêng người phỏng vấn HS và người trao đổi PHHS
    const initWs = await savePvdhRecord({
      actor: sysAdmin,
      studentId: "STU_E2E",
      mode: "DRAFT",
      completionScope: "FULL",
      payload: {
        studentInterviewerUserId: "USR_GV_HS",
        studentInterviewerName: "Cô Lan (Phỏng vấn HS)",
        parentInterviewerUserId: "USR_GV_PH",
        parentInterviewerName: "Thầy Minh (Trao đổi PHHS)",
      },
    });

    // Cô Lan hoàn tất riêng phần Học sinh (STUDENT_PART)
    const validPvdh03 = buildCompleteValidPayload("PVDH-03");
    const afterHs = await savePvdhRecord({
      actor: gvStudent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "STUDENT_PART",
      expectedLockVersion: initWs.record.lockVersion,
      payload: {
        interviewDate: validPvdh03.interviewDate,
        studentInterviewDate: validPvdh03.studentInterviewDate,
        studentResponses: validPvdh03.studentResponses,
        obsStrengthsInterests: validPvdh03.obsStrengthsInterests,
        obsCommunicationStyle: validPvdh03.obsCommunicationStyle,
        obsParticipationLevel: validPvdh03.obsParticipationLevel,
        obsSupportNeeds: validPvdh03.obsSupportNeeds,
      },
    });
    expect(afterHs.record.workflowStatus).toBe("PARTIAL_COMPLETED");
    expect(afterHs.record.studentSectionStatus).toBe("COMPLETED");
    expect(afterHs.record.parentSectionStatus).toBe("DRAFT");

    // Kiểm tra Optimistic Concurrency: dùng lockVersion cũ bị chặn 409
    await expect(
      savePvdhRecord({
        actor: gvParent,
        studentId: "STU_E2E",
        mode: "DRAFT",
        completionScope: "PARENT_PART",
        expectedLockVersion: initWs.record.lockVersion,
        payload: { parentFullName: "Mẹ bé Khôi" },
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "CONCURRENCY_CONFLICT" });

    // Thầy Minh hoàn tất phần PHHS + Định hướng với đúng lockVersion mới
    const afterParent = await savePvdhRecord({
      actor: gvParent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "PARENT_PART",
      expectedLockVersion: afterHs.record.lockVersion,
      payload: {
        parentInterviewDate: validPvdh03.parentInterviewDate,
        parentFullName: validPvdh03.parentFullName,
        parentRelationship: validPvdh03.parentRelationship,
        parentContactChannel: validPvdh03.parentContactChannel,
        parentResponses: validPvdh03.parentResponses,
      },
    });
    const afterFull = await savePvdhRecord({
      actor: gvParent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "ORIENTATION_PART",
      expectedLockVersion: afterParent.record.lockVersion,
      payload: {
        planStrengthsPriority: validPvdh03.planStrengthsPriority,
        planGoalsActionsText: validPvdh03.planGoalsActionsText,
        followUpActions: validPvdh03.followUpActions,
        planCoordinator: validPvdh03.planCoordinator,
        planReviewDate: validPvdh03.planReviewDate,
        planFurtherTopics: validPvdh03.planFurtherTopics,
        planReferralReason: validPvdh03.planReferralReason,
        planReferralReceiver: validPvdh03.planReferralReceiver,
        planHandoverNotes: validPvdh03.planHandoverNotes,
      },
    });
    expect(afterFull.record.workflowStatus).toBe("COMPLETED");

    // Đổi khối dự kiến của hồ sơ từ Khối 5 -> Khối 6: workspace báo cảnh báo lệch mẫu PVDH-03 vs PVDH-04
    mem.inputStudents.get("STU_E2E").grade = "Khối 6";
    const mismatchCheck = await getOrInitStudentPvdhWorkspace({
      actor: sysAdmin,
      studentId: "STU_E2E",
    });
    expect(mismatchCheck.gradeChangeWarning).toBeTruthy();

    // Chuyển mẫu có kiểm soát sang PVDH-04, bảo toàn câu trả lời cùng fieldKey
    const switched = await switchRecordTemplateWithMapping({
      actor: sysAdmin,
      recordId: afterFull.record.id,
      reason: "Cập nhật hồ sơ dự tuyển lên Khối 6 THCS",
    });
    expect(switched.record.templateCode).toBe("PVDH-04");
    expect(switched.record.studentResponses.hs_q1.responseText).toContain("Chia sẻ chi tiết");

    // Xác nhận & khóa phiếu mới trước khi bàn giao cho GVCN
    const switchedCompleted = await savePvdhRecord({
      actor: sysAdmin,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "FULL",
      expectedLockVersion: switched.record.lockVersion,
      payload: buildCompleteValidPayload("PVDH-04"),
    });
    await executePvdhWorkflowTransition({
      actor: sysAdmin,
      recordId: switchedCompleted.record.id,
      action: "VERIFY_LOCK",
    });

    // Bàn giao phiếu định hướng đã xác nhận cho GVCN lớp 6A1 và GVCN xác nhận đã tiếp nhận
    const handover = await handoverConfirmedPvdhToGvcn({
      actor: sysAdmin,
      recordId: switchedCompleted.record.id,
      targetClassId: "CLS_6A1",
      handoverNote: "Bàn giao thông tin định hướng đầu năm cho GVCN 6A1",
    });
    expect(handover.receiveStatus).toBe("PENDING_RECEIPT");

    const gvcnActor = makeActor({
      userId: "USR_GVCN_6A1",
      userName: "Cô Mai (GVCN 6A1)",
      teacherId: "TCH_GVCN_6A1",
      campusIds: ["CAMPUS_1"],
    });
    const inbox = await listGvcnHandoversForActor(gvcnActor);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].studentCode).toBe("HS26E2E");

    const ack = await acknowledgePvdhHandoverByGvcn({
      actor: gvcnActor,
      handoverId: handover.id,
      gvcnFeedbackNote: "GVCN 6A1 đã đọc kỹ và lên kế hoạch đồng hành cùng học sinh.",
    });
    expect(ack.receiveStatus).toBe("ACKNOWLEDGED");

    // GVCN lớp khác không thấy bàn giao của lớp 6A1
    const otherGvcn = makeActor({
      userId: "USR_GVCN_OTHER",
      teacherId: "TCH_GVCN_OTHER",
      campusIds: ["CAMPUS_1"],
    });
    const emptyInbox = await listGvcnHandoversForActor(otherGvcn);
    expect(emptyInbox).toHaveLength(0);
  });
});
