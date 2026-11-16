import crypto from "crypto";
import { generatePreschoolApprovalToken } from "@/lib/preschool-approval-service";

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "skyline-k12-approval-secret-key-2026";

export type K12QuickApproveAction =
  | "DAT"
  | "DAT_CAM_KET"
  | "HOC_THU"
  | "KHONG_DAT"
  | "KHONG_DAT_KTL";

/**
 * Generate secure HMAC token for 1-click K-12 email approval
 */
export function generateK12ApprovalToken(
  studentId: string,
  action: string,
  email: string = "gdcs@skylineschool.edu.vn"
): string {
  const normalizedEmail = (email || "gdcs@skylineschool.edu.vn").trim().toLowerCase();
  return crypto
    .createHmac("sha256", SECRET)
    .update(`k12:${studentId}:${action}:${normalizedEmail}`)
    .digest("hex");
}

/**
 * Verify HMAC token for K-12 email approval
 */
export function verifyK12ApprovalToken(
  studentId: string,
  action: string,
  email: string,
  token: string
): boolean {
  if (!token || !studentId || !action) return false;
  const expectedToken = generateK12ApprovalToken(studentId, action, email);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Generate secure HMAC token for 1-click Batch approval via email
 */
export function generateBatchApprovalToken(
  periodId: string,
  batchId: string,
  isPreschool: boolean,
  email: string = "gdcs@skylineschool.edu.vn"
): string {
  const normalizedEmail = (email || "gdcs@skylineschool.edu.vn").trim().toLowerCase();
  return crypto
    .createHmac("sha256", SECRET)
    .update(`batch:${isPreschool ? "mn" : "k12"}:${periodId}:${batchId}:${normalizedEmail}`)
    .digest("hex");
}

export function verifyBatchApprovalToken(
  periodId: string,
  batchId: string,
  isPreschool: boolean,
  email: string,
  token: string
): boolean {
  if (!token || !periodId) return false;
  const expectedToken = generateBatchApprovalToken(periodId, batchId, isPreschool, email);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Build 1-click approval URLs for a student row in email (supports both K-12 and Preschool)
 */
export function buildStudentQuickApproveUrls(params: {
  studentId: string;
  isPreschool?: boolean;
  baseUrl: string;
  recipientEmail?: string;
  periodId?: string | null;
  batchId?: string | null;
}) {
  const {
    studentId,
    isPreschool = false,
    baseUrl,
    recipientEmail = "gdcs@skylineschool.edu.vn",
    periodId = "",
    batchId = ""
  } = params;

  const cleanBase = (baseUrl || "https://ssm.skylineschool.edu.vn").replace(/\/$/, "");
  const normEmail = (recipientEmail || "gdcs@skylineschool.edu.vn").trim().toLowerCase();

  if (isPreschool) {
    const tokenMienHt = generatePreschoolApprovalToken(studentId, "APPROVE_MIEN_HT", normEmail);
    const tokenHocThu = generatePreschoolApprovalToken(studentId, "APPROVE_HOC_THU", normEmail);
    const tokenKhongDat = generatePreschoolApprovalToken(studentId, "KHONG_DAT", normEmail);

    const approveDatUrl = `${cleanBase}/api/admin/quick-approve/preschool?studentId=${encodeURIComponent(studentId)}&action=APPROVE_MIEN_HT&email=${encodeURIComponent(normEmail)}&token=${tokenMienHt}&confirm=1`;
    const approveCamKetOrHocThuUrl = `${cleanBase}/api/admin/quick-approve/preschool?studentId=${encodeURIComponent(studentId)}&action=APPROVE_HOC_THU&email=${encodeURIComponent(normEmail)}&token=${tokenHocThu}&confirm=1`;
    const approveKhongDatUrl = `${cleanBase}/api/admin/quick-approve/preschool?studentId=${encodeURIComponent(studentId)}&action=KHONG_DAT&email=${encodeURIComponent(normEmail)}&token=${tokenKhongDat}`;
    const portalUrl = `${cleanBase}/admin/xet-duyet-ket-qua?tab=mam-non${periodId ? `&periodId=${encodeURIComponent(periodId)}` : ""}${batchId ? `&batchId=${encodeURIComponent(batchId)}` : ""}&studentId=${encodeURIComponent(studentId)}&autoOpen=true`;

    return {
      approveDatUrl,
      approveCamKetOrHocThuUrl,
      approveKhongDatUrl,
      portalUrl,
      primaryLabel: "✓ Duyệt Đạt",
      secondaryLabel: "✦ Học thử",
      rejectLabel: "✕ Không đạt"
    };
  }

  const tokenDat = generateK12ApprovalToken(studentId, "DAT", normEmail);
  const tokenCamKet = generateK12ApprovalToken(studentId, "DAT_CAM_KET", normEmail);
  const tokenKhongDat = generateK12ApprovalToken(studentId, "KHONG_DAT", normEmail);

  const approveDatUrl = `${cleanBase}/api/admin/quick-approve/k12?studentId=${encodeURIComponent(studentId)}&action=DAT&email=${encodeURIComponent(normEmail)}&token=${tokenDat}&confirm=1`;
  const approveCamKetOrHocThuUrl = `${cleanBase}/api/admin/quick-approve/k12?studentId=${encodeURIComponent(studentId)}&action=DAT_CAM_KET&email=${encodeURIComponent(normEmail)}&token=${tokenCamKet}`;
  const approveKhongDatUrl = `${cleanBase}/api/admin/quick-approve/k12?studentId=${encodeURIComponent(studentId)}&action=KHONG_DAT&email=${encodeURIComponent(normEmail)}&token=${tokenKhongDat}`;
  const portalUrl = `${cleanBase}/admin/xet-duyet-ket-qua?tab=k12${periodId ? `&periodId=${encodeURIComponent(periodId)}` : ""}${batchId ? `&batchId=${encodeURIComponent(batchId)}` : ""}&studentId=${encodeURIComponent(studentId)}`;

  return {
    approveDatUrl,
    approveCamKetOrHocThuUrl,
    approveKhongDatUrl,
    portalUrl,
    primaryLabel: "✓ Duyệt Đạt",
    secondaryLabel: "⚠ Cam kết",
    rejectLabel: "✕ Không đạt"
  };
}
