import * as crypto from "crypto";
import { prisma } from "../db";
import { DigitalSignatureProviderFactory } from "./provider-factory";
import { PdfSigningService } from "./pdf-signing-service";
import {
  DigitalSignatureProviderCode,
  SignerRole,
  SignableFormType,
  DocumentContentStatus,
  SignatureRequestStatus,
  DocumentPublicationStatus,
  BatchSignResponse,
  BatchSignItemResult,
} from "./types";

export class SignatureService {
  /**
   * Tính mã băm SHA-256 chuẩn của đối tượng snapshot
   */
  static computeCanonicalHash(content: any): string {
    const canonicalString = typeof content === "string" ? content : JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash("sha256").update(canonicalString).digest("hex");
  }

  /**
   * Lấy cấu hình hệ thống Chữ ký số từ Admin
   */
  static async getSystemConfig() {
    const pAny = prisma as any;
    let config = await pAny.digitalSignatureConfig.findUnique({
      where: { key: "SYSTEM_CONFIG" },
    }).catch(() => null);

    if (!config) {
      config = {
        key: "SYSTEM_CONFIG",
        isEnabled: true,
        allowedProviders: JSON.stringify(["VNPT_SMARTCA", "VIETTEL_CA", "MISA_ESIGN", "MOCK_SANDBOX"]),
        activeProvider: "MOCK_SANDBOX", // Default to sandbox if not yet configured
        providerSettings: "{}",
        applicableForms: JSON.stringify(["HO_SO_NANG_LUC", "PHIEU_DANH_GIA_MON_HOC", "PHIEU_DANH_GIA_MAM_NON", "CAM_KET_HOC_TAP"]),
        signingFlowRules: JSON.stringify({
          order: ["GVBM", "GVCN", "TTCM", "GDCS"],
          requirePreviousSigns: false,
        }),
        anchorSettings: "{}",
        campusScope: JSON.stringify(["*"]),
        academicYearScope: JSON.stringify(["*"]),
        autoPublishOnCompleted: false,
      };
    }
    return config;
  }

  /**
   * Kiểm tra phân công của giáo viên đối với học sinh/môn học/lớp học
   */
  static async verifyTeacherAssignment(
    teacherId: string,
    classId: string,
    subjectId?: string | null,
    academicYearId?: string | null
  ): Promise<{ isAssigned: boolean; role: SignerRole; reason?: string }> {
    const pAny = prisma as any;

    // 1. Kiểm tra giáo viên chủ nhiệm (GVCN)
    const cls = await pAny.class.findUnique({
      where: { id: classId },
      select: { homeroomTeacherId: true, className: true },
    }).catch(() => null);

    if (cls && (cls.homeroomTeacherId === teacherId || cls.homeroomTeacherId?.includes(teacherId))) {
      return { isAssigned: true, role: "GVCN" };
    }

    // 2. Kiểm tra giáo viên bộ môn (GVBM)
    if (subjectId) {
      const assignment = await pAny.teachingAssignment.findFirst({
        where: {
          teacherId,
          classId,
          subjectId,
          ...(academicYearId ? { academicYearId } : {}),
        },
      }).catch(() => null);

      if (assignment) {
        return { isAssigned: true, role: "GVBM" };
      }
    } else {
      // Nếu không chỉ định subjectId, kiểm tra giáo viên có dạy môn nào của lớp này không
      const anyAssignment = await pAny.teachingAssignment.findFirst({
        where: {
          teacherId,
          classId,
          ...(academicYearId ? { academicYearId } : {}),
        },
      }).catch(() => null);

      if (anyAssignment) {
        return { isAssigned: true, role: "GVBM" };
      }
    }

    return {
      isAssigned: false,
      role: "GVBM",
      reason: "Giáo viên không thuộc danh sách phân công giảng dạy hoặc chủ nhiệm của lớp này.",
    };
  }

