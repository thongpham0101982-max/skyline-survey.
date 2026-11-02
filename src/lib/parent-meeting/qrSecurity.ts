import crypto from "crypto";
import QRCode from "qrcode";

export interface QrTokenPayload {
    sid: string; // qrSessionId
    mid: string; // meetingId
    cid: string; // classId
    stid: string; // internal studentId (cuid, never studentCode)
    pid: string; // internal parentId
    iat: number; // issued at (epoch ms)
    exp: number; // expires at (epoch ms)
    nonce: string; // random 16-byte hex
}

export type QrVerifyResult =
    | {
          valid: true;
          payload: QrTokenPayload;
          tokenHash: string;
      }
    | {
          valid: false;
          errorCode:
              | "INVALID_TOKEN_FORMAT"
              | "INVALID_SIGNATURE"
              | "TOKEN_EXPIRED"
              | "WRONG_MEETING";
          messageVi: string;
          messageEn: string;
      };

function getQrSigningSecret(): string {
    return (
        process.env.PARENT_MEETING_QR_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.AUTH_SECRET ||
        "ssm-skyline-parent-meeting-qr-hmac-secret-v1"
    );
}

export function hashQrToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRandomNonce(): string {
    return crypto.randomBytes(16).toString("hex");
}

/**
 * Generates a cryptographically signed QR token bound to meetingId, classId, studentId, parentId, and expiration.
 * Never embeds raw studentCode in the token.
 */
export function signParentMeetingQrToken(params: {
    sessionId: string;
    meetingId: string;
    classId: string;
    studentId: string;
    parentId: string;
    expiresAt: Date;
    issuedAt?: Date;
    nonce?: string;
}): { qrToken: string; tokenHash: string; nonce: string; payload: QrTokenPayload } {
    const nonce = params.nonce || generateRandomNonce();
    const iat = (params.issuedAt || new Date()).getTime();
    const exp = params.expiresAt.getTime();

    const payload: QrTokenPayload = {
        sid: params.sessionId,
        mid: params.meetingId,
        cid: params.classId,
        stid: params.studentId,
        pid: params.parentId,
        iat,
        exp,
        nonce,
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const secret = getQrSigningSecret();
    const signatureB64 = crypto
        .createHmac("sha256", secret)
        .update(`pmqr_v1.${payloadB64}`)
        .digest("base64url");

    const qrToken = `pmqr_v1.${payloadB64}.${signatureB64}`;
    const tokenHash = hashQrToken(qrToken);

    return { qrToken, tokenHash, nonce, payload };
}

/**
 * Verifies the cryptographic signature, expiration time, and target meetingId of a scanned QR token.
 */
export function verifyParentMeetingQrToken(
    rawToken: string,
    expectedMeetingId?: string,
    referenceNow: Date = new Date()
): QrVerifyResult {
    if (!rawToken || typeof rawToken !== "string") {
        return {
            valid: false,
            errorCode: "INVALID_TOKEN_FORMAT",
            messageVi: "Mã QR không hợp lệ hoặc bị trống.",
            messageEn: "Invalid or empty QR token.",
        };
    }

    const trimmed = rawToken.trim();
    const parts = trimmed.split(".");
    if (parts.length !== 3 || parts[0] !== "pmqr_v1") {
        return {
            valid: false,
            errorCode: "INVALID_TOKEN_FORMAT",
            messageVi: "Định dạng mã QR không thuộc hệ thống Họp Phụ huynh SSM.",
            messageEn: "QR code format is not recognized by SSM Digital Parent Meeting.",
        };
    }

    const [, payloadB64, providedSigB64] = parts;
    const secret = getQrSigningSecret();
    const expectedSigB64 = crypto
        .createHmac("sha256", secret)
        .update(`pmqr_v1.${payloadB64}`)
        .digest("base64url");

    const providedBuf = Buffer.from(providedSigB64, "utf8");
    const expectedBuf = Buffer.from(expectedSigB64, "utf8");

    if (
        providedBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
        return {
            valid: false,
            errorCode: "INVALID_SIGNATURE",
            messageVi: "Chữ ký bảo mật của mã QR không hợp lệ hoặc đã bị can thiệp.",
            messageEn: "QR cryptographic signature is invalid or tampered with.",
        };
    }

    let payload: QrTokenPayload;
    try {
        payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    } catch {
        return {
            valid: false,
            errorCode: "INVALID_TOKEN_FORMAT",
            messageVi: "Không thể giải mã thông tin phiên QR.",
            messageEn: "Unable to decode QR session payload.",
        };
    }

    if (!payload.sid || !payload.mid || !payload.cid || !payload.stid || !payload.pid || !payload.exp) {
        return {
            valid: false,
            errorCode: "INVALID_TOKEN_FORMAT",
            messageVi: "Dữ liệu phiên QR không đầy đủ.",
            messageEn: "Incomplete QR session payload.",
        };
    }

    if (expectedMeetingId && payload.mid !== expectedMeetingId) {
        return {
            valid: false,
            errorCode: "WRONG_MEETING",
            messageVi: "Mã QR này được cấp cho một cuộc họp khác, không thuộc cuộc họp đang điểm danh.",
            messageEn: "This QR code belongs to a different meeting.",
        };
    }

    if (referenceNow.getTime() > payload.exp) {
        return {
            valid: false,
            errorCode: "TOKEN_EXPIRED",
            messageVi: "Mã QR đã hết thời hạn hiệu lực. Phụ huynh vui lòng làm mới mã QR hoặc giáo viên điểm danh thủ công.",
            messageEn: "This QR code has expired. Please refresh the QR code or use manual check-in.",
        };
    }

    return {
        valid: true,
        payload,
        tokenHash: hashQrToken(trimmed),
    };
}

/**
 * Renders a high-contrast Data URL QR image suitable for mobile screens.
 */
export async function generateQrCodeDataUrl(qrToken: string): Promise<string> {
    return QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 340,
        color: {
            dark: "#003B3A", // Sky-Line Deep Pine
            light: "#FFFFFF",
        },
    });
}
