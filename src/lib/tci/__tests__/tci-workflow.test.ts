import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TCI_SUBJECT_CODE,
  TCI_SUBJECT_NAME,
  TCI_ASSESSMENT_TYPE,
  TCI_SUBJECT_DISPLAY_LABEL,
  TCI_TOTAL_CRITERIA,
  TCI_DEFAULT_TEMPLATE_CODE,
  TCI_DEFAULT_TEMPLATE_NAME,
  DEFAULT_TCI_CRITERIA_16,
  DEFAULT_TCI_FOOTER_CONFIG,
  DEFAULT_TCI_EXPORT_CONFIG,
  formatIndicatorCodesLabel,
  validateTciCompletion,
} from "../constants";
import { buildTciAssessmentHtml, generateTciPdfBuffer } from "../pdf-service";
import { evaluateStudent8Stages } from "../../entrance-progress/entranceProgressEngine";

// In-memory store for mocking getTciDb() and prisma without touching any real database (GEMINI.md Rule 1)
const mem = {
  templates: new Map<string, any>(),
  records: new Map<string, any>(),
  evidences: new Map<string, any>(),
  auditLogs: [] as any[],
  students: new Map<string, any>(),
  assignments: [] as any[],
  signatureProfiles: new Map<string, any>(),
  studentScores: new Map<string, any>(),
  storedPdfs: new Map<string, Buffer>(),
};

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
    if (item[k] !== v) return false;
  }
  return true;
}

let globalMockSeq = 1;
function makeDelegate(mapGetter: () => Map<string, any>, prefix: string) {
  return {
    findMany: async (args?: { where?: any; orderBy?: any; take?: number }) => {
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
      const id = args.data.id || `${prefix}_${globalMockSeq++}`;
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
    delete: async function (args: { where: Record<string, any> }) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) mapGetter().delete(existing.id);
      return existing;
    },
  };
}

vi.mock("@/lib/db", () => ({
  prisma: {
    inputAssessmentStudent: {
      findUnique: vi.fn(async ({ where }: any) => mem.students.get(where.id) || null),
    },
    assessmentSubject: {
      findUnique: vi.fn(async () => ({
        id: "SUBJ_TCI",
        code: TCI_SUBJECT_CODE,
        name: TCI_SUBJECT_NAME,
        subjectType: TCI_ASSESSMENT_TYPE,
        scoreColumns: 16,
        commentColumns: 4,
      })),
    },
    inputAssessmentTeacherAssignment: {
      findMany: vi.fn(async ({ where }: any) => {
        return mem.assignments.filter((a) => !where?.subjectId || a.subjectId === where.subjectId);
      }),
    },
    studentAssessmentScore: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = `${where.studentId_subjectId.studentId}_${where.studentId_subjectId.subjectId}`;
        const prev = mem.studentScores.get(key);
        const next = prev ? { ...prev, ...update } : { id: `SCORE_${key}`, ...create };
        mem.studentScores.set(key, next);
        return next;
      }),
    },
    teacherSignatureProfile: {
      findUnique: vi.fn(async ({ where }: any) => {
        return mem.signatureProfiles.get(where.teacherId) || null;
      }),
    },
    digitalSignatureConfig: {
      findUnique: vi.fn(async () => null),
    },
    entranceStageConfirmation: {
      upsert: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("../schema-init", () => ({
  ensureTciSchema: vi.fn(async () => {}),
  getTciDb: vi.fn(() => ({
    tciTemplate: makeDelegate(() => mem.templates, "tcitpl"),
    tciAssessmentRecord: makeDelegate(() => mem.records, "tcirec"),
    tciProductEvidence: makeDelegate(() => mem.evidences, "tciev"),
    tciAuditLog: {
      create: async ({ data }: any) => {
        const row = { id: `aud_${mem.auditLogs.length + 1}`, ...data, createdAt: new Date().toISOString() };
        mem.auditLogs.unshift(row);
        return row;
      },
      findMany: async ({ where }: any) => {
        return mem.auditLogs.filter((l) => !where?.studentId || l.studentId === where.studentId);
      },
    },
  })),
}));

vi.mock("../pdf-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pdf-service")>();
  return {
    ...actual,
    saveImmutableSignedTciPdf: vi.fn(async ({ recordId, resultVersion, fileName, pdfBuffer }: any) => {
      const storageKey = `tci-signed/${recordId}/v${resultVersion}/${fileName}`;
      mem.storedPdfs.set(storageKey, pdfBuffer);
      return { storageKey, filePath: storageKey };
    }),
    readImmutableSignedTciPdf: vi.fn(async (storageKey: string) => {
      return mem.storedPdfs.get(storageKey) || null;
    }),
  };
});

