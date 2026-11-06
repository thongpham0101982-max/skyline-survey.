import crypto from "crypto"
import { prisma } from "@/lib/db"
import { ensureApiIntegrationTables } from "@/lib/api-auth"

export interface HandoverRecord {
  id: string
  token: string
  applicationId: string
  appName?: string | null
  recipientEmail?: string | null
  keyId: string
  keyPrefix: string
  encryptedKey: string
  salt: string
  iv: string
  authTag: string
  passcodeHash: string
  expiresAt: Date | string
  claimedAt?: Date | string | null
  attempts: number
  maxAttempts: number
  createdAt: Date | string
}

/**
 * Sinh mật khẩu bảo vệ bàn giao ngẫu nhiên (6 chữ số hoặc định dạng SL-XXXXXX)
 */
export function generateDeliveryPasscode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `SL-${digits}`
}

/**
 * Mã hóa khóa bí mật bằng thuật toán AES-256-GCM với mật khẩu bàn giao
 */
export function encryptApiKeyWithPasscode(rawKey: string, passcode: string) {
  const cleanPass = passcode.trim()
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(cleanPass, salt, 32)
  const iv = crypto.randomBytes(12) // GCM 96-bit IV chuẩn
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  let encrypted = cipher.update(rawKey, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag()

  const passcodeHash = crypto.createHash("sha256").update(cleanPass).digest("hex")

  return {
    encryptedKey: encrypted,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    passcodeHash,
  }
}

/**
 * Giải mã khóa bí mật bằng mật mã bàn giao
 */
export function decryptApiKeyWithPasscode(
  encryptedHex: string,
  passcode: string,
  saltHex: string,
  ivHex: string,
  authTagHex: string
): { success: boolean; rawKey?: string; error?: string } {
  try {
    const cleanPass = passcode.trim()
    const salt = Buffer.from(saltHex, "hex")
    const key = crypto.scryptSync(cleanPass, salt, 32)
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return { success: true, rawKey: decrypted }
  } catch {
    return { success: false, error: "Mật khẩu bảo vệ không chính xác hoặc gói bàn giao đã bị thay đổi" }
  }
}

/**
 * Khởi tạo gói bàn giao bảo mật và lưu vào CSDL
 */
export async function createHandoverPackage(params: {
  applicationId: string
  appName: string
  recipientEmail?: string | null
  keyId: string
  keyPrefix: string
  rawKey: string
  passcode: string
  hoursValid?: number
}) {
  await ensureApiIntegrationTables()

  const {
    applicationId,
    appName,
    recipientEmail,
    keyId,
    keyPrefix,
    rawKey,
    passcode,
    hoursValid = 72,
  } = params

  const id = `hnd_${crypto.randomUUID()}`
  const token = `sec_${crypto.randomBytes(24).toString("hex")}`
  const enc = encryptApiKeyWithPasscode(rawKey, passcode)
  const expiresAt = new Date(Date.now() + hoursValid * 3600 * 1000)

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `
    INSERT INTO "api_handovers" (
      "id", "token", "applicationId", "appName", "recipientEmail",
      "keyId", "keyPrefix", "encryptedKey", "salt", "iv",
      "authTag", "passcodeHash", "expiresAt", "attempts", "maxAttempts"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 5)
  `,
    id,
    token,
    applicationId,
    appName,
    recipientEmail || null,
    keyId,
    keyPrefix,
    enc.encryptedKey,
    enc.salt,
    enc.iv,
    enc.authTag,
    enc.passcodeHash,
    expiresAt.toISOString()
  )

  return {
    id,
    token,
    passcode: passcode.trim(),
    expiresAt,
    handoverUrl: `/handover/${token}`,
  }
}

/**
 * Xác thực mật khẩu và giải mã khóa API từ token bàn giao
 */
export async function verifyAndClaimHandover(token: string, passcode: string) {
  await ensureApiIntegrationTables()
  const pAny = prisma as any

  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "api_handovers" WHERE "token" = ? LIMIT 1`,
    token
  )

  if (!rows || rows.length === 0) {
    return { ok: false, error: "Liên kết bàn giao không tồn tại hoặc đã hết hạn", statusCode: 404 }
  }

  const record = rows[0]

  // Kiểm tra thời hạn
  const now = new Date()
  const exp = new Date(record.expiresAt)
  if (now > exp) {
    return { ok: false, error: "Gói bàn giao này đã hết hạn hiệu lực bảo mật (vượt quá thời hạn)", statusCode: 410 }
  }

  // Kiểm tra số lần thử sai (Rate limit brute force)
  if (record.attempts >= record.maxAttempts) {
    return {
      ok: false,
      error: `Gói bàn giao đã bị tạm khóa do nhập sai mật khẩu quá ${record.maxAttempts} lần. Vui lòng liên hệ Quản trị viên để cấp lại mã mới.`,
      statusCode: 429,
    }
  }

  // Thử giải mã
  const decResult = decryptApiKeyWithPasscode(
    record.encryptedKey,
    passcode,
    record.salt,
    record.iv,
    record.authTag
  )

  if (!decResult.success) {
    // Tăng số lần thử sai
    const newAttempts = record.attempts + 1
    await pAny.$executeRawUnsafe(
      `UPDATE "api_handovers" SET "attempts" = ? WHERE "id" = ?`,
      newAttempts,
      record.id
    )

    const remaining = record.maxAttempts - newAttempts
    return {
      ok: false,
      error: `Mật khẩu bàn giao không chính xác. Bạn còn ${remaining} lần thử trước khi liên kết bị khóa.`,
      attemptsLeft: remaining,
      statusCode: 401,
    }
  }

  // Giải mã thành công: Cập nhật claimedAt và reset attempts
  await pAny.$executeRawUnsafe(
    `UPDATE "api_handovers" SET "claimedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    record.id
  )

  return {
    ok: true,
    rawKey: decResult.rawKey!,
    appName: record.appName,
    keyId: record.keyId,
    keyPrefix: record.keyPrefix,
    recipientEmail: record.recipientEmail,
    claimedAt: new Date().toISOString(),
  }
}
