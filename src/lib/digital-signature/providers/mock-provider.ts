import * as crypto from "crypto";
import {
  IDigitalSignatureProvider,
  ProviderConnectionConfig,
  InitiateSigningInput,
  ConfirmSigningInput,
  ReconcileQueryInput,
} from "../provider-interface";
import {
  DigitalSignatureProviderCode,
  TeacherCertificateInfo,
  SignOperationResult,
} from "../types";

export class MockSandboxSignatureProvider implements IDigitalSignatureProvider {
  readonly providerCode: DigitalSignatureProviderCode = "MOCK_SANDBOX";
  readonly isMock: boolean = true;

  // In-memory mock transactions map for local simulation
  private static mockTransactions = new Map<
    string,
    {
      requestId: string;
      transactionId: string;
      documentHash: string;
      status: string;
      teacherCode: string;
      teacherName: string;
      createdAt: number;
    }
  >();

  async testConnection(config: ProviderConnectionConfig): Promise<{
    success: boolean;
    responseTimeMs: number;
    message: string;
    serverInfo?: string;
  }> {
    const start = Date.now();
    // Simulate brief network latency (100-200ms)
    await new Promise((r) => setTimeout(r, 120));
    return {
      success: true,
      responseTimeMs: Date.now() - start,
      message: "Kết nối thành công tới Cổng Mô phỏng Kiểm thử [SANDBOX-DEV]",
      serverInfo: "Sky-Line Mock Signature Engine v1.0.0-SANDBOX (Isolated Local Mode)",
    };
  }

  async lookupCertificate(
    teacherCode: string,
    fullName: string,
    idNumber?: string,
    config?: ProviderConnectionConfig
  ): Promise<TeacherCertificateInfo> {
    // Deterministic mock certificate serial based on teacher code
    const serialSuffix = crypto
      .createHash("sha256")
      .update(teacherCode || "GV_DEFAULT")
      .digest("hex")
      .substring(0, 12)
      .toUpperCase();

    const now = new Date();
    const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString();
    const validTo = new Date(now.getFullYear() + 2, 11, 31).toISOString();

    return {
      provider: "MOCK_SANDBOX",
      connectionStatus: "CONNECTED",
      subjectDn: `CN=${fullName || "Giáo viên Sky-Line"}, UID=${teacherCode}, O=HỆ THỐNG GIÁO DỤC SKY-LINE [MÔ PHỎNG / SANDBOX], C=VN`,
      serialNumber: `MOCK-SKYLINE-CA-${serialSuffix}`,
      issuer: "Sky-Line Mock Certification Authority (TESTING ROOT CA - NOT FOR LEGAL USE)",
      validFrom,
      validTo,
      lastVerifiedAt: new Date().toISOString(),
      isMockCertificate: true,
    };
  }