import {
  saveTciTemplateDraft,
  cloneTciTemplateVersion,
  getOrInitStudentTciRecord,
  saveTciAssessmentDraft,
  uploadTciProductEvidence,
  rotateTciProductEvidence,
  signAndCompleteTciAssessment,
  reviewTciAssessmentRecord,
  reopenSignedTciAssessment,
  getStudentTciDocumentOutput,
} from "../service";

function resetMemStore() {
  mem.templates.clear();
  mem.records.clear();
  mem.evidences.clear();
  mem.auditLogs = [];
  mem.students.clear();
  mem.assignments = [];
  mem.signatureProfiles.clear();
  mem.studentScores.clear();
  mem.storedPdfs.clear();

  const now = new Date().toISOString();
  mem.templates.set("tcitpl_default_v1", {
    id: "tcitpl_default_v1",
    code: TCI_DEFAULT_TEMPLATE_CODE,
    name: TCI_DEFAULT_TEMPLATE_NAME,
    subjectId: "SUBJ_TCI",
    subjectCode: TCI_SUBJECT_CODE,
    subjectName: TCI_SUBJECT_NAME,
    academicYearId: "ALL",
    periodId: "ALL",
    educationSystemId: "ALL",
    grade: "Khối 1",
    versionNumber: 1,
    versionCode: "v1.0",
    status: "ACTIVE",
    criteriaJson: JSON.stringify(DEFAULT_TCI_CRITERIA_16),
    footerConfigJson: JSON.stringify(DEFAULT_TCI_FOOTER_CONFIG),
    exportConfigJson: JSON.stringify(DEFAULT_TCI_EXPORT_CONFIG),
    createdByName: "Hệ thống Sky-Line",
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  mem.students.set("STU_001", {
    id: "STU_001",
    studentCode: "HS26001",
    fullName: "Nguyễn Minh An",
    dob: new Date("2020-05-15T00:00:00.000Z"),
    gender: "Nữ",
    grade: "Khối 1",
    periodId: "PERIOD_26",
    batchId: "BATCH_01",
    batch: {
      id: "BATCH_01",
      name: "Đợt 1",
      periodId: "PERIOD_26",
      campusId: "CAMPUS_1",
      period: { id: "PERIOD_26", name: "Kỳ KSĐV 2026-2027" },
      campus: { id: "CAMPUS_1", name: "Cơ sở 1" },
    },
    scores: [],
  });
}

describe("Môn TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi (End-to-End Workflow)", () => {
  beforeEach(() => {
    resetMemStore();
  });

  it("1 & 2. Khởi tạo đúng môn TCI, tách biệt mã và tên (không bị 'tuổiTCI'), phân biệt STT và Mã chỉ số", () => {
    expect(TCI_SUBJECT_CODE).toBe("TCI");
    expect(TCI_SUBJECT_NAME).toBe("Bộ chuẩn phát triển trẻ em 5–6 tuổi");
    expect(TCI_ASSESSMENT_TYPE).toBe("Đánh giá theo tiêu chí");
    expect(TCI_SUBJECT_DISPLAY_LABEL).toBe("TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi");
    expect(TCI_SUBJECT_NAME).not.toContain("tuổiTCI");

    // 16 criteria total, even though STT 11 has 2 indicator codes (42, 43)
    expect(TCI_TOTAL_CRITERIA).toBe(16);
    expect(DEFAULT_TCI_CRITERIA_16).toHaveLength(16);

    const expectedMapping: Array<{ stt: number; codes: string[]; content: string }> = [
      { stt: 1, codes: ["65"], content: "Có thói quen chào hỏi, cảm ơn, xin phép và xưng hô lễ phép với người lớn." },
      { stt: 2, codes: ["74"], content: "Tập trung chú ý thực hiện nhiệm vụ và hoạt động." },
      { stt: 3, codes: ["16"], content: "Nhận biết về tên gọi, đặc điểm bên ngoài, giới tính, sở thích, điểm mạnh, điểm yếu của bản thân." },
      { stt: 4, codes: ["14"], content: "Nhận ra tình huống nguy hiểm và biết cách xử lý phù hợp." },
      { stt: 5, codes: ["33"], content: "Sử dụng lời nói, hành vi lịch sự trong giao tiếp." },
      { stt: 6, codes: ["31"], content: "Nghe và phản hồi thông tin đơn giản." },
      { stt: 7, codes: ["48"], content: "Gọi tên các ngày trong tuần theo thứ tự." },
      { stt: 8, codes: ["47"], content: "Xác định được vị trí (trong, ngoài, trên, dưới, sau, phải, trái) của một vật so với một vật khác." },
      { stt: 9, codes: ["51"], content: "Phân loại một số sự vật thành nhóm theo đặc điểm chung và gọi tên nhóm." },
      { stt: 10, codes: ["45"], content: "Xác định một số hình phẳng và hình khối đơn giản trong cuộc sống xung quanh." },
      { stt: 11, codes: ["42", "43"], content: "Tách, gộp số lượng trong phạm vi 10; so sánh, thêm bớt số lượng trong phạm vi 10." },
      { stt: 12, codes: ["38"], content: "Nhận biết và gọi tên chữ cái trong bảng chữ cái Tiếng Việt." },
      { stt: 13, codes: ["41"], content: "Bắt chước hành vi “viết”." },
      { stt: 14, codes: ["9"], content: "Thực hiện các việc tự phục vụ không cần sự giúp đỡ." },
      { stt: 15, codes: ["60"], content: "Thể hiện ý tưởng, cảm xúc của bản thân thông qua hát, vận động theo nhạc." },
      { stt: 16, codes: ["61"], content: "Tô màu kín, không chờm ra ngoài đường viền các hình có chi tiết nhỏ." },
    ];

    expectedMapping.forEach((exp, idx) => {
      const c = DEFAULT_TCI_CRITERIA_16[idx];
      expect(c.stt).toBe(exp.stt);
      expect(c.indicatorCodes).toEqual(exp.codes);
      expect(c.content).toBe(exp.content);
      expect(c.criterionId).toBe(`TCI_C${String(exp.stt).padStart(2, "0")}`);
    });

    // STT 11 has 2 indicator codes (42, 43) formatted properly
    expect(formatIndicatorCodesLabel(DEFAULT_TCI_CRITERIA_16[10].indicatorCodes)).toBe("Chỉ số 42, 43");

    // STT 13 has writing sample box ("Giáo viên viết mẫu / Thí sinh viết theo")
    const c13 = DEFAULT_TCI_CRITERIA_16[12];
    expect(c13.stt).toBe(13);
    expect(c13.supplementaryType).toBe("WRITING_SAMPLE_BOX");
    expect(c13.allowProductImage).toBe(true);

    // STT 16 has coloring sample and product image section under "Sản phẩm"
    const c16 = DEFAULT_TCI_CRITERIA_16[15];
    expect(c16.stt).toBe(16);
    expect(c16.indicatorCodes).toEqual(["61"]);
    expect(c16.supplementaryType).toBe("COLORING_SAMPLE_AND_PRODUCT");
    expect(c16.sampleImageUrl).toContain("data:image/svg+xml");
    expect(c16.allowProductImage).toBe(true);
  });

  it("3. Quản lý phiên bản mẫu: Chặn sửa trực tiếp mẫu đã phát sinh kết quả và cho phép sao chép phiên bản mới", async () => {
    mem.assignments.push({
      id: "ASG_01",
      periodId: "PERIOD_26",
      batchId: "BATCH_01",
      userId: "USER_GV_01",
      subjectId: "SUBJ_TCI",
      grade: "Khối 1",
      educationSystem: "ALL",
      user: { id: "USER_GV_01", fullName: "Cô Nguyễn Thị Hoa" },
    });

    // Initialize student assessment record referencing tcitpl_default_v1
    await getOrInitStudentTciRecord({
      studentId: "STU_001",
      actor: { userId: "USER_GV_01", teacherId: "USER_GV_01", userName: "Cô Nguyễn Thị Hoa", role: "TEACHER" },
    });

    // Modifying criterion content on a template that already has assessment records must be blocked
    const modifiedCriteria = DEFAULT_TCI_CRITERIA_16.map((c, idx) =>
      idx === 0 ? { ...c, content: "Nội dung bị sửa trực tiếp" } : c
    );

    await expect(
      saveTciTemplateDraft({
        id: "tcitpl_default_v1",
        name: TCI_DEFAULT_TEMPLATE_NAME,
        criteria: modifiedCriteria,
        actor: { userId: "ADMIN_01", userName: "Quản trị viên", role: "ADMIN" },
      })
    ).rejects.toThrow(/đã phát sinh/);

    // Cloning creates v2.0 in DRAFT status without mutating existing student records
    const cloned = await cloneTciTemplateVersion({
      sourceTemplateId: "tcitpl_default_v1",
      actor: { userId: "ADMIN_01", userName: "Quản trị viên", role: "ADMIN" },
    });
    expect(cloned.versionCode).toBe("v2.0");
    expect(cloned.versionNumber).toBe(2);
    expect(cloned.status).toBe("DRAFT");
    expect(cloned.isImmutable).toBe(false);
  });

  it("4 & 5. Lưu nháp khi chưa đủ 16 tiêu chí, bảo toàn 'Chưa đánh giá' (không tự đổi thành Không làm/Không đạt) và chặn GV không được phân công", async () => {
    mem.assignments.push({
      id: "ASG_01",
      periodId: "PERIOD_26",
      batchId: "BATCH_01",
      userId: "USER_GV_01",
      subjectId: "SUBJ_TCI",
      grade: "Khối 1",
      educationSystem: "ALL",
      user: { id: "USER_GV_01", fullName: "Cô Nguyễn Thị Hoa" },
    });

    const initBundle = await getOrInitStudentTciRecord({
      studentId: "STU_001",
      actor: { userId: "USER_GV_01", teacherId: "USER_GV_01", userName: "Cô Nguyễn Thị Hoa", role: "TEACHER" },
    });

    // Newly initialized record has 0 evaluated, 16 Chưa đánh giá (no pre-selected defaults)
    expect(initBundle.record.countEvaluated).toBe(0);
    expect(initBundle.record.countChuaDanhGia).toBe(16);
    expect(initBundle.record.evaluationStatus).toBe("NOT_STARTED");

    // Save draft with 4 criteria evaluated (2 Đạt, 1 Không đạt, 1 Không làm)
    const draftBundle = await saveTciAssessmentDraft({
      studentId: "STU_001",
      criteriaResults: {
        TCI_C01: { status: "DAT", note: "Chào hỏi lễ phép" },
        TCI_C02: { status: "KHONG_DAT", note: "Còn phân tâm" },
        TCI_C11: { status: "DAT", note: "Tách gộp trong phạm vi 10 tốt" },
        TCI_C16: { status: "KHONG_LAM", note: "Bé mỏi tay xin nghỉ" },
      },
      highlightsComment: "Giao tiếp tự tin",
      supportNeededComment: "Rèn thêm sự tập trung",
      teacherRecommendation: "Khuyến khích đọc truyện cùng con",
      actor: { userId: "USER_GV_01", teacherId: "USER_GV_01", userName: "Cô Nguyễn Thị Hoa", role: "TEACHER" },
    });

    expect(draftBundle.record.evaluationStatus).toBe("IN_PROGRESS");
    expect(draftBundle.record.countDat).toBe(2);
    expect(draftBundle.record.countKhongDat).toBe(1);
    expect(draftBundle.record.countKhongLam).toBe(1);
    expect(draftBundle.record.countEvaluated).toBe(4);
    expect(draftBundle.record.countChuaDanhGia).toBe(12);
    expect(
      draftBundle.record.countDat +
        draftBundle.record.countKhongDat +
        draftBundle.record.countKhongLam +
        draftBundle.record.countChuaDanhGia
    ).toBe(16);

    // Unassigned teacher GV_99 must be blocked from accessing or editing STU_001
    await expect(
      saveTciAssessmentDraft({
        studentId: "STU_001",
        criteriaResults: {},
        actor: { userId: "USER_GV_99", teacherId: "USER_GV_99", userName: "GV Không Phân Công", role: "TEACHER" },
      })
    ).rejects.toThrow(/không được phân công/);
  });

  it("6 & 7. Ảnh sản phẩm Câu 16 (tải lên, kiểm tra magic bytes, xoay ảnh) và chặn ký khi thiếu tiêu chí hoặc thiếu chữ ký số", async () => {
    mem.assignments.push({
      id: "ASG_01",
      periodId: "PERIOD_26",
      batchId: "BATCH_01",
      userId: "USER_GV_01",
      subjectId: "SUBJ_TCI",
      grade: "Khối 1",
      educationSystem: "ALL",
      user: { id: "USER_GV_01", fullName: "Cô Nguyễn Thị Hoa" },
    });

    const teacherActor = {
      userId: "USER_GV_01",
      teacherId: "TEACHER_01",
      userName: "Cô Nguyễn Thị Hoa",
      role: "TEACHER",
    };

    // Attempting to sign when 0/16 criteria are evaluated must fail
    await expect(
      signAndCompleteTciAssessment({
        studentId: "STU_001",
        actor: teacherActor,
      })
    ).rejects.toThrow(/16\/16 tiêu chí chưa đánh giá/);

    // Upload a valid PNG product image for Question 16
    const pngBase64 = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]).toString("base64");

    const uploaded = await uploadTciProductEvidence({
      studentId: "STU_001",
      criterionId: "TCI_C16",
      fileName: "bai-to-mau-hs26001.png",
      mimeType: "image/png",
      imageDataBase64: `data:image/png;base64,${pngBase64}`,
      rotationDeg: 0,
      actor: teacherActor,
    });

    expect(uploaded.criterionStt).toBe(16);
    expect(uploaded.criterionId).toBe("TCI_C16");
    expect(uploaded.rotationDeg).toBe(0);

    // Rotate image to 90 degrees
    const rotated = await rotateTciProductEvidence({
      evidenceId: uploaded.id,
      rotationDeg: 90,
      actor: teacherActor,
    });
    expect(rotated.rotationDeg).toBe(90);

    // Fill all 16 criteria
    const fullResults: Record<string, any> = {};
    DEFAULT_TCI_CRITERIA_16.forEach((c, idx) => {
      fullResults[c.criterionId] = {
        status: idx === 1 ? "KHONG_DAT" : idx === 5 ? "KHONG_LAM" : "DAT",
        note: idx === 15 ? "Tô màu đều, không chờm viền" : "",
      };
    });

    await saveTciAssessmentDraft({
      studentId: "STU_001",
      criteriaResults: fullResults,
      generalComment: "Trẻ phát triển tốt theo độ tuổi",
      highlightsComment: "Ngôn ngữ và vận động tinh tốt",
      supportNeededComment: "Cần rèn thêm tập trung chú ý (Chỉ số 74)",
      teacherRecommendation: "Đủ điều kiện vào Lớp 1",
      actor: teacherActor,
    });

    // Attempting to sign when teacher has NO signature in /teacher/chu-ky-so must fail but preserve draft
    await expect(
      signAndCompleteTciAssessment({
        studentId: "STU_001",
        actor: teacherActor,
      })
    ).rejects.toThrow(/Chữ ký số của tôi/);

    // Verify draft is still intact after failed sign attempt
    const afterFailedSign = await getOrInitStudentTciRecord({
      studentId: "STU_001",
      actor: teacherActor,
    });
    expect(afterFailedSign.record.countEvaluated).toBe(16);
    expect(afterFailedSign.record.highlightsComment).toBe("Ngôn ngữ và vận động tinh tốt");
  });

  it("8, 9 & 10. Ký hoàn thành phiếu, khóa dữ liệu, xuất PDF/HTML chuẩn A4 và bảo toàn người ký khi đổi phân công", async () => {
    mem.assignments.push({
      id: "ASG_01",
      periodId: "PERIOD_26",
      batchId: "BATCH_01",
      userId: "USER_GV_01",
      subjectId: "SUBJ_TCI",
      grade: "Khối 1",
      educationSystem: "ALL",
      user: { id: "USER_GV_01", fullName: "Cô Nguyễn Thị Hoa" },
    });

    const teacherActor = {
      userId: "USER_GV_01",
      teacherId: "TEACHER_01",
      userName: "Cô Nguyễn Thị Hoa",
      role: "TEACHER",
    };

    // Configure teacher's active signature in /teacher/chu-ky-so
    const pngBase64 = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]).toString("base64");
    mem.signatureProfiles.set("TEACHER_01", {
      id: "SIG_PROF_01",
      teacherId: "TEACHER_01",
      provider: "NOT_CONFIGURED",
      connectionStatus: "CONNECTED",
      visualAppearanceUrl: `data:image/png;base64,${pngBase64}`,
      signatureRoleText: "Giáo viên khảo sát",
      teacher: { id: "TEACHER_01", teacherName: "Cô Nguyễn Thị Hoa" },
    });

    const fullResults: Record<string, any> = {};
    DEFAULT_TCI_CRITERIA_16.forEach((c, idx) => {
      fullResults[c.criterionId] = {
        status: idx === 3 ? "KHONG_DAT" : idx === 7 ? "KHONG_LAM" : "DAT",
        note: `Ghi chú câu ${c.stt}`,
      };
    });

    const signResult = await signAndCompleteTciAssessment({
      studentId: "STU_001",
      criteriaResults: fullResults,
      highlightsComment: "Mạnh dạn, lễ phép",
      supportNeededComment: "Kỹ năng xử lý tình huống nguy hiểm",
      teacherRecommendation: "Phối hợp rèn luyện thêm kỹ năng an toàn",
      actor: teacherActor,
    });

    expect(signResult.alreadySigned).toBe(false);
    expect(signResult.bundle.record.evaluationStatus).toBe("COMPLETED");
    expect(signResult.bundle.record.signatureStatus).toBe("SIGNED");
    expect(signResult.bundle.record.signatureType).toBe("TEACHER_SIGNATURE_IMAGE");
    expect(signResult.bundle.record.signerName).toBe("Cô Nguyễn Thị Hoa");
    expect(signResult.bundle.record.signedSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(signResult.bundle.record.signedPdfFileName).toBe("TCI_HS26001_PERIOD_26_v1.pdf");

    // Idempotent check: calling sign again returns alreadySigned: true without duplicating
    const secondSign = await signAndCompleteTciAssessment({
      studentId: "STU_001",
      actor: teacherActor,
    });
    expect(secondSign.alreadySigned).toBe(true);

    // Editing draft after signing must be blocked
    await expect(
      saveTciAssessmentDraft({
        studentId: "STU_001",
        criteriaResults: fullResults,
        actor: teacherActor,
      })
    ).rejects.toThrow(/đã được ký xác nhận và khóa dữ liệu/);

    // Reassign student to a new teacher USER_GV_02: original assessor and signer (Cô Nguyễn Thị Hoa) must be preserved!
    mem.assignments = [
      {
        id: "ASG_02",
        periodId: "PERIOD_26",
        batchId: "BATCH_01",
        userId: "USER_GV_02",
        subjectId: "SUBJ_TCI",
        grade: "Khối 1",
        educationSystem: "ALL",
        user: { id: "USER_GV_02", fullName: "Thầy Trần Văn Nam" },
      },
    ];

    const afterReassign = await getOrInitStudentTciRecord({
      studentId: "STU_001",
      actor: { userId: "USER_GV_02", teacherId: "TEACHER_02", userName: "Thầy Trần Văn Nam", role: "TEACHER" },
    });
    expect(afterReassign.record.assignedTeacherName).toBe("Thầy Trần Văn Nam");
    expect(afterReassign.record.assessorName).toBe("Cô Nguyễn Thị Hoa");
    expect(afterReassign.record.signerName).toBe("Cô Nguyễn Thị Hoa");

    // Verify PDF & HTML output contain all 16 criteria, Question 13 writing box, Question 16 section, and valid PDF header
    const htmlDoc = await getStudentTciDocumentOutput({
      studentId: "STU_001",
      format: "html",
      actor: { userId: "ADMIN_01", userName: "Ban Giám Hiệu", role: "ADMIN" },
    });
    const htmlStr = htmlDoc.buffer.toString("utf-8");
    expect(htmlStr).toContain("BỘ CHUẨN PHÁT TRIỂN TRẺ EM 5–6 TUỔI");
    expect(htmlStr).toContain("Giáo viên viết mẫu");
    expect(htmlStr).toContain("Thí sinh viết theo");
    expect(htmlStr).toContain("42, 43");
    expect(htmlStr).toContain("Cô Nguyễn Thị Hoa");

    const pdfDoc = await getStudentTciDocumentOutput({
      studentId: "STU_001",
      format: "pdf",
      actor: { userId: "ADMIN_01", userName: "Ban Giám Hiệu", role: "ADMIN" },
    });
    expect(pdfDoc.isSigned).toBe(true);
    expect(pdfDoc.buffer.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(pdfDoc.buffer.length).toBeGreaterThan(1500);
  });

  it("11 & 12. Xét duyệt kết quả (hiển thị đủ 3 nhóm Đạt / Không đạt / Không làm) và Mở khóa đánh giá lại tạo phiên bản kết quả v2", async () => {
    mem.assignments.push({
      id: "ASG_01",
      periodId: "PERIOD_26",
      batchId: "BATCH_01",
      userId: "USER_GV_01",
      subjectId: "SUBJ_TCI",
      grade: "Khối 1",
      educationSystem: "ALL",
      user: { id: "USER_GV_01", fullName: "Cô Nguyễn Thị Hoa" },
    });

    const teacherActor = {
      userId: "USER_GV_01",
      teacherId: "TEACHER_01",
      userName: "Cô Nguyễn Thị Hoa",
      role: "TEACHER",
    };
    const adminActor = {
      userId: "ADMIN_01",
      userName: "Ban Giám Hiệu",
      role: "ADMIN",
    };

    const pngBase64 = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]).toString("base64");
    mem.signatureProfiles.set("TEACHER_01", {
      id: "SIG_PROF_01",
      teacherId: "TEACHER_01",
      provider: "VNPT_SMARTCA",
      serialNumber: "SN-2026-998877",
      connectionStatus: "CONNECTED",
      visualAppearanceUrl: `data:image/png;base64,${pngBase64}`,
      teacher: { id: "TEACHER_01", teacherName: "Cô Nguyễn Thị Hoa" },
    });

    await getOrInitStudentTciRecord({
      studentId: "STU_001",
      actor: teacherActor,
    });

    // Approving an unsigned draft must be blocked
    await expect(
      reviewTciAssessmentRecord({
        studentId: "STU_001",
        decision: "APPROVED",
        reviewNote: "Duyệt nháp",
        actor: adminActor,
      })
    ).rejects.toThrow(/Nháp hoặc Chưa được giáo viên ký/);

    // Complete and sign v1 (with CERTIFICATE_CA signature type)
    const fullResults: Record<string, any> = {};
    DEFAULT_TCI_CRITERIA_16.forEach((c, idx) => {
      fullResults[c.criterionId] = {
        status: idx === 1 ? "KHONG_DAT" : idx === 2 ? "KHONG_LAM" : "DAT",
        note: `Nhận xét câu ${c.stt}`,
      };
    });

    const signedV1 = await signAndCompleteTciAssessment({
      studentId: "STU_001",
      criteriaResults: fullResults,
      actor: teacherActor,
    });

    expect(signedV1.bundle.record.signatureType).toBe("CERTIFICATE_CA");

    // Verify 3-group breakdown has all 3 groups: A. Đạt (14), B. Không đạt (1), C. Không làm (1)
    const grouped = signedV1.bundle.record.groupedCriteria;
    expect(grouped.datList).toHaveLength(14);
    expect(grouped.khongDatList).toHaveLength(1);
    expect(grouped.khongLamList).toHaveLength(1);
    expect(grouped.chuaDanhGiaList).toHaveLength(0);
    expect(grouped.datList[0].config.stt).toBe(1);
    expect(grouped.khongDatList[0].config.stt).toBe(2);
    expect(grouped.khongLamList[0].config.stt).toBe(3);

    // Approve signed v1
    const approvedV1 = await reviewTciAssessmentRecord({
      studentId: "STU_001",
      decision: "APPROVED",
      reviewNote: "Đồng ý kết quả khảo sát TCI v1",
      actor: adminActor,
    });
    expect(approvedV1.record.reviewStatus).toBe("APPROVED");

    // Reopen without valid reason must be blocked
    await expect(
      reopenSignedTciAssessment({
        studentId: "STU_001",
        reason: "abc",
        actor: adminActor,
      })
    ).rejects.toThrow(/tối thiểu 5 ký tự/);

    // Authorized reopen with valid reason creates resultVersion = 2 (REOPENED / PENDING_RESIGN) and preserves v1 in history
    const reopenedV2 = await reopenSignedTciAssessment({
      studentId: "STU_001",
      reason: "Cập nhật bổ sung ảnh sản phẩm Câu 16 rõ nét hơn",
      actor: adminActor,
    });

    expect(reopenedV2.record.resultVersion).toBe(2);
    expect(reopenedV2.record.isLatestVersion).toBe(true);
    expect(reopenedV2.record.evaluationStatus).toBe("REOPENED");
    expect(reopenedV2.record.signatureStatus).toBe("PENDING_RESIGN");
    expect(reopenedV2.record.reviewStatus).toBe("REOPENED");
    expect(reopenedV2.record.previousRecordId).toBe(signedV1.bundle.record.id);

    // Old v1 is preserved in versionHistory with its signed PDF and SIGNED status
    expect(reopenedV2.versionHistory).toHaveLength(2);
    const archivedV1 = reopenedV2.versionHistory.find((h) => h.resultVersion === 1);
    expect(archivedV1).toBeDefined();
    expect(archivedV1?.signatureStatus).toBe("SIGNED");
    expect(archivedV1?.signedPdfFileName).toBe("TCI_HS26001_PERIOD_26_v1.pdf");
  });

  it("13. Quy tắc ảnh sản phẩm bắt buộc/ngoại lệ Không làm và liên thông tiến độ Giai đoạn 4 (chỉ hoàn thành khi Đã ký)", () => {
    const criteriaWithRequiredQ16 = DEFAULT_TCI_CRITERIA_16.map((c) =>
      c.stt === 16 ? { ...c, isProductImageRequired: true } : c
    );

    const resultsDatWithoutImage: Record<string, any> = {};
    criteriaWithRequiredQ16.forEach((c) => {
      resultsDatWithoutImage[c.criterionId] = { status: "DAT", note: "" };
    });

    // When Q16 is DAT and requireEvidence = true, missing product image blocks completion
    const valMissingImg = validateTciCompletion({
      criteriaResults: resultsDatWithoutImage,
      criteriaConfig: criteriaWithRequiredQ16,
      footerConfig: DEFAULT_TCI_FOOTER_CONFIG,
      evidences: [],
    });
    expect(valMissingImg.valid).toBe(false);
    expect(valMissingImg.missingEvidenceStts).toContain(16);

    // When Q16 is KHONG_LAM, product image is NOT required even if requireEvidence = true
    const resultsKhongLam: Record<string, any> = {
      ...resultsDatWithoutImage,
      TCI_C16: { status: "KHONG_LAM", note: "Học sinh không thực hiện câu 16" },
    };
    const valKhongLam = validateTciCompletion({
      criteriaResults: resultsKhongLam,
      criteriaConfig: criteriaWithRequiredQ16,
      footerConfig: DEFAULT_TCI_FOOTER_CONFIG,
      evidences: [],
    });
    expect(valKhongLam.valid).toBe(true);

    // Stage 4 progress check: 16/16 evaluated but UNSIGNED -> Stage 4 is IN_PROGRESS (not COMPLETED)
    const baseAssignment = [
      {
        id: "ASG_TCI",
        userId: "USER_GV_01",
        subjectId: "SUBJ_TCI",
        grade: "Khối 1",
        educationSystem: "ALL",
        user: { fullName: "Cô Nguyễn Thị Hoa" },
      },
    ];

    const unsignedStageRow = evaluateStudent8Stages({
      student: {
        id: "STU_001",
        studentCode: "HS26001",
        fullName: "Nguyễn Minh An",
        grade: "1",
        scores: [
          {
            subjectId: "SUBJ_TCI",
            subject: { id: "SUBJ_TCI", code: "TCI", name: TCI_SUBJECT_NAME },
            scores: JSON.stringify(Array(16).fill("Đạt")),
            comments: JSON.stringify(["", "", "", "", JSON.stringify({ _tciMeta: { signatureStatus: "UNSIGNED", evaluationStatus: "PENDING_SIGNATURE" } })]),
          },
        ],
      },
      isPreschool: false,
      period: { id: "PERIOD_26", name: "Kỳ KSĐV" },
      batch: { id: "BATCH_01", name: "Đợt 1" },
      campusName: "Cơ sở 1",
      campusCode: "CS1",
      matchedAssignments: baseAssignment,
      orientationRecord: null,
      preschoolDevScoresCount: 0,
      confirmationsMap: new Map(),
      studentCodeCountMap: new Map([["HS26001", 1]]),
    });
    expect(unsignedStageRow.stages[3].stageNumber).toBe(4);
    expect(unsignedStageRow.stages[3].status).toBe("IN_PROGRESS");

    // Stage 4 progress check: 16/16 evaluated AND SIGNED -> Stage 4 is COMPLETED, Stage 6 is NOT auto-approved
    const signedStageRow = evaluateStudent8Stages({
      student: {
        id: "STU_001",
        studentCode: "HS26001",
        fullName: "Nguyễn Minh An",
        grade: "1",
        scores: [
          {
            subjectId: "SUBJ_TCI",
            subject: { id: "SUBJ_TCI", code: "TCI", name: TCI_SUBJECT_NAME },
            scores: JSON.stringify(Array(16).fill("Đạt")),
            comments: JSON.stringify(["", "", "", "", JSON.stringify({ _tciMeta: { signatureStatus: "SIGNED", evaluationStatus: "COMPLETED", countEvaluated: 16 } })]),
          },
        ],
      },
      isPreschool: false,
      period: { id: "PERIOD_26", name: "Kỳ KSĐV" },
      batch: { id: "BATCH_01", name: "Đợt 1" },
      campusName: "Cơ sở 1",
      campusCode: "CS1",
      matchedAssignments: baseAssignment,
      orientationRecord: null,
      preschoolDevScoresCount: 0,
      confirmationsMap: new Map(),
      studentCodeCountMap: new Map([["HS26001", 1]]),
    });
    expect(signedStageRow.stages[3].stageNumber).toBe(4);
    expect(signedStageRow.stages[3].status).toBe("COMPLETED");
    expect(signedStageRow.stages[5].stageNumber).toBe(6);
    expect(signedStageRow.stages[5].status).not.toBe("COMPLETED");
  });
});
