import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignatureService } from "@/lib/digital-signature/signature-service";
import { DigitalSignatureProviderFactory } from "@/lib/digital-signature/provider-factory";
import { MockSandboxSignatureProvider } from "@/lib/digital-signature/providers/mock-provider";
import { VnptSmartCaProvider } from "@/lib/digital-signature/providers/vnpt-smartca-provider";
import { GET as downloadPdfHandler } from "@/app/api/teacher/digital-signature/download-pdf/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// IN-MEMORY MOCK FOR PRISMA (Strictly zero writes to local.db / Turso)
// Rule 1: No unsolicited test data
// ---------------------------------------------------------------------------

const mockDb = {
  signableDocuments: [] as any[],
  documentSignatures: [] as any[],
  signatureAuditLogs: [] as any[],
  teacherSignatureProfiles: [] as any[],
  classes: [] as any[],
  teachingAssignments: [] as any[],
  teachers: [] as any[],
  digitalSignatureConfigs: [] as any[],
};

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      digitalSignatureConfig: {
        findUnique: vi.fn().mockImplementation(() => {
          return Promise.resolve(mockDb.digitalSignatureConfigs[0] || null);
        }),
      },
      class: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          const c = mockDb.classes.find((item) => item.id === where.id);
          return Promise.resolve(c || null);
        }),
      },
      teachingAssignment: {
        findFirst: vi.fn().mockImplementation(({ where }: any) => {
          const a = mockDb.teachingAssignments.find(
            (item) => item.teacherId === where.teacherId && item.classId === where.classId
          );
          return Promise.resolve(a || null);
        }),
      },
      teacher: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          const t = mockDb.teachers.find(
            (item) => item.userId === where.userId || item.id === where.id
          );
          return Promise.resolve(t || null);
        }),
      },
      teacherSignatureProfile: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          const p = mockDb.teacherSignatureProfiles.find(
            (item) => item.teacherId === where.teacherId
          );
          return Promise.resolve(p || null);
        }),
        upsert: vi.fn().mockImplementation(({ create, update, where }: any) => {
          let p = mockDb.teacherSignatureProfiles.find(
            (item) => item.teacherId === where.teacherId
          );
          if (p) {
            Object.assign(p, update);
          } else {
            p = { id: `profile_${Date.now()}`, ...create };
            mockDb.teacherSignatureProfiles.push(p);
          }
          return Promise.resolve(p);
        }),
      },
      signableDocument: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          const d = mockDb.signableDocuments.find(
            (item) => item.id === where.id || item.documentCode === where.documentCode
          );
          if (!d) return Promise.resolve(null);
          const sigs = mockDb.documentSignatures.filter((s) => s.documentId === d.id);
          return Promise.resolve({ ...d, signatures: sigs });
        }),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const newDoc = { id: `doc_${Date.now()}_${Math.random()}`, ...data, signatures: [] };
          mockDb.signableDocuments.push(newDoc);
          return Promise.resolve(newDoc);
        }),
        update: vi.fn().mockImplementation(({ where, data }: any) => {
          const d = mockDb.signableDocuments.find((item) => item.id === where.id);
          if (d) Object.assign(d, data);
          const sigs = mockDb.documentSignatures.filter((s) => s.documentId === where.id);
          return Promise.resolve({ ...d, signatures: sigs });
        }),
      },
      documentSignature: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          const s = mockDb.documentSignatures.find(
            (item) => item.id === where.id || item.requestId === where.requestId
          );
          if (!s) return Promise.resolve(null);
          const doc = mockDb.signableDocuments.find((item) => item.id === s.documentId);
          return Promise.resolve({ ...s, document: doc });
        }),
        findMany: vi.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(
            mockDb.documentSignatures.filter((item) => item.documentId === where.documentId)
          );
        }),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const sig = { id: `sig_${Date.now()}_${Math.random()}`, ...data };
          mockDb.documentSignatures.push(sig);
          return Promise.resolve(sig);
        }),
        update: vi.fn().mockImplementation(({ where, data }: any) => {
          const s = mockDb.documentSignatures.find((item) => item.id === where.id);
          if (s) Object.assign(s, data);
          return Promise.resolve(s);
        }),
      },
      signatureAuditLog: {
        create: vi.fn().mockImplementation(({ data }: any) => {
          const log = { id: `log_${Date.now()}`, ...data, createdAt: new Date() };
          mockDb.signatureAuditLogs.push(log);
          return Promise.resolve(log);
        }),
      },
    },
  };
});

