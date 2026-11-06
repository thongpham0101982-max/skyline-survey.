/**
 * Teacher Digital Signature System Types & Constants
 * Hệ thống Chữ ký số Giáo viên - Sky-Line School System
 */

// 1. Provider Codes
export type DigitalSignatureProviderCode =
  | "VNPT_SMARTCA"
  | "VIETTEL_CA"
  | "MISA_ESIGN"
  | "FPT_CA"
  | "BKAV_CA"
  | "MOCK_SANDBOX";

export interface ProviderMetadata {
  code: DigitalSignatureProviderCode;
  name: string;
  vendor: string;
  description: string;
  isMock: boolean;
  supportedAuthTypes: ("OTP_SMS" | "OTP_APP" | "PUSH_NOTIFICATION" | "USB_TOKEN")[];
}

export const SIGNATURE_PROVIDERS: Record<DigitalSignatureProviderCode, ProviderMetadata> = {
  VNPT_SMARTCA: {
    code: "VNPT_SMARTCA",
    name: "VNPT SmartCA",
    vendor: "Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT)",
    description: "Chữ ký số từ xa đám mây theo chuẩn eIDAS và Thông tư 16/2019/TT-BTTTT",
    isMock: false,
    supportedAuthTypes: ["PUSH_NOTIFICATION", "OTP_APP"],
  },
  VIETTEL_CA: {
    code: "VIETTEL_CA",
    name: "Viettel-CA Cloud",
    vendor: "Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)",
    description: "Giải pháp ký số từ xa Cloud PKI Viettel MySign",
    isMock: false,
    supportedAuthTypes: ["PUSH_NOTIFICATION", "OTP_APP", "OTP_SMS"],
  },
  MISA_ESIGN: {
    code: "MISA_ESIGN",
    name: "MISA eSign",
    vendor: "Công ty Cổ phần MISA",
    description: "Dịch vụ chữ ký số từ xa đám mây MISA",
    isMock: false,
    supportedAuthTypes: ["OTP_APP", "PUSH_NOTIFICATION"],
  },
  FPT_CA: {
    code: "FPT_CA",
    name: "FPT-CA Cloud",
    vendor: "Công ty Cổ phần Hệ thống Thông tin FPT (FPT IS)",
    description: "Chứng thư số công cộng và ký số đám mây FPT",
    isMock: false,
    supportedAuthTypes: ["PUSH_NOTIFICATION", "OTP_SMS"],
  },
  BKAV_CA: {
    code: "BKAV_CA",
    name: "BKAV eSigner",
    vendor: "Tập đoàn Công nghệ BKAV",
    description: "Chữ ký số từ xa bảo mật BKAV",
    isMock: false,
    supportedAuthTypes: ["OTP_APP", "USB_TOKEN"],
  },
  MOCK_SANDBOX: {
    code: "MOCK_SANDBOX",
    name: "Cổng Mô phỏng Kiểm thử [SANDBOX]",
    vendor: "Sky-Line Engineering Mock Provider",
    description: "Môi trường giả lập quy trình ký số độc lập dùng cho phát triển và kiểm thử",
    isMock: true,
    supportedAuthTypes: ["OTP_APP", "OTP_SMS"],
  },
};

// 2. Three-Tier Status Classification (Tách 3 nhóm trạng thái theo chuẩn)
// A. Trạng thái nội dung (Content Status)
export type DocumentContentStatus =
  | "DRAFT"                 // Nháp
  | "NOT_ELIGIBLE"          // Chưa đủ điều kiện
  | "READY_TO_SIGN"         // Sẵn sàng ký
  | "REVISION_REQUIRED";    // Có phiên bản mới cần ký lại

// B. Trạng thái yêu cầu ký (Signature Request Status)
export type SignatureRequestStatus =
  | "AWAITING_AUTH"             // Chờ xác thực
  | "PROCESSING"                // Đang xử lý
  | "SUCCESS"                   // Thành công (Đã ký số)
  | "FAILED"                    // Thất bại
  | "CANCELLED"                 // Đã hủy
  | "UNKNOWN_PENDING_RECONCILE"; // Chưa xác định, cần đối soát

