import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  PVDH_SEED_TEMPLATES,
  buildFieldsForTemplate,
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

const sentEmailsLog: any[] = [];

vi.mock("@/lib/mail", () => ({
  sendEmail: vi.fn(async (opts: any) => {
    sentEmailsLog.push(opts);
    return { success: true, messageId: `mock_msg_${sentEmailsLog.length}` };
  }),
}));

vi.mock("@/lib/orientation/service", () => ({
  getAssignedPsychologyTeachers: vi.fn(async () => [
    {
      userId: "USR_PSYCH_1",
      fullName: "Cô Nguyễn Tâm Lý",
      email: "tamly.cs1@skylineschool.edu.vn",
      isBatchAssigned: true,
      subjectName: "Tâm lý",
    },
  ]),
  getDepartmentTeachers: vi.fn(async () => []),
  getStudentOrientationRecord: vi.fn(async () => null),
  upsertStudentOrientationRecord: vi.fn(async () => ({})),
  getCampusGiaovuEmail: vi.fn((cs?: string) =>
    String(cs || "").toUpperCase().includes("CS2")
      ? "giaovu.cs2@skylineschool.edu.vn"
      : "giaovu.cs1@skylineschool.edu.vn"
  ),
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
  requestPvdhPsychInterview,
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

  const slugifyCode = (raw: string) =>
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const now = new Date().toISOString();
  for (const seed of PVDH_SEED_TEMPLATES) {
    const tplId = `pvdhtpl_${slugifyCode(seed.code)}`;
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
  const isBm = seed.exportLayout.layoutVariant === "BM_KTDBCL_ABCD";
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
              responseText: `Chia sẻ chi tiết của học sinh cho mục ${idx + 1} (${f.label}) với nhiều câu văn tiếng Việt có dấu đầy đủ.`,
              notRecorded: false,
              notRecordedReason: "",
            };
    });

  seed.fields
    .filter((f) => f.sectionCode === "IV_PARENT" || f.sectionCode === "C_PARENT_GRADE")
    .forEach((f, idx) => {
      parentResponses[f.fieldKey] = {
        responseText: `Ý kiến trao đổi thực tế của phụ huynh tại mục ${idx + 1} (${f.label}).`,
        notRecorded: false,
        notRecordedReason: "",
      };
    });

  if (isBm) {
    return {
      parentFullName: "Trần Thị Minh Châu",
      parentRelationship: "Mẹ",
      interviewDate: "2026-11-17",
      studentInterviewDate: "2026-11-17",
      parentInterviewDate: "2026-11-17",
      studentResponses,
      parentResponses,
      teacherSummary: {
        d01: "Con tự tin giao tiếp, hào hứng với các hoạt động vẽ tranh và kể chuyện.",
        d02: "Cần theo dõi thêm nếp ngủ trưa và làm quen bạn mới trong 2 tuần đầu.",
        d03: "Gia đình và học sinh cùng mong muốn môi trường thân thiện, chú trọng tiếng Anh và kỹ năng tự lập.",
        d04: "GVCN phối hợp trao đổi định kỳ cùng phụ huynh sau 2 tuần nhập học.",
        sheetStatus: "HOAN_THANH" as const,
        psychInterviewRequested: false,
      },
      obsStrengthsInterests: "",
      followUpActions: [],
      planFurtherTopics: [] as any[],
    };
  }

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

  it("1 & 2. Trọn bộ Khối 1..12 mở đúng BM.KTĐBCL.31..42 bám sát 100% cấu trúc A, B, C, D", async () => {
    for (let g = 1; g <= 12; g++) {
      const expectedCode = `BM.KTĐBCL.${30 + g}`;
      expect(getDefaultPvdhCodeForGrade(`Khối ${g}`)).toBe(expectedCode);
      const resolved = await resolveApplicablePvdhTemplate({ grade: `Khối ${g}` });
      expect(resolved.template.code).toBe(expectedCode);
    }

    expect(PVDH_SEED_TEMPLATES).toHaveLength(12);

    // Kiểm tra toàn bộ 12 mẫu BM.KTĐBCL.31 .. BM.KTĐBCL.42 (Khối 1 .. Khối 12): chỉ gồm đúng Thông tin chung (7 trường), A01..A06, B01..B05, C01..C05, D01..D04 + trạng thái + tâm lí
    for (let g = 1; g <= 12; g++) {
      const bmCode = `BM.KTĐBCL.${30 + g}`;
      const bmTpl = PVDH_SEED_TEMPLATES.find((t) => t.code === bmCode)!;
      expect(bmTpl).toBeTruthy();
      expect(bmTpl.exportLayout.layoutVariant).toBe("BM_KTDBCL_ABCD");
      expect(bmTpl.exportLayout.formCodeBox).toBe(bmCode);
      expect(bmTpl.exportLayout.headerSubtitle).toBe(`(Dành cho khối ${g})`);
      expect(bmTpl.fields.filter((f) => f.sectionCode === "I_GENERAL")).toHaveLength(7);
      const aFields = bmTpl.fields.filter((f) => f.sectionCode === "II_STUDENT");
      expect(aFields.map((f) => f.fieldKey)).toEqual(["a01", "a02", "a03", "a04", "a05", "a06"]);
      // Đảm bảo A01..A06 không có promptQuestion rỗng thừa
      aFields.forEach((f) => expect(f.promptQuestion).toBeUndefined());
      expect(bmTpl.fields.filter((f) => f.sectionCode === "IV_PARENT").map((f) => f.fieldKey)).toEqual([
        "b01",
        "b02",
        "b03",
        "b04",
        "b05",
      ]);
      expect(bmTpl.fields.filter((f) => f.sectionCode === "C_PARENT_GRADE").map((f) => f.fieldKey)).toEqual([
        "c01",
        "c02",
        "c03",
        "c04",
        "c05",
      ]);
      expect(bmTpl.fields.filter((f) => f.sectionCode === "D_TEACHER_SUMMARY").map((f) => f.fieldKey)).toEqual([
        "d01",
        "d02",
        "d03",
        "d04",
        "sheet_status",
        "psych_interview_requested",
      ]);
      // Tuyệt đối không chứa trường ngoài biểu mẫu gốc
      expect(bmTpl.fields.filter((f) => f.sectionCode === "III_TEACHER")).toHaveLength(0);
      expect(bmTpl.fields.filter((f) => f.sectionCode === "V_ORIENTATION")).toHaveLength(0);
    }
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
    const validPayload = buildCompleteValidPayload("BM.KTĐBCL.36");
    const completedWs = await savePvdhRecord({
      actor: gvActor,
      studentId: "STU_K6",
      mode: "COMPLETE",
      completionScope: "FULL",
      expectedLockVersion: draftWs.record.lockVersion,
      payload: validPayload,
    });
    expect(completedWs.record.workflowStatus).toBe("COMPLETED");
    expect(completedWs.record.studentResponses.a06.notRecorded).toBe(true);
    expect(completedWs.record.studentResponses.a06.notRecordedReason).toContain("Thời lượng");

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
      payload: buildCompleteValidPayload("BM.KTĐBCL.32"),
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
      payload: buildCompleteValidPayload("BM.KTĐBCL.31"),
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
    const tpl01Id = "pvdhtpl_bm_ktdbcl_31";
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

    // Tạo phiên bản mới v2.0, chỉnh nhãn câu A01 và phát hành
    const v2 = await createNewPvdhTemplateVersion({
      actor: sysAdmin,
      templateId: tpl01Id,
      changeSummary: "Cập nhật nhãn câu A01 cho đợt 2",
    });
    const seed01 = PVDH_SEED_TEMPLATES[0];
    const modifiedFields = seed01.fields.map((f) =>
      f.fieldKey === "a01" ? { ...f, label: "A01. Hoạt động yêu thích (Phiên bản v2.0 mới)" } : f
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
    const q1Old = reloadedLocked.version.fields.find((f: any) => f.fieldKey === "a01");
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
      sourceTemplateId: "pvdhtpl_bm_ktdbcl_31",
      newCode: "PVDH-K1-DUP",
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

  it("9. Xuất HTML & PDF cho trọn bộ 12 mẫu (BM.KTĐBCL.31..42): bám sát 100% bố cục chuẩn của từng khối", async () => {
    const sampleGrades = Array.from({ length: 12 }, (_, idx) => ({
      code: `BM.KTĐBCL.${31 + idx}`,
      grade: `Khối ${idx + 1}`,
      isBm: true,
    }));

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
        period: {
          id: "PER_26",
          code: "KS26",
          name: "Khảo sát 2026-2027",
          campusId: "CAMPUS_1",
          academicYear: { name: "2026 - 2027" },
        },
      });

      const payload = buildCompleteValidPayload(item.code);
      if (!item.isBm) {
        payload.obsStrengthsInterests =
          "Đoạn văn dài nhiều dòng để kiểm thử ngắt trang tự động trên khổ A4: ".repeat(12);
      }

      const ws = await savePvdhRecord({
        actor: signerActor,
        studentId: stId,
        mode: "COMPLETE",
        completionScope: "FULL",
        payload,
      });

      const unlockedHtmlDoc = await getPvdhDocumentOutput({
        actor: signerActor,
        studentId: stId,
        format: "html",
      });
      const unlockedHtml = unlockedHtmlDoc.buffer.toString("utf-8");
      expect(unlockedHtml).toContain(item.code);
      expect(unlockedHtml).toContain("☑");
      expect(unlockedHtml).toContain("☐");

      if (item.isBm) {
        // Kiểm chứng BM.KTĐBCL.31 / BM.KTĐBCL.32: chỉ hiển thị đúng các mục chuẩn, KHÔNG chèn nội dung ngoài biểu mẫu
        expect(unlockedHtml).toContain("Đơn vị sở hữu: Ban Khảo thí &amp; Đảm bảo chất lượng");
        expect(unlockedHtml).toContain("A. PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH");
        expect(unlockedHtml).toContain("B. TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH");
        expect(unlockedHtml).toContain("D. TỔNG HỢP VÀ ĐỊNH HƯỚNG CỦA GIÁO VIÊN");
        expect(unlockedHtml).toContain("Trạng thái phiếu:");
        expect(unlockedHtml).toContain("Đề nghị phỏng vấn (tâm lí)");
        expect(unlockedHtml).toContain("Giáo viên thực hiện");
        expect(unlockedHtml).toContain("SSM Sky-Line | Phiếu lưu hành nội bộ");
        expect(unlockedHtml).not.toContain("Trường/lớp đang học");
        expect(unlockedHtml).not.toContain("Học sinh nếu phù hợp");
        expect(unlockedHtml).not.toContain("Nội dung bàn giao cho GVCN");
      } else {
        expect(unlockedHtml).toContain("BẢN NHÁP");
        expect(unlockedHtml).toContain("Người phỏng vấn");
        expect(unlockedHtml).toContain("PHHS");
        expect(unlockedHtml).toContain("Học sinh nếu phù hợp");
      }

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
      if (!item.isBm) {
        expect(lockedHtml).toContain("Ký xác nhận bằng ảnh chữ ký");
        expect(lockedHtml).not.toContain("Chữ ký số được xác thực");
      }

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

  it("10. Kiểm tra validation Mục D (BM.KTĐBCL.31..42) và tương thích ngược Mục V (bản tùy chỉnh I–V)", () => {
    const bm39 = PVDH_SEED_TEMPLATES.find((t) => t.code === "BM.KTĐBCL.39")!;
    const validBm39 = buildCompleteValidPayload("BM.KTĐBCL.39");
    const bmValidCheck = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: bm39.fields,
      input: validBm39,
    });
    expect(bmValidCheck.valid).toBe(true);

    const bmMissingStatus = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: bm39.fields,
      input: {
        ...validBm39,
        teacherSummary: {
          ...validBm39.teacherSummary!,
          sheetStatus: "" as any,
        },
      },
    });
    expect(bmMissingStatus.valid).toBe(false);
    expect(bmMissingStatus.issues.map((i) => i.fieldKey)).toContain("sheet_status");

    // Kiểm tra tương thích ngược cho phiên bản tùy chỉnh I–V
    const customFields = buildFieldsForTemplate({
      studentQuestions: [{ num: 1, label: "Q1", prompt: "P1" }],
      parentQuestions: [{ num: 1, label: "PQ1", prompt: "PP1" }],
    });
    const customBase = {
      parentFullName: "Trần Thị Minh Châu",
      parentRelationship: "Mẹ",
      interviewDate: "2026-11-18",
      studentResponses: { hs_q1: { responseText: "Trả lời 1", notRecorded: false, notRecordedReason: "" } },
      parentResponses: { ph_q1: { responseText: "Phụ huynh 1", notRecorded: false, notRecordedReason: "" } },
      obsStrengthsInterests: "Điểm mạnh",
      obsCommunicationStyle: "Giao tiếp tốt",
      obsParticipationLevel: "Hợp tác",
      obsSupportNeeds: "Ổn định",
      planStrengthsPriority: "Ưu tiên",
      planGoalsActionsText: "Mục tiêu",
      followUpActions: [
        {
          id: "ACT_1",
          actionContent: "Trao đổi nhanh cuối tuần thứ 2 sau nhập học",
          owner: "GVCN & PHHS",
          dueDate: "2026-12-01",
          progressIndicator: "Học sinh chủ động hòa nhập",
        },
      ],
      planCoordinator: "GVCN",
      planReviewDate: "2026-12-05",
      planFurtherTopics: ["THICH_NGHI" as const],
      planFurtherOtherText: "",
      planReferralReason: "Theo dõi nhịp thích nghi",
      planReferralReceiver: "GVCN",
      planHandoverNotes: "Lưu ý đầu năm",
    };

    const noFollowUpCheck = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: customFields,
      input: {
        ...customBase,
        followUpActions: [],
        planCoordinator: "",
        planFurtherTopics: ["KHONG"],
        planReferralReason: "",
        planReferralReceiver: "",
        planReviewDate: "",
      },
    });
    expect(noFollowUpCheck.valid).toBe(true);

    const missingInquiryMetaCheck = validatePvdhRecordData({
      mode: "COMPLETE",
      scope: "FULL",
      fields: customFields,
      input: {
        ...customBase,
        planFurtherTopics: ["HOC_TAP" as const],
        planReferralReason: "",
        planReferralReceiver: "",
        planReviewDate: "",
      },
    });
    expect(missingInquiryMetaCheck.valid).toBe(false);

    const conflictTopicCheck = validatePvdhRecordData({
      mode: "DRAFT",
      scope: "FULL",
      fields: customFields,
      input: {
        ...customBase,
        planFurtherTopics: ["KHONG" as const, "TIENG_ANH" as const],
      },
    });
    expect(conflictTopicCheck.valid).toBe(false);

    const mappedText = formatFollowUpActionsToText(customBase.followUpActions);
    expect(mappedText).toContain("Trao đổi nhanh cuối tuần thứ 2");
    expect(mappedText).toContain("GVCN & PHHS");
  });

  it("11. Đổi khối cảnh báo & chuyển mẫu có kiểm soát (BM.KTĐBCL.37 -> BM.KTĐBCL.40); chống ghi đè đồng thời (409); phân công tách HS/PHHS; bàn giao & GVCN xác nhận đã đọc", async () => {
    mem.inputStudents.set("STU_E2E", {
      id: "STU_E2E",
      studentCode: "HS26E2E",
      enrollmentCode: "HS26E2E",
      enrollmentClassId: "CLS_6A1",
      fullName: "Đặng Minh Khôi",
      grade: "Khối 7",
      periodId: "PER_26",
      batchId: "BAT_01",
      batch: { id: "BAT_01", name: "Đợt 1", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát", campusId: "CAMPUS_1" },
    });

    mem.classes.set("CLS_6A1", {
      id: "CLS_6A1",
      classCode: "10A1",
      className: "10A1",
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
    expect(initWs.record.templateCode).toBe("BM.KTĐBCL.37");

    // Cô Lan hoàn tất riêng phần Học sinh (STUDENT_PART: A01..A06)
    const validBm37 = buildCompleteValidPayload("BM.KTĐBCL.37");
    const afterHs = await savePvdhRecord({
      actor: gvStudent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "STUDENT_PART",
      expectedLockVersion: initWs.record.lockVersion,
      payload: {
        interviewDate: validBm37.interviewDate,
        studentInterviewDate: validBm37.studentInterviewDate,
        parentFullName: validBm37.parentFullName,
        parentRelationship: validBm37.parentRelationship,
        studentResponses: validBm37.studentResponses,
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

    // Thầy Minh hoàn tất phần PHHS (B01..B05 & C01..C05) + Mục D với đúng lockVersion mới
    const afterParent = await savePvdhRecord({
      actor: gvParent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "PARENT_PART",
      expectedLockVersion: afterHs.record.lockVersion,
      payload: {
        parentInterviewDate: validBm37.parentInterviewDate,
        parentFullName: validBm37.parentFullName,
        parentRelationship: validBm37.parentRelationship,
        parentResponses: validBm37.parentResponses,
      },
    });
    const afterFull = await savePvdhRecord({
      actor: gvParent,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "ORIENTATION_PART",
      expectedLockVersion: afterParent.record.lockVersion,
      payload: {
        teacherSummary: validBm37.teacherSummary,
      },
    });
    expect(afterFull.record.workflowStatus).toBe("COMPLETED");

    // Đổi khối dự kiến của hồ sơ từ Khối 7 -> Khối 10: workspace báo cảnh báo lệch mẫu BM.KTĐBCL.37 vs BM.KTĐBCL.40
    mem.inputStudents.get("STU_E2E").grade = "Khối 10";
    const mismatchCheck = await getOrInitStudentPvdhWorkspace({
      actor: sysAdmin,
      studentId: "STU_E2E",
    });
    expect(mismatchCheck.gradeChangeWarning).toBeTruthy();

    // Chuyển mẫu có kiểm soát sang BM.KTĐBCL.40, bảo toàn câu trả lời cùng fieldKey (a01..a06, b01..b05, c01..c05)
    const switched = await switchRecordTemplateWithMapping({
      actor: sysAdmin,
      recordId: afterFull.record.id,
      reason: "Cập nhật hồ sơ dự tuyển lên Khối 10 THPT",
    });
    expect(switched.record.templateCode).toBe("BM.KTĐBCL.40");
    expect(switched.record.studentResponses.a01.responseText).toContain("Chia sẻ chi tiết");

    // Xác nhận & khóa phiếu mới trước khi bàn giao cho GVCN
    const switchedCompleted = await savePvdhRecord({
      actor: sysAdmin,
      studentId: "STU_E2E",
      mode: "COMPLETE",
      completionScope: "FULL",
      expectedLockVersion: switched.record.lockVersion,
      payload: buildCompleteValidPayload("BM.KTĐBCL.40"),
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

  it("13. Cấu hình môn Tiếng Anh (viết & vấn đáp) chuẩn hóa thang điểm 10 và Phiếu định hướng Khối 4 bám sát PVDH-03", async () => {
    const { resolvePresetDataForSubject, SUBJECT_PRESETS } = await import(
      "@/app/admin/cau-hinh-file-diem-ksdv/presets"
    );
    const { getOrientationGradeGroupConfig } = await import("@/lib/orientation/criteria-config");

    // 1. Tiếng Anh viết & vấn đáp ở mọi khối đều mặc định thang 10
    for (const g of ["Khối 1", "Khối 4", "Khối 7", "Khối 10"]) {
      const tavPreset = resolvePresetDataForSubject("TAv", g);
      expect(tavPreset).toBeTruthy();
      const sumMax = (tavPreset.columnMaxScores as number[]).reduce((a, b) => a + b, 0);
      expect(sumMax).toBe(10);
      expect(tavPreset.passScore).toBe(5.0);

      const tavdPreset = resolvePresetDataForSubject("TAvd", g);
      expect(tavdPreset).toBeTruthy();
      expect(tavdPreset.columnMaxScores).toEqual([10, 10, 10]);
      expect(tavdPreset.formulaType).toBe("AVERAGE");
      expect(tavdPreset.passScore).toBe(5.0);
    }

    expect(SUBJECT_PRESETS.ESL_VD.passScore).toBe(5.0);

    // 2. Cấu hình toàn bộ Khối 1 .. Khối 12 trong criteria-config.ts đồng bộ 100% với BM.KTĐBCL.31 .. BM.KTĐBCL.42
    for (let g = 1; g <= 12; g++) {
      const bmCode = `BM.KTĐBCL.${30 + g}`;
      const gConfig = getOrientationGradeGroupConfig(`Khối ${g}`);
      expect(gConfig.label).toContain(bmCode);
      expect(gConfig.criteria.map((c) => c.code)).toEqual(["a01", "a02", "a03", "a04", "a05", "a06"]);
      expect(gConfig.parentGroups.map((p) => p.code)).toEqual([
        "b01",
        "b02",
        "b03",
        "b04",
        "b05",
        "c01",
        "c02",
        "c03",
        "c04",
        "c05",
      ]);
    }
  });

  it("14. Bấm nút Đề nghị phỏng vấn tâm lý tự động gửi Email cho Giáo vụ phụ trách cơ sở và GV tâm lý phân công", async () => {
    sentEmailsLog.length = 0;
    mem.inputStudents.set("STU_K5", {
      id: "STU_K5",
      studentCode: "HS701020238",
      fullName: "Lê Trần Gia Phúc",
      grade: "5",
      surveyFormType: "HNS",
      periodId: "PER_26",
      batchId: "BAT_01",
      registeredCampus: "CS1",
      admissionCampus: "Cơ sở 1",
      batch: { id: "BAT_01", name: "Chuyển hệ", campusId: "CAMPUS_1", campus: { id: "CAMPUS_1", campusCode: "CS1", campusName: "Sky-Line Riverside (CS1)" } },
      period: { id: "PER_26", code: "KS26", name: "Chuyển hệ", campusId: "CAMPUS_1" },
    });
    const teacherActor = makeActor({
      userId: "USR_GV_1",
      userName: "Thầy Hoàng Trọng Đài",
      userEmail: "daiht@skylineschool.edu.vn",
      canReviewAndLock: true,
      isSystemWideAdmin: true,
    });

    const res = await requestPvdhPsychInterview({
      actor: teacherActor,
      studentId: "STU_K5",
      referralNote: "Học sinh cần trao đổi thêm về thích nghi cảm xúc khi chuyển trường",
      payload: {
        interviewDate: "2026-11-18",
        teacherSummary: {
          d01: "Ngoan, lễ phép",
          d02: "Hơi lo lắng khi làm bài kiểm tra dài",
          d03: "Gia đình mong con tự tin hơn",
          d04: "Phối hợp GVCN và bộ phận Tâm lý học đường",
          sheetStatus: "CAN_TRAO_DOI_CHUYEN_MON",
          psychInterviewRequested: true,
        },
      },
      baseUrl: "https://ssm.skylineschool.edu.vn",
    });

    expect((res as any).emailDispatch?.sent).toBe(true);
    expect(sentEmailsLog.length).toBe(1);
    const recipients = Array.isArray(sentEmailsLog[0].to) ? sentEmailsLog[0].to : [sentEmailsLog[0].to];
    expect(recipients).toContain("tamly.cs1@skylineschool.edu.vn");
    expect(recipients).toContain("giaovu.cs1@skylineschool.edu.vn");
    expect(res.record.teacherSummary.psychInterviewRequested).toBe(true);
    expect(res.record.teacherSummary.psychEmailSentAt).toBeTruthy();
  });

  it("15. GVBM được phân công vẫn hiệu chỉnh đầy đủ Mục A/B/C/D kể cả khi KT&ĐBCL đã mở xem hoặc lưu trước phiếu", async () => {
    mem.inputStudents.set("STU_K7_GVBM", {
      id: "STU_K7_GVBM",
      studentCode: "HS701020246",
      fullName: "Lê Văn Anh Khoa",
      grade: "Khối 7",
      surveyFormType: "HNS",
      periodId: "PER_26",
      batchId: "BAT_01",
      registeredCampus: "CS1",
      batch: { id: "BAT_01", name: "Khảo sát lẻ", campusId: "CAMPUS_1" },
      period: { id: "PER_26", code: "KS26", name: "Khảo sát lẻ", campusId: "CAMPUS_1" },
    });

    mem.assignments.push({
      id: "ASG_PVDH_K7",
      periodId: "PER_26",
      batchId: "BAT_01",
      userId: "USR_GVBM_K7",
      grade: "Khối 7",
      subject: { id: "SUB_PVDH", code: "PDHDV", name: "Phỏng vấn định hướng" },
    });

    const ktdbclActor = makeActor({
      userId: "USR_KTDBCL",
      userName: "KT&ĐBCL",
      role: "KTDBCL",
      isSystemWideAdmin: true,
      canReviewAndLock: true,
      canCoordinate: true,
    });

    const gvbmActor = makeActor({
      userId: "USR_GVBM_K7",
      userName: "Cô Nguyễn Thị Hoa",
      role: "TEACHER",
      teacherId: "TCH_GVBM_K7",
      isSystemWideAdmin: false,
      canReviewAndLock: false,
      canCoordinate: false,
    });

    // 1. KT&ĐBCL mở xem trước phiếu -> không tự gắn cứng studentInterviewerUserId
    const adminWs = await getOrInitStudentPvdhWorkspace({
      actor: ktdbclActor,
      studentId: "STU_K7_GVBM",
    });
    expect(adminWs.record.studentInterviewerUserId).toBeNull();

    // 2. Giả lập bản ghi cũ trong DB đã lỡ bị gắn studentInterviewerUserId = KT&ĐBCL (hiện trạng production)
    const rawRec = mem.pvdhRecords.get(adminWs.record.id);
    rawRec.studentInterviewerUserId = "USR_KTDBCL";
    rawRec.studentInterviewerName = "KT&ĐBCL";

    // 3. GVBM được phân công mở phiếu -> vẫn phải có quyền sửa cả phần HS (Mục A) & PHHS (Mục B, C, D)
    const gvWs = await getOrInitStudentPvdhWorkspace({
      actor: gvbmActor,
      studentId: "STU_K7_GVBM",
    });
    expect(gvWs.accessRights.allowedToRead).toBe(true);
    expect(gvWs.accessRights.canEditStudentPart).toBe(true);
    expect(gvWs.accessRights.canEditParentPart).toBe(true);
    expect(gvWs.accessRights.canEditOrientationPart).toBe(true);

    // 4. GVBM hoàn tất toàn bộ Mục A/B/C/D -> lưu thành công và cập nhật tên GV thực hiện
    const validBm37 = buildCompleteValidPayload("BM.KTĐBCL.37");
    const saved = await savePvdhRecord({
      actor: gvbmActor,
      studentId: "STU_K7_GVBM",
      mode: "COMPLETE",
      completionScope: "FULL",
      expectedLockVersion: gvWs.record.lockVersion,
      payload: validBm37,
    });
    expect(saved.record.workflowStatus).toBe("COMPLETED");
    expect(saved.record.studentSectionStatus).toBe("COMPLETED");
    expect(saved.record.parentSectionStatus).toBe("COMPLETED");
    expect(saved.record.studentInterviewerUserId).toBe("USR_GVBM_K7");
    expect(saved.record.studentInterviewerName).toBe("Cô Nguyễn Thị Hoa");
  });
});