let mockSessionUser: any = {
  id: "user_gv01",
  name: "Thầy Nguyễn Văn A",
  role: "TEACHER",
};

vi.mock("@/lib/auth", () => {
  return {
    auth: vi.fn().mockImplementation(() => Promise.resolve({ user: mockSessionUser })),
  };
});

describe("Teacher Digital Signature Subsystem Test Suite", () => {
  beforeEach(() => {
    // Reset in-memory states
    mockDb.signableDocuments = [];
    mockDb.documentSignatures = [];
    mockDb.signatureAuditLogs = [];
    mockDb.teacherSignatureProfiles = [];
    mockDb.classes = [];
    mockDb.teachingAssignments = [];
    mockDb.teachers = [];
    mockDb.digitalSignatureConfigs = [];

    // Setup base teacher and class
    mockDb.teachers.push({
      id: "teacher_gv01",
      userId: "user_gv01",
      teacherCode: "GV01",
      teacherName: "Nguyễn Văn A",
      position: "GVBM",
    });

    mockDb.classes.push({
      id: "class_10a1",
      className: "10A1",
      homeroomTeacherId: "teacher_gvcn",
    });

    mockDb.teachingAssignments.push({
      id: "assign_01",
      teacherId: "teacher_gv01",
      classId: "class_10a1",
      subjectId: "sub_math",
      academicYearId: "ay_2026",
    });

    mockDb.teacherSignatureProfiles.push({
      id: "tsp_01",
      teacherId: "teacher_gv01",
      provider: "MOCK_SANDBOX",
      connectionStatus: "CONNECTED",
      serialNumber: "MOCK-SERIAL-001",
      visualAppearanceUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    mockSessionUser = {
      id: "user_gv01",
      name: "Nguyễn Văn A",
      role: "TEACHER",
    };
  });

  // 1. Kiểm tra tính toán mã băm SHA-256 cố định và tạo phiên bản
  it("TC-01: Tính mã băm SHA-256 snapshot cố định và nhận diện tính toàn vẹn", () => {
    const contentA = { studentCode: "HS001", mathScore: 9.5, remarks: "Tiến bộ vượt bậc" };
    const contentB = { studentCode: "HS001", mathScore: 9.5, remarks: "Tiến bộ vượt bậc" };
    const contentC = { studentCode: "HS001", mathScore: 8.0, remarks: "Tiến bộ vượt bậc" };

    const hashA = SignatureService.computeCanonicalHash(contentA);
    const hashB = SignatureService.computeCanonicalHash(contentB);
    const hashC = SignatureService.computeCanonicalHash(contentC);

    expect(hashA).toBe(hashB); // Cùng nội dung phải sinh cùng mã băm
    expect(hashA).not.toBe(hashC); // Nội dung đổi thì mã băm phải khác
    expect(hashA).toMatch(/^[a-f0-9]{64}$/); // Đúng chuẩn SHA-256 (64 hex characters)
  });

  // 2. Kiểm tra phân công giáo viên (RBAC / Teaching Assignment)
  it("TC-02: Cho phép giáo viên đúng phân công ký và chặn giáo viên ngoài phân công", async () => {
    // 1. Giáo viên Nguyễn Văn A dạy Toán lớp 10A1 -> Cho phép
    const checkAllowed = await SignatureService.verifyTeacherAssignment(
      "teacher_gv01",
      "class_10a1",
      "sub_math",
      "ay_2026"
    );
    expect(checkAllowed.isAssigned).toBe(true);
    expect(checkAllowed.role).toBe("GVBM");

    // 2. Giáo viên Nguyễn Văn A không dạy lớp 12A5 -> Chặn
    const checkDenied = await SignatureService.verifyTeacherAssignment(
      "teacher_gv01",
      "class_12a5",
      "sub_math",
      "ay_2026"
    );
    expect(checkDenied.isAssigned).toBe(false);
    expect(checkDenied.reason).toContain("không thuộc danh sách phân công");
  });

  // 3. Quy trình ký số một hồ sơ thành công (Initiate -> Confirm -> Signed PDF)
  it("TC-03: Thực hiện hoàn tất luồng ký số 1 hồ sơ đúng chuẩn", async () => {
    // Tạo tài liệu cần ký
    const doc = await SignatureService.getOrCreateSignableDocument({
      studentId: "student_01",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      subjectId: "sub_math",
      formType: "PHIEU_DANH_GIA_MON_HOC",
      term: "HK1",
      title: "Phiếu Nhận xét Môn Toán HK1 - Học sinh 01",
      contentSnapshot: { score: 9.5, comment: "Chăm chỉ" },
    });

    expect(doc.contentStatus).toBe("READY_TO_SIGN");
    expect(doc.version).toBe("1.0");

    // Khởi tạo ký số
    const initRes = await SignatureService.initiateDocumentSignature({
      documentId: doc.id,
      teacherId: "teacher_gv01",
      teacherName: "Nguyễn Văn A",
      teacherCode: "GV01",
      provider: "MOCK_SANDBOX",
    });

    expect(initRes.success).toBe(true);
    expect(initRes.status).toBe("AWAITING_AUTH");
    expect(initRes.requestId).toBeDefined();

    // Xác thực hoàn tất ký số
    const confirmRes = await SignatureService.confirmDocumentSignature({
      requestId: initRes.requestId,
      otpCode: "123456",
    });

    expect(confirmRes.success).toBe(true);
    expect(confirmRes.status).toBe("SUCCESS");
    expect(confirmRes.certificateSerial).toBeDefined();

    // Kiểm tra tài liệu đã được chuyển sang trạng thái đã hoàn tất ký số
    const signedDoc = await (SignatureService as any).getOrCreateSignableDocument({
      studentId: "student_01",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      subjectId: "sub_math",
      formType: "PHIEU_DANH_GIA_MON_HOC",
      term: "HK1",
      title: "Phiếu Nhận xét Môn Toán HK1 - Học sinh 01",
      contentSnapshot: { score: 9.5, comment: "Chăm chỉ" },
    });

    expect(signedDoc.isCompleted).toBe(true);
  });

  // 4. Kiểm tra phát hiện thay đổi nội dung sau khi ký (Revision Required)
  it("TC-04: Tự động phát hiện chỉnh sửa nội dung và chuyển trạng thái REVISION_REQUIRED", async () => {
    // 1. Tạo và ký phiên bản v1.0
    const docV1 = await SignatureService.getOrCreateSignableDocument({
      studentId: "student_02",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      subjectId: "sub_math",
      formType: "PHIEU_DANH_GIA_MON_HOC",
      term: "HK1",
      title: "Phiếu Nhận xét - HS 02",
      contentSnapshot: { score: 8.0, comment: "Bản gốc" },
    });

    // 2. Sửa nội dung sau đó (VD: nâng điểm lên 8.5)
    const docV2 = await SignatureService.getOrCreateSignableDocument({
      studentId: "student_02",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      subjectId: "sub_math",
      formType: "PHIEU_DANH_GIA_MON_HOC",
      term: "HK1",
      title: "Phiếu Nhận xét - HS 02",
      contentSnapshot: { score: 8.5, comment: "Đã sửa điểm sau khi phúc khảo" },
    });

    expect(docV2.version).toBe("2.0");
    expect(docV2.contentStatus).toBe("REVISION_REQUIRED");
    expect(docV2.isCompleted).toBe(false); // Bắt buộc phải ký lại
  });

  // 5. Kiểm tra ký hàng loạt có phân lập lỗi từng hồ sơ (Batch signing partial success)
  it("TC-05: Ký hàng loạt xử lý độc lập từng tài liệu và báo cáo kết quả riêng", async () => {
    // Tạo 3 tài liệu: 2 bình thường, 1 tài liệu mô phỏng lỗi
    const doc1 = await SignatureService.getOrCreateSignableDocument({
      studentId: "hs_01",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      formType: "CAM_KET_HOC_TAP",
      title: "Cam kết học tập 01",
      contentSnapshot: { target: "Học sinh giỏi" },
    });

    const doc2 = await SignatureService.getOrCreateSignableDocument({
      studentId: "hs_02",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      formType: "CAM_KET_HOC_TAP",
      title: "Cam kết học tập 02 [SIMULATE_FAIL]", // Kích hoạt mô phỏng lỗi
      contentSnapshot: { target: "Xuất sắc" },
    });

    const batchRes = await SignatureService.batchSignDocuments({
      documentIds: [doc1.id, doc2.id],
      teacherId: "teacher_gv01",
      teacherName: "Nguyễn Văn A",
      teacherCode: "GV01",
      otpCode: "123456",
    });

    expect(batchRes.totalRequested).toBe(2);
    expect(batchRes.totalSuccess).toBe(1);
    expect(batchRes.totalFailed).toBe(1);

    // Không được báo thành công toàn bộ
    expect(batchRes.totalSuccess).not.toBe(batchRes.totalRequested);
    expect(batchRes.results[0].success).toBe(true);
    expect(batchRes.results[1].success).toBe(false);
    expect(batchRes.results[1].status).toBe("FAILED");
  });

  // 6. Kiểm tra đối soát giao dịch timeout (Reconciliation)
  it("TC-06: Đối soát giao dịch UNKNOWN_PENDING_RECONCILE và khôi phục trạng thái thành công", async () => {
    const docTimeout = await SignatureService.getOrCreateSignableDocument({
      studentId: "hs_timeout",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      formType: "HO_SO_NANG_LUC",
      title: "Hồ sơ Timeout [SIMULATE_TIMEOUT]",
      contentSnapshot: { status: "pending" },
    });

    const init = await SignatureService.initiateDocumentSignature({
      documentId: docTimeout.id,
      teacherId: "teacher_gv01",
      teacherName: "Nguyễn Văn A",
      teacherCode: "GV01",
      provider: "MOCK_SANDBOX",
    });

    expect(init.status).toBe("UNKNOWN_PENDING_RECONCILE");

    // Tiến hành đối soát
    const recRes = await SignatureService.reconcileSignature({
      requestId: init.requestId,
      actorId: "teacher_gv01",
      actorName: "Nguyễn Văn A",
    });

    expect(recRes.success).toBe(true);
    expect(recRes.resolved).toBe(true);
    expect(recRes.status).toBe("SUCCESS");
  });

  // 7. Kiểm tra phân quyền tải PDF: PHHS chỉ tải được khi tài liệu ĐÃ CÔNG BỐ
  it("TC-07: Chặn PHHS tải PDF khi tài liệu chưa công bố, cho phép khi đã công bố", async () => {
    // Tạo tài liệu đã ký nhưng CHƯA CÔNG BỐ
    const doc = await SignatureService.getOrCreateSignableDocument({
      studentId: "hs_privacy",
      academicYearId: "ay_2026",
      classId: "class_10a1",
      formType: "HO_SO_NANG_LUC",
      title: "Hồ sơ Năng lực Bảo mật",
      contentSnapshot: { test: true },
    });

    // Ký tài liệu
    const init = await SignatureService.initiateDocumentSignature({
      documentId: doc.id,
      teacherId: "teacher_gv01",
      teacherName: "Nguyễn Văn A",
      teacherCode: "GV01",
    });
    await SignatureService.confirmDocumentSignature({ requestId: init.requestId });

    // 1. Phụ huynh truy cập khi UNPUBLISHED -> Bị chặn 403
    mockSessionUser = { id: "parent_01", name: "Phụ huynh", role: "PARENT" };
    const reqUnpublished = new NextRequest(
      `http://localhost:3000/api/teacher/digital-signature/download-pdf?documentId=${doc.id}`
    );
    const resUnpublished = await downloadPdfHandler(reqUnpublished);
    expect(resUnpublished.status).toBe(403);
    const jsonUnpub = await resUnpublished.json();
    expect(jsonUnpub.error).toContain("chưa được Nhà trường công bố");

    // 2. Chuyển sang PUBLISHED -> Cho phép tải tệp
    doc.publicationStatus = "PUBLISHED";
    const reqPublished = new NextRequest(
      `http://localhost:3000/api/teacher/digital-signature/download-pdf?documentId=${doc.id}`
    );
    const resPublished = await downloadPdfHandler(reqPublished);
    expect(resPublished.status).toBe(200);
    expect(resPublished.headers.get("Content-Type")).toBe("application/pdf");
  });

  // 8. Kiểm tra adapter nhà cung cấp thực tế khi chưa cấu hình (Graceful Unconnected State)
  it("TC-08: VNPT SmartCA trả về trạng thái Chưa kết nối an toàn khi chưa cấu hình thông số", async () => {
    const vnpt = new VnptSmartCaProvider();
    const testRes = await vnpt.testConnection({});
    expect(testRes.success).toBe(false);
    expect(testRes.message).toContain("Chưa kết nối");

    const certRes = await vnpt.lookupCertificate("GV999", "Trần Thị B");
    expect(certRes.connectionStatus).toBe("NOT_CONNECTED");
    expect(certRes.serialNumber).toBeNull();
  });
});