  /**
   * Khởi tạo hoặc cập nhật SignableDocument từ hồ sơ học sinh
   */
  static async getOrCreateSignableDocument(input: {
    studentId: string;
    academicYearId: string;
    classId: string;
    campusId?: string;
    subjectId?: string | null;
    formType: SignableFormType;
    term?: string;
    title: string;
    contentSnapshot: any;
  }) {
    const pAny = prisma as any;
    const documentCode = `DOC-${input.formType}-${input.academicYearId}-${input.studentId}${input.subjectId ? `-${input.subjectId}` : ""}${input.term ? `-${input.term}` : ""}`;
    const newContentHash = this.computeCanonicalHash(input.contentSnapshot);

    const existing = await pAny.signableDocument.findUnique({
      where: { documentCode },
      include: { signatures: true },
    }).catch(() => null);

    if (!existing) {
      return await pAny.signableDocument.create({
        data: {
          documentCode,
          formType: input.formType,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          campusId: input.campusId,
          subjectId: input.subjectId,
          term: input.term,
          title: input.title,
          version: "1.0",
          versionNumber: 1,
          contentHash: newContentHash,
          contentSnapshot: JSON.stringify(input.contentSnapshot),
          contentStatus: "READY_TO_SIGN",
          publicationStatus: "UNPUBLISHED",
          isCompleted: false,
        },
        include: { signatures: true },
      });
    }

    // Nếu nội dung thay đổi so với bản đã có
    if (existing.contentHash !== newContentHash) {
      const nextVersionNumber = existing.versionNumber + 1;
      const nextVersion = `${nextVersionNumber}.0`;

      // Cập nhật tài liệu sang trạng thái cần ký lại, tăng version, giữ nguyên lịch sử
      const updated = await pAny.signableDocument.update({
        where: { id: existing.id },
        data: {
          version: nextVersion,
          versionNumber: nextVersionNumber,
          contentHash: newContentHash,
          contentSnapshot: JSON.stringify(input.contentSnapshot),
          contentStatus: "REVISION_REQUIRED",
          // Đánh dấu tài liệu cần ký lại
          isCompleted: false,
        },
        include: { signatures: true },
      });

      // Ghi log thay đổi nội dung
      await pAny.signatureAuditLog.create({
        data: {
          documentId: existing.id,
          action: "REVISION_TRIGGERED",
          actorId: "SYSTEM",
          actorName: "Hệ thống Sky-Line",
          actorRole: "SYSTEM",
          details: JSON.stringify({
            oldVersion: existing.version,
            newVersion: nextVersion,
            reason: "Nội dung hồ sơ thay đổi sau lần ký trước, hệ thống yêu cầu ký lại theo quy định.",
          }),
        },
      }).catch(() => null);

      return updated;
    }

    return existing;
  }