  async initiateSigning(
    input: InitiateSigningInput,
    config?: ProviderConnectionConfig
  ): Promise<{
    success: boolean;
    requestId: string;
    transactionId: string;
    status: any;
    authPromptMessage?: string;
    expiresAt?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    // Simulation hooks for testing edge cases:
    if (input.documentTitle?.includes("[SIMULATE_FAIL]")) {
      return {
        success: false,
        requestId: input.requestId,
        transactionId: "",
        status: "FAILED",
        errorCode: "ERR_PROVIDER_UNAVAILABLE",
        errorMessage: "Mô phỏng lỗi: Nhà cung cấp từ chối kết nối ký số [SIMULATED]",
      };
    }

    if (input.documentTitle?.includes("[SIMULATE_TIMEOUT]")) {
      const txId = `TX-TIMEOUT-${Date.now()}`;
      MockSandboxSignatureProvider.mockTransactions.set(input.requestId, {
        requestId: input.requestId,
        transactionId: txId,
        documentHash: input.documentHash,
        status: "UNKNOWN_PENDING_RECONCILE",
        teacherCode: input.signerTeacherCode,
        teacherName: input.signerFullName,
        createdAt: Date.now(),
      });
      return {
        success: true,
        requestId: input.requestId,
        transactionId: txId,
        status: "UNKNOWN_PENDING_RECONCILE",
        authPromptMessage: "Mô phỏng timeout kết nối, chuyển trạng thái cần đối soát",
      };
    }

    const transactionId = `TX-MOCK-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    MockSandboxSignatureProvider.mockTransactions.set(input.requestId, {
      requestId: input.requestId,
      transactionId,
      documentHash: input.documentHash,
      status: "AWAITING_AUTH",
      teacherCode: input.signerTeacherCode,
      teacherName: input.signerFullName,
      createdAt: Date.now(),
    });

    return {
      success: true,
      requestId: input.requestId,
      transactionId,
      status: "AWAITING_AUTH",
      authPromptMessage:
        "Mã xác thực OTP mô phỏng đã sẵn sàng. Bạn có thể nhập mã OTP (mặc định chấp nhận mã bất kỳ trừ 000000, hoặc bấm 'Xác nhận ký')",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async confirmSigning(
    input: ConfirmSigningInput,
    config?: ProviderConnectionConfig
  ): Promise<SignOperationResult> {
    // Specific error simulation for OTP
    if (input.otpOrAuthCode === "000000") {
      return {
        success: false,
        requestId: input.requestId,
        transactionId: input.transactionId,
        status: "FAILED",
        errorCode: "INVALID_OTP",
        message: "Mã OTP xác thực không chính xác hoặc đã hết hiệu lực (Mã 000000 bị từ chối)",
      };
    }

    // Build cryptographic mock signature value (HMAC-SHA256 signature of documentHash)
    const secretKey = "MOCK_SANDBOX_SECRET_KEY_NOT_SECURE";
    const sigValue = crypto
      .createHmac("sha256", secretKey)
      .update(input.documentHash + input.transactionId)
      .digest("hex");

    const signedAt = new Date().toISOString();
    const certSerial = `MOCK-SKYLINE-CA-${input.transactionId.substring(8, 16)}`;
    const certSubject = `CN=Giao vien Sky-Line, O=Sky-Line Education [MÔ PHỎNG / SANDBOX]`;
    const certIssuer = "Sky-Line Mock Certification Authority (SANDBOX)";

    return {
      success: true,
      requestId: input.requestId,
      transactionId: input.transactionId,
      status: "SUCCESS",
      message: "Ký số mô phỏng thành công (Môi trường Sandbox kiểm thử)",
      dataHash: input.documentHash,
      signatureValue: `MOCK_SIG_PKCS7_${sigValue}`,
      certificateSerial: certSerial,
      certificateSubject: certSubject,
      certIssuer,
      signedAt,
      verificationResult: {
        isValid: true,
        trustChainOk: true,
        notRevoked: true,
        hashMatched: true,
        timestamp: signedAt,
        details: "Chứng thư số hợp lệ trong phiên bản Sandbox kiểm thử [MÔ PHỎNG]",
      },
    };
  }

  async querySigningStatus(
    input: ReconcileQueryInput,
    config?: ProviderConnectionConfig
  ): Promise<SignOperationResult> {
    const tx = MockSandboxSignatureProvider.mockTransactions.get(input.requestId);

    // If transaction was marked as timeout, reconcile resolves it to SUCCESS if valid
    const signedAt = new Date().toISOString();
    const sigValue = crypto
      .createHmac("sha256", "MOCK_RECONCILE_KEY")
      .update(input.documentHash)
      .digest("hex");

    return {
      success: true,
      requestId: input.requestId,
      transactionId: input.transactionId || tx?.transactionId || `TX-REC-${Date.now()}`,
      status: "SUCCESS",
      message: "Đối soát thành công: Giao dịch ký số đã hoàn tất trên cổng nhà cung cấp",
      dataHash: input.documentHash,
      signatureValue: `MOCK_SIG_RECONCILED_${sigValue}`,
      certificateSerial: `MOCK-REC-SERIAL-2026`,
      certificateSubject: `CN=Giao vien Sky-Line, O=Sky-Line Education [SANDBOX]`,
      certIssuer: "Sky-Line Mock Certification Authority (SANDBOX)",
      signedAt,
      verificationResult: {
        isValid: true,
        trustChainOk: true,
        notRevoked: true,
        hashMatched: true,
        timestamp: signedAt,
        details: "Đã đối soát trạng thái thành công từ cổng mô phỏng",
      },
    };
  }

  async verifySignature(
    documentHash: string,
    signatureValue: string,
    certificateSerial: string
  ): Promise<{
    isValid: boolean;
    certificateValid: boolean;
    integrityVerified: boolean;
    signingTime: string;
    issuer: string;
    subject: string;
    details: string;
  }> {
    const isMockFormat =
      signatureValue?.startsWith("MOCK_SIG_") &&
      certificateSerial?.includes("MOCK");

    return {
      isValid: Boolean(isMockFormat && documentHash && signatureValue),
      certificateValid: true,
      integrityVerified: true,
      signingTime: new Date().toISOString(),
      issuer: "Sky-Line Mock Certification Authority (SANDBOX)",
      subject: "CN=Giao vien Sky-Line [MÔ PHỎNG / SANDBOX]",
      details:
        "Tài liệu được ký bằng chứng thư số Sandbox mô phỏng. Bằng chứng toán học toàn vẹn hợp lệ.",
    };
  }
}
