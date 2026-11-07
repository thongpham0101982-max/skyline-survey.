import { SLC_ALLOWED_DOC_MIMES, SLC_ALLOWED_EXTENSIONS, SLC_ALLOWED_IMAGE_MIMES } from "./constants"

/**
 * Làm sạch văn bản / rich text, loại bỏ hoàn toàn thẻ script, iframe, object, embed,
 * thuộc tính sự kiện on*, và các giao thức nguy hiểm (javascript:, vbscript:, data:text/html).
 */
export function sanitizeRichText(input?: string | null): string {
  if (!input) return ""
  let text = String(input)

  // Remove script, iframe, object, embed, form, style, meta, link tags and their contents
  text = text.replace(/<\s*(script|iframe|object|embed|applet|form|style|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
  text = text.replace(/<\s*(script|iframe|object|embed|applet|form|style|meta|link|base)[^>]*\/?>/gi, "")

  // Remove inline event handlers (onload, onerror, onclick, etc.)
  text = text.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")

  // Neutralize dangerous URI schemes in href/src/action
  text = text.replace(/(href|src|action|xlink:href)\s*=\s*["']?\s*(javascript|vbscript|data\s*:\s*text\/html)[^"'\s>]*/gi, '$1="#"')
  text = text.replace(/javascript\s*:/gi, "blocked:")
  text = text.replace(/vbscript\s*:/gi, "blocked:")
  text = text.replace(/data\s*:\s*text\/html/gi, "blocked:")

  return text.trim()
}

/**
 * Kiểm tra an toàn URL bên ngoài và chống SSRF (chặn localhost, private IPv4/IPv6, metadata IP, file://).
 */
export function validateSafeExternalUrl(
  rawUrl?: string | null,
  options: { requireHttps?: boolean } = { requireHttps: false }
): { valid: boolean; url?: string; error?: string } {
  if (!rawUrl || !String(rawUrl).trim()) {
    return { valid: false, error: "Liên kết không được để trống." }
  }

  const trimmed = String(rawUrl).trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, error: "Định dạng liên kết URL không hợp lệ." }
  }

  const protocol = parsed.protocol.toLowerCase()
  if (options.requireHttps && protocol !== "https:") {
    return { valid: false, error: "Liên kết dùng thử sản phẩm bắt buộc sử dụng giao thức bảo mật HTTPS (https://)." }
  }
  if (protocol !== "https:" && protocol !== "http:") {
    return { valid: false, error: "Chỉ cho phép liên kết HTTP hoặc HTTPS hợp lệ." }
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (!hostname) {
    return { valid: false, error: "Tên miền liên kết không hợp lệ." }
  }

  // Block localhost and internal hostnames
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal"
  ) {
    return { valid: false, error: "Không cho phép liên kết trỏ tới máy chủ nội bộ hoặc địa chỉ cục bộ (SSRF protection)." }
  }

  // Check IPv4 private / loopback / link-local ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number)
    if (octets.some((o) => o < 0 || o > 255)) {
      return { valid: false, error: "Địa chỉ IP trong liên kết không hợp lệ." }
    }
    const [a, b] = octets
    const isPrivateOrReserved =
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224

    if (isPrivateOrReserved) {
      return { valid: false, error: "Không cho phép liên kết tới dải IP nội bộ hoặc IP đặc biệt (SSRF protection)." }
    }
  }

  // Check IPv6 private / link-local / ULA ranges
  if (hostname.includes(":")) {
    const normV6 = hostname.toLowerCase()
    if (
      normV6 === "::" ||
      normV6 === "::1" ||
      normV6.startsWith("fc") ||
      normV6.startsWith("fd") ||
      normV6.startsWith("fe80") ||
      normV6.startsWith("::ffff:127.") ||
      normV6.startsWith("::ffff:10.") ||
      normV6.startsWith("::ffff:192.168.") ||
      normV6.startsWith("::ffff:169.254.")
    ) {
      return { valid: false, error: "Không cho phép liên kết tới địa chỉ IPv6 nội bộ (SSRF protection)." }
    }
  }

  return { valid: true, url: parsed.toString() }
}

/**
 * Chuẩn hóa tên tệp an toàn, loại bỏ path traversal và đuôi thực thi nguy hiểm.
 */
export function sanitizeFileName(rawName: string): string {
  const base = String(rawName || "attachment")
    .replace(/\\/g, "/")
    .split("/")
    .pop() || "attachment"

  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")

  return cleaned || "attachment.bin"
}

export interface FileValidationConfig {
  maxImageSizeMb?: number
  maxDocSizeMb?: number
  allowedMimeTypes?: string[]
}

/**
 * Kiểm tra tệp tải lên phía server: MIME allowlist, extension allowlist, dung lượng tối đa.
 * Không cho phép mã thực thi hoặc ứng dụng tải lên chạy trực tiếp.
 */
export function validateUploadFile(
  file: { name: string; mimeType: string; sizeBytes: number },
  config: FileValidationConfig = {}
): {
  valid: boolean
  attachmentType?: "IMAGE" | "DOCUMENT"
  safeFileName?: string
  error?: string
} {
  const maxImageMb = config.maxImageSizeMb ?? 10
  const maxDocMb = config.maxDocSizeMb ?? 25
  const allowedMimes = config.allowedMimeTypes ?? [...SLC_ALLOWED_IMAGE_MIMES, ...SLC_ALLOWED_DOC_MIMES]

  const safeName = sanitizeFileName(file.name)
  const lowerName = safeName.toLowerCase()
  const extMatch = lowerName.match(/\.[a-z0-9]+$/)
  const ext = extMatch ? extMatch[0] : ""

  // Block dangerous double extensions or executable extensions
  const forbiddenPattern = /\.(exe|bat|cmd|sh|ps1|vbs|js|mjs|cjs|ts|html|htm|svg|php|py|jar|msi|dll|scr|com)(\.|$)/i
  if (forbiddenPattern.test(lowerName)) {
    return {
      valid: false,
      error: "Không cho phép tải lên tệp mã nguồn, script, HTML/SVG hoặc tệp thực thi.",
    }
  }

  if (!SLC_ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Định dạng đuôi tệp (${ext || "không xác định"}) không nằm trong danh mục cho phép (${SLC_ALLOWED_EXTENSIONS.join(", ")}).`,
    }
  }

  const mime = String(file.mimeType || "").toLowerCase().trim()
  if (!allowedMimes.includes(mime)) {
    return {
      valid: false,
      error: `Loại tệp (${mime || "không rõ"}) không nằm trong danh sách cho phép.`,
    }
  }

  if (file.sizeBytes <= 0) {
    return { valid: false, error: "Tệp tải lên rỗng hoặc không hợp lệ." }
  }

  const isImage = SLC_ALLOWED_IMAGE_MIMES.includes(mime)
  const maxBytes = (isImage ? maxImageMb : maxDocMb) * 1024 * 1024

  if (file.sizeBytes > maxBytes) {
    return {
      valid: false,
      error: isImage
        ? `Dung lượng ảnh vượt quá giới hạn tối đa ${maxImageMb} MB.`
        : `Dung lượng tài liệu vượt quá giới hạn tối đa ${maxDocMb} MB.`,
    }
  }

  return {
    valid: true,
    attachmentType: isImage ? "IMAGE" : "DOCUMENT",
    safeFileName: `${Date.now()}_${safeName}`,
  }
}