  /**
   * Khởi tạo một yêu cầu ký số
   */
  static async initiateDocumentSignature(params: {
    documentId: string;
    teacherId: string;
    teacherName: string;
    teacherCode: string;
    provider?: DigitalSignatureProviderCode;
    actorIp?: string;
    actorUserAgent?: string;
  }) {
    const pAny = prisma as any;
    const document = await pAny.signableDocument.findUnique({
      where: { id: params.documentId },
      include: {
        student: true,
        class: true,
        academicYear: true,
        signatures: true,
      },
    });

    if (!document) {
      throw new Error("Không tìm thấy tài liệu cần ký số.");
    }

    // 1. Kiểm tra phân công
    const assignCheck = await this.verifyTeacherAssignment(
      params.teacherId,
      document.classId,
      document.subjectId,
      document.academicYearId
    );
    if (!assignCheck.isAssigned) {
      throw new Error(`Từ chối ký số: ${assignCheck.reason}`);
    }

    const signerRole = assignCheck.role;

    // 2. Kiểm tra cấu hình hệ thống
    const sysConfig = await this.getSystemConfig();
    if (!sysConfig.isEnabled) {
      throw new Error("Hệ thống Chữ ký số hiện đang tạm khóa bởi Quản trị viên.");
    }

    const providerCode: DigitalSignatureProviderCode =
      params.provider || (sysConfig.activeProvider as DigitalSignatureProviderCode) || "MOCK_SANDBOX";

    // 3. Lấy mẫu hiển thị chữ ký của giáo viên
    const profile = await pAny.teacherSignatureProfile.findUnique({
      where: { teacherId: params.teacherId },
    }).catch(() => null);

    const visualAppearanceUrl = profile?.visualAppearanceUrl || null;

    // 4. Kiểm tra thứ tự ký nếu có quy định
    const flowRules = JSON.parse(sysConfig.signingFlowRules || "{}");
    if (flowRules.requirePreviousSigns && flowRules.order && Array.isArray(flowRules.order)) {
      const myIndex = flowRules.order.indexOf(signerRole);
      if (myIndex > 0) {
        const requiredPreviousRole = flowRules.order[myIndex - 1];
        const prevSigned = document.signatures.some(
          (s: any) => s.signerRole === requiredPreviousRole && s.requestStatus === "SUCCESS"
        );
        if (!prevSigned) {
          throw new Error(
            `Tài liệu phải được ký bởi vai trò [${requiredPreviousRole}] trước khi [${signerRole}] tiến hành ký.`
          );
        }
      }
    }

    // 5. Tạo mã yêu cầu duy nhất (Chống lặp)
    const requestId = `REQ-SIG-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const providerInstance = DigitalSignatureProviderFactory.getProvider(providerCode);

    // 6. Gửi yêu cầu tới Provider
    const initRes = await providerInstance.initiateSigning({
      requestId,
      documentId: document.id,
      documentTitle: document.title,
      documentHash: document.contentHash,
      signerTeacherCode: params.teacherCode,
      signerFullName: params.teacherName,
    });

    if (!initRes.success && initRes.status !== "UNKNOWN_PENDING_RECONCILE") {
      throw new Error(initRes.errorMessage || "Không thể khởi tạo yêu cầu ký số với nhà cung cấp.");
    }

    // 7. Lưu DocumentSignature record
    const signatureRecord = await pAny.documentSignature.create({
      data: {
        documentId: document.id,
        signerId: params.teacherId,
        signerName: params.teacherName,
        signerRole,
        orderIndex: document.signatures.length + 1,
        requestStatus: initRes.status,
        requestId,
        transactionId: initRes.transactionId || null,
        provider: providerCode,
        dataHash: document.contentHash,
        visualAppearanceUrl,
      },
    });

    // 8. Ghi Audit Log
    await pAny.signatureAuditLog.create({
      data: {
        documentId: document.id,
        signatureId: signatureRecord.id,
        action: "REQUEST_SIGN",
        actorId: params.teacherId,
        actorName: params.teacherName,
        actorRole: signerRole,
        ipAddress: params.actorIp,
        userAgent: params.actorUserAgent,
        details: JSON.stringify({
          provider: providerCode,
          requestId,
          transactionId: initRes.transactionId,
          contentHash: document.contentHash,
          version: document.version,
        }),
      },
    }).catch(() => null);

    return {
      success: true,
      requestId,
      transactionId: initRes.transactionId,
      status: initRes.status,
      authPromptMessage: initRes.authPromptMessage,
      expiresAt: initRes.expiresAt,
    };
  }

  /**
   * Xác nhận và hoàn tất ký số một tài liệu
   */
  static async confirmDocumentSignature(params: {
    requestId: string;
    otpCode?: string;
    actorIp?: string;
    actorUserAgent?: string;
  }) {
    const pAny = prisma as any;
    const sigRecord = await pAny.documentSignature.findUnique({
      where: { requestId: params.requestId },
      include: {
        document: {
          include: {
            student: true,
            class: true,
            academicYear: true,
            signatures: true,
          },
        },
      },
    });

    if (!sigRecord) {
      throw new Error("Không tìm thấy thông tin phiên ký số tương ứng.");
    }

    const providerInstance = DigitalSignatureProviderFactory.getProvider(
      sigRecord.provider as DigitalSignatureProviderCode
    );

    // Gọi provider để xác thực
    const confirmRes = await providerInstance.confirmSigning({
      requestId: sigRecord.requestId,
      transactionId: sigRecord.transactionId || "",
      otpOrAuthCode: params.otpCode || "123456",
      documentHash: sigRecord.dataHash,
    });

    if (!confirmRes.success) {
      // Cập nhật trạng thái thất bại
      await pAny.documentSignature.update({
        where: { id: sigRecord.id },
        data: {
          requestStatus: "FAILED",
          failureReason: confirmRes.message || "Xác thực chữ ký số thất bại",
          retryCount: { increment: 1 },
        },
      });

      return {
        success: false,
        status: "FAILED",
        message: confirmRes.message || "Xác thực chữ ký số thất bại.",
      };
    }

    // Nếu thành công:
    const signedAt = confirmRes.signedAt ? new Date(confirmRes.signedAt) : new Date();

    // Cập nhật chữ ký hiện tại
    await pAny.documentSignature.update({
      where: { id: sigRecord.id },
      data: {
        requestStatus: "SUCCESS",
        signatureValue: confirmRes.signatureValue,
        certificateSerial: confirmRes.certificateSerial,
        certificateSubject: confirmRes.certificateSubject,
        certIssuer: confirmRes.certIssuer,
        signedAt,
        verifiedAt: signedAt,
        verificationResult: JSON.stringify(confirmRes.verificationResult || {}),
      },
    });

    // Lấy toàn bộ danh sách chữ ký thành công của tài liệu này để tạo bản PDF hoàn chỉnh
    const allSignedSigs = await pAny.documentSignature.findMany({
      where: {
        documentId: sigRecord.documentId,
        requestStatus: "SUCCESS",
      },
      orderBy: { orderIndex: "asc" },
    });

    // Sinh và lưu file PDF đã ký (bảo toàn tất cả các chữ ký trước đó)
    let signedPdfInfo: any = null;
    try {
      signedPdfInfo = await PdfSigningService.generateAndSaveSignedPdf({
        documentCode: sigRecord.document.documentCode,
        version: sigRecord.document.version,
        title: sigRecord.document.title,
        studentName: sigRecord.document.student?.fullName || "Học sinh",
        studentCode: sigRecord.document.student?.studentCode || "",
        className: sigRecord.document.class?.className || "",
        campusName: "Sky-Line School",
        academicYearName: sigRecord.document.academicYear?.name || "",
        termName: sigRecord.document.term || undefined,
        contentData: JSON.parse(sigRecord.document.contentSnapshot || "{}"),
        signatures: allSignedSigs.map((s: any) => ({
          signerRole: s.signerRole,
          signerName: s.signerName,
          signedAt: s.signedAt?.toISOString() || new Date().toISOString(),
          certificateSerial: s.certificateSerial || "N/A",
          certIssuer: s.certIssuer || "N/A",
          signatureValue: s.signatureValue || "",
          visualAppearanceUrl: s.visualAppearanceUrl || undefined,
          provider: s.provider,
        })),
      });

      // Cập nhật đường dẫn file PDF vào chữ ký
      await pAny.documentSignature.update({
        where: { id: sigRecord.id },
        data: { signedPdfPath: signedPdfInfo.filePath },
      });
    } catch (pdfErr) {
      console.error("Lỗi khi sinh PDF đã ký:", pdfErr);
    }

    // Cập nhật trạng thái tài liệu
    const sysConfig = await this.getSystemConfig();
    const isCompleted = true; // Đánh dấu đã ký lượt này

    await pAny.signableDocument.update({
      where: { id: sigRecord.documentId },
      data: {
        isCompleted,
        contentStatus: "READY_TO_SIGN",
        // KHÔNG tự ý đổi publicationStatus sang PUBLISHED nếu sysConfig.autoPublishOnCompleted là false!
        ...(sysConfig.autoPublishOnCompleted
          ? { publicationStatus: "PUBLISHED", publishedAt: new Date() }
          : {}),
      },
    });

    // Ghi Audit Log
    await pAny.signatureAuditLog.create({
      data: {
        documentId: sigRecord.documentId,
        signatureId: sigRecord.id,
        action: "VERIFY_SIGN",
        actorId: sigRecord.signerId,
        actorName: sigRecord.signerName,
        actorRole: sigRecord.signerRole,
        ipAddress: params.actorIp,
        userAgent: params.actorUserAgent,
        details: JSON.stringify({
          provider: sigRecord.provider,
          certificateSerial: confirmRes.certificateSerial,
          signedAt: signedAt.toISOString(),
          pdfSaved: signedPdfInfo?.fileName || null,
        }),
      },
    }).catch(() => null);

    return {
      success: true,
      status: "SUCCESS",
      message: "Ký số thành công và đã lưu bản PDF có giá trị pháp lý điện tử.",
      certificateSerial: confirmRes.certificateSerial,
      signedPdfPath: signedPdfInfo?.filePath || null,
    };
  }

  /**
   * Ký số hàng loạt nhiều hồ sơ (Batch Signing) với cơ chế cách ly lỗi từng hồ sơ
   */
  static async batchSignDocuments(params: {
    documentIds: string[];
    teacherId: string;
    teacherName: string;
    teacherCode: string;
    otpCode?: string;
    provider?: DigitalSignatureProviderCode;
    actorIp?: string;
    actorUserAgent?: string;
  }): Promise<BatchSignResponse> {
    const results: BatchSignItemResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalPendingReconcile = 0;

    const pAny = prisma as any;

    for (const docId of params.documentIds) {
      const doc = await pAny.signableDocument.findUnique({
        where: { id: docId },
        include: { student: true, class: true },
      }).catch(() => null);

      if (!doc) {
        results.push({
          documentId: docId,
          documentCode: "UNKNOWN",
          studentName: "Không xác định",
          studentCode: "",
          className: "",
          success: false,
          status: "FAILED",
          message: "Không tìm thấy tài liệu",
        });
        totalFailed++;
        continue;
      }

      try {
        // 1. Khởi tạo yêu cầu
        const init = await this.initiateDocumentSignature({
          documentId: docId,
          teacherId: params.teacherId,
          teacherName: params.teacherName,
          teacherCode: params.teacherCode,
          provider: params.provider,
          actorIp: params.actorIp,
          actorUserAgent: params.actorUserAgent,
        });

        if (init.status === "UNKNOWN_PENDING_RECONCILE") {
          results.push({
            documentId: docId,
            documentCode: doc.documentCode,
            studentName: doc.student?.fullName || "",
            studentCode: doc.student?.studentCode || "",
            className: doc.class?.className || "",
            success: false,
            status: "UNKNOWN_PENDING_RECONCILE",
            message: "Mất kết nối hoặc phản hồi chậm, hồ sơ cần đối soát lại.",
            requestId: init.requestId,
          });
          totalPendingReconcile++;
          continue;
        }

        // 2. Xác nhận hoàn tất
        const confirm = await this.confirmDocumentSignature({
          requestId: init.requestId,
          otpCode: params.otpCode,
          actorIp: params.actorIp,
          actorUserAgent: params.actorUserAgent,
        });

        if (confirm.success) {
          results.push({
            documentId: docId,
            documentCode: doc.documentCode,
            studentName: doc.student?.fullName || "",
            studentCode: doc.student?.studentCode || "",
            className: doc.class?.className || "",
            success: true,
            status: "SUCCESS",
            message: "Đã ký số thành công.",
            requestId: init.requestId,
          });
          totalSuccess++;
        } else {
          results.push({
            documentId: docId,
            documentCode: doc.documentCode,
            studentName: doc.student?.fullName || "",
            studentCode: doc.student?.studentCode || "",
            className: doc.class?.className || "",
            success: false,
            status: "FAILED",
            message: confirm.message || "Ký số không thành công",
            requestId: init.requestId,
          });
          totalFailed++;
        }
      } catch (err: any) {
        results.push({
          documentId: docId,
          documentCode: doc.documentCode,
          studentName: doc.student?.fullName || "",
          studentCode: doc.student?.studentCode || "",
          className: doc.class?.className || "",
          success: false,
          status: "FAILED",
          message: err?.message || "Lỗi xử lý ký số",
        });
        totalFailed++;
      }
    }

    return {
      totalRequested: params.documentIds.length,
      totalSuccess,
      totalFailed,
      totalPendingReconcile,
      results,
    };
  }

  /**
   * Đối soát trạng thái giao dịch ký số (Reconciliation)
   */
  static async reconcileSignature(params: {
    requestId: string;
    actorId: string;
    actorName: string;
  }) {
    const pAny = prisma as any;
    const sigRecord = await pAny.documentSignature.findUnique({
      where: { requestId: params.requestId },
      include: { document: true },
    });

    if (!sigRecord) {
      throw new Error("Không tìm thấy mã yêu cầu cần đối soát.");
    }

    const providerInstance = DigitalSignatureProviderFactory.getProvider(
      sigRecord.provider as DigitalSignatureProviderCode
    );

    const recResult = await providerInstance.querySigningStatus({
      requestId: sigRecord.requestId,
      transactionId: sigRecord.transactionId || undefined,
      documentHash: sigRecord.dataHash,
    });

    if (recResult.success && recResult.status === "SUCCESS") {
      await pAny.documentSignature.update({
        where: { id: sigRecord.id },
        data: {
          requestStatus: "SUCCESS",
          signatureValue: recResult.signatureValue,
          certificateSerial: recResult.certificateSerial,
          signedAt: recResult.signedAt ? new Date(recResult.signedAt) : new Date(),
          reconciliationStatus: "RESOLVED",
        },
      });

      // Audit log
      await pAny.signatureAuditLog.create({
        data: {
          documentId: sigRecord.documentId,
          signatureId: sigRecord.id,
          action: "RECONCILE",
          actorId: params.actorId,
          actorName: params.actorName,
          actorRole: "TEACHER",
          details: JSON.stringify({
            status: "RESOLVED_SUCCESS",
            message: "Đã đối soát thành công và đồng bộ trạng thái Đã ký số.",
          }),
        },
      }).catch(() => null);

      return {
        success: true,
        resolved: true,
        status: "SUCCESS",
        message: "Đối soát thành công: Giao dịch đã được xác nhận ký số thành công.",
      };
    }

    return {
      success: true,
      resolved: false,
      status: recResult.status,
      message: recResult.message || "Giao dịch vẫn đang trong quá trình xử lý hoặc chưa hoàn tất.",
    };
  }
}