// C. Trạng thái công bố (Publication Status)
export type DocumentPublicationStatus =
  | "UNPUBLISHED"  // Chưa công bố
  | "PUBLISHED"    // Đã công bố
  | "SUPERSEDED";  // Đã được thay thế

// 3. Form Types
export type SignableFormType =
  | "HO_SO_NANG_LUC"           // Hồ sơ năng lực học sinh K12
  | "PHIEU_DANH_GIA_MON_HOC"   // Phiếu nhận xét & đánh giá môn học định kỳ
  | "PHIEU_DANH_GIA_MAM_NON"   // Phiếu đánh giá phát triển Mầm non
  | "CAM_KET_HOC_TAP";         // Cam kết học tập & rèn luyện

export const FORM_TYPE_LABELS: Record<SignableFormType, string> = {
  HO_SO_NANG_LUC: "Hồ sơ Năng lực Học sinh",
  PHIEU_DANH_GIA_MON_HOC: "Phiếu Nhận xét & Đánh giá Môn học",
  PHIEU_DANH_GIA_MAM_NON: "Phiếu Đánh giá Phát triển Mầm non",
  CAM_KET_HOC_TAP: "Bản Cam kết Học tập & Rèn luyện",
};

// 4. Signer Roles
export type SignerRole = "GVBM" | "GVCN" | "TTCM" | "GDCS" | "ADMIN";

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  GVBM: "Giáo viên Bộ môn",
  GVCN: "Giáo viên Chủ nhiệm",
  TTCM: "Tổ trưởng Chuyên môn",
  GDCS: "Giám đốc Cơ sở / Ban Giám hiệu",
  ADMIN: "Quản trị viên Hệ thống",
};

// 5. Connection Status of Certificate
export type CertificateConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTED"
  | "EXPIRED"
  | "REVOKED";

export interface TeacherCertificateInfo {
  provider: DigitalSignatureProviderCode;
  connectionStatus: CertificateConnectionStatus;
  subjectDn: string | null;
  serialNumber: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  lastVerifiedAt: string | null;
  isMockCertificate?: boolean;
}

// 6. Visual Appearance
export interface VisualAppearanceData {
  appearanceType: "DRAWN" | "UPLOADED";
  appearanceVersion: number;
  visualAppearanceUrl: string; // Base64 PNG or static URL
  signatureRoleText?: string;
  teacherName: string;
  teacherCode: string;
  campusName?: string;
  updatedAt?: string;
}

// 7. Signing Request & Verification Payloads
export interface CreateSignRequestOptions {
  documentId: string;
  signerId: string;
  signerRole: SignerRole;
  signerName: string;
  provider: DigitalSignatureProviderCode;
  idempotencyKey?: string;
  otpCode?: string; // If 1-step confirm
  authMethod?: "OTP_APP" | "OTP_SMS" | "PUSH_NOTIFICATION";
}

export interface SignOperationResult {
  success: boolean;
  requestId: string;
  transactionId?: string;
  status: SignatureRequestStatus;
  message?: string;
  errorCode?: string;
  dataHash?: string;
  signatureValue?: string;
  certificateSerial?: string;
  certificateSubject?: string;
  certIssuer?: string;
  signedAt?: string;
  verificationResult?: {
    isValid: boolean;
    trustChainOk: boolean;
    notRevoked: boolean;
    hashMatched: boolean;
    timestamp: string;
    details?: string;
  };
  signedPdfPath?: string;
}

export interface BatchSignItemResult {
  documentId: string;
  documentCode: string;
  studentName: string;
  studentCode: string;
  className: string;
  success: boolean;
  status: SignatureRequestStatus;
  message?: string;
  requestId?: string;
}

export interface BatchSignResponse {
  totalRequested: number;
  totalSuccess: number;
  totalFailed: number;
  totalPendingReconcile: number;
  results: BatchSignItemResult[];
}
