import {
  DigitalSignatureProviderCode,
  TeacherCertificateInfo,
  SignOperationResult,
  SignatureRequestStatus,
} from "./types";

export interface ProviderConnectionConfig {
  endpoint?: string;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  timeoutMs?: number;
  environment?: "PRODUCTION" | "SANDBOX";
  [key: string]: any;
}

export interface InitiateSigningInput {
  requestId: string;
  documentId: string;
  documentTitle: string;
  documentHash: string; // SHA-256 hash of document snapshot
  signerTeacherCode: string;
  signerFullName: string;
  signerIdentityNumber?: string;
  certificateSerial?: string;
  authMethod?: "OTP_APP" | "OTP_SMS" | "PUSH_NOTIFICATION";
}

export interface ConfirmSigningInput {
  requestId: string;
  transactionId: string;
  otpOrAuthCode: string;
  documentHash: string;
}

export interface ReconcileQueryInput {
  requestId: string;
  transactionId?: string;
  documentHash: string;
}

export interface IDigitalSignatureProvider {
  readonly providerCode: DigitalSignatureProviderCode;
  readonly isMock: boolean;

  /**
   * Kiểm tra kết nối API tới hệ thống cung cấp chứng thư số
   */
  testConnection(config: ProviderConnectionConfig): Promise<{
    success: boolean;
    responseTimeMs: number;
    message: string;
    serverInfo?: string;
  }>;

  /**
   * Tra cứu thông tin chứng thư số của giáo viên từ nhà cung cấp
   */
  lookupCertificate(
    teacherCode: string,
    fullName: string,
    idNumber?: string,
    config?: ProviderConnectionConfig
  ): Promise<TeacherCertificateInfo>;

  /**
   * Tạo yêu cầu ký số (bước 1: gửi hash và khởi tạo giao dịch ký từ xa)
   */
  initiateSigning(
    input: InitiateSigningInput,
    config?: ProviderConnectionConfig
  ): Promise<{
    success: boolean;
    requestId: string;
    transactionId: string;
    status: SignatureRequestStatus;
    authPromptMessage?: string;
    expiresAt?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;

  /**
   * Xác thực và hoàn tất ký số (bước 2: nhập OTP / xác nhận qua app)
   */
  confirmSigning(
    input: ConfirmSigningInput,
    config?: ProviderConnectionConfig
  ): Promise<SignOperationResult>;

  /**
   * Tra cứu trạng thái giao dịch ký số (dùng để polling hoặc đối soát)
   */
  querySigningStatus(
    input: ReconcileQueryInput,
    config?: ProviderConnectionConfig
  ): Promise<SignOperationResult>;

  /**
   * Kiểm tra tính toàn vẹn và xác minh chữ ký số của tài liệu đã ký
   */
  verifySignature(
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
  }>;
}
