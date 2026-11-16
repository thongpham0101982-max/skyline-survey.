import JSZip from "jszip"
import {
  SLC_ALLOWED_DOC_MIMES,
  SLC_ALLOWED_EXTENSIONS,
  SLC_ALLOWED_IMAGE_MIMES,
  SLC_ALLOWED_SKILL_PACKAGE_EXTENSIONS,
  SLC_FORBIDDEN_ARCHIVE_EXTENSIONS,
} from "./constants"

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

export function validateAttachmentMetadata(params: {
  fileName: string
  mimeType: string
  fileSizeBytes: number
  maxImageMb?: number
  maxDocMb?: number
}) {
  return validateUploadFile(
    {
      name: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.fileSizeBytes,
    },
    {
      maxImageSizeMb: params.maxImageMb,
      maxDocSizeMb: params.maxDocMb,
    }
  )
}

/**
 * Kiểm tra đường dẫn của một mục bên trong gói nén (.zip) để ngăn chặn Zip Slip / Path Traversal
 * và chặn hoàn toàn các tệp thực thi hoặc script.
 */
export function validateArchiveEntryPath(rawEntryPath: string): {
  valid: boolean
  normalizedPath?: string
  error?: string
} {
  if (!rawEntryPath || typeof rawEntryPath !== "string") {
    return { valid: false, error: "Đường dẫn tệp trong gói nén không hợp lệ." }
  }

  // Block null bytes
  if (rawEntryPath.includes("\0")) {
    return { valid: false, error: "Phát hiện ký tự null bất thường trong đường dẫn gói nén." }
  }

  const unified = rawEntryPath.replace(/\\/g, "/").trim()

  // Block absolute paths or Windows drive letters (e.g., /etc/passwd, \Windows, C:/...)
  if (
    unified.startsWith("/") ||
    rawEntryPath.trim().startsWith("\\") ||
    /^[a-zA-Z]:/.test(unified)
  ) {
    return {
      valid: false,
      error: `Từ chối đường dẫn tuyệt đối trong gói skill ("${rawEntryPath}"). Ngăn chặn ghi tệp ngoài thư mục cho phép.`,
    }
  }

  // Block parent directory traversal segments (.. or ../ or /..)
  const segments = unified.split("/")
  if (segments.some((seg) => seg === ".." || seg.includes(".."))) {
    return {
      valid: false,
      error: `Phát hiện đường dẫn vượt cấp thư mục ("${rawEntryPath}"). Gói tải lên bị từ chối vì lý do an toàn bảo mật.`,
    }
  }

  // Check file extension if not a directory
  if (!unified.endsWith("/")) {
    const fileName = segments[segments.length - 1] || ""
    const lowerFile = fileName.toLowerCase()

    // Reject hidden executable/config hooks like .git/hooks or package.json scripts
    if (segments.includes(".git") || segments.includes("node_modules")) {
      return {
        valid: false,
        error: `Gói skill không được chứa thư mục hệ thống hoặc phụ thuộc ("${rawEntryPath}").`,
      }
    }

    for (const badExt of SLC_FORBIDDEN_ARCHIVE_EXTENSIONS) {
      if (lowerFile.endsWith(badExt) || lowerFile.includes(`${badExt}.`)) {
        return {
          valid: false,
          error: `Gói skill chứa tệp script/thực thi không được phép ("${fileName}"). Hệ thống chỉ lưu trữ tài liệu hướng dẫn, không thực thi script.`,
        }
      }
    }
  }

  return { valid: true, normalizedPath: unified }
}

export interface SkillPackageInspectionResult {
  valid: boolean
  error?: string
  safeFileName?: string
  entryCount?: number
  fileList?: string[]
  extractedSkillDraft?: {
    name?: string
    description?: string
    purpose?: string
    aiSystemPrompt?: string
    usageGuide?: string
    samplePrompt?: string
    sampleOutput?: string
  }
  piiCheck?: {
    hasPii: boolean
    detectedItems: string[]
  }
}

/**
 * Kiểm tra gói Skill tải lên (.zip, .md, .json, .txt, .pdf, .docx):
 * - Chỉ lưu và kiểm tra như tài liệu; tuyệt đối KHÔNG tự thực thi script hoặc cài đặt phụ thuộc.
 * - Kiểm tra loại file, kích thước, cấu trúc gói và đường dẫn khi giải nén để ngăn ghi file ngoài thư mục cho phép.
 * - Tự động quét dữ liệu định danh học sinh (PII) trong nội dung gói.
 */
export async function inspectAndValidateSkillPackage(params: {
  fileName: string
  mimeType: string
  sizeBytes: number
  buffer: Buffer
  maxPackageSizeMb?: number
  knownStudents?: Array<{ fullName?: string; studentCode?: string }>
}): Promise<SkillPackageInspectionResult> {
  const maxMb = params.maxPackageSizeMb ?? 15
  if (params.sizeBytes <= 0) {
    return { valid: false, error: "Gói skill tải lên rỗng." }
  }
  if (params.sizeBytes > maxMb * 1024 * 1024) {
    return {
      valid: false,
      error: `Dung lượng gói skill vượt quá giới hạn tối đa ${maxMb} MB.`,
    }
  }

  const rawName = String(params.fileName || "")
  if (rawName.includes("..") || rawName.includes("/") || rawName.includes("\\")) {
    return {
      valid: false,
      error: "Tên tệp tải lên chứa ký tự đường dẫn không hợp lệ.",
    }
  }

  const safeName = sanitizeFileName(rawName)
  const lowerName = safeName.toLowerCase()
  const extMatch = lowerName.match(/\.[a-z0-9]+$/)
  const ext = extMatch ? extMatch[0] : ""

  for (const badExt of SLC_FORBIDDEN_ARCHIVE_EXTENSIONS) {
    if (lowerName.endsWith(badExt) || lowerName.includes(`${badExt}.`)) {
      return {
        valid: false,
        error: "Không cho phép tải lên tệp thực thi hoặc script làm gói skill.",
      }
    }
  }

  if (!SLC_ALLOWED_SKILL_PACKAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Định dạng gói skill (${ext || "không rõ"}) không hợp lệ. Chỉ chấp nhận: ${SLC_ALLOWED_SKILL_PACKAGE_EXTENSIONS.join(", ")}.`,
    }
  }

  // Case 1: .zip package -> inspect entries in-memory via JSZip without extracting to arbitrary paths
  if (ext === ".zip") {
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(params.buffer)
    } catch {
      return { valid: false, error: "Tệp .zip bị hỏng hoặc không đúng định dạng nén chuẩn." }
    }

    const entries = Object.keys(zip.files)
    if (entries.length === 0) {
      return { valid: false, error: "Gói .zip rỗng, không có tài liệu skill bên trong." }
    }
    if (entries.length > 40) {
      return {
        valid: false,
        error: "Gói .zip chứa quá nhiều tệp (tối đa 40 tệp tài liệu trong một gói skill).",
      }
    }

    const validFileList: string[] = []
    let extractedMarkdown = ""
    let extractedJsonText = ""
    let totalUncompressedBytes = 0
    const maxUncompressedBytes = 25 * 1024 * 1024 // 25MB anti-zip-bomb limit

    for (const entryName of entries) {
      const zipObj = zip.files[entryName]
      const pathCheck = validateArchiveEntryPath(entryName)
      if (!pathCheck.valid) {
        return { valid: false, error: pathCheck.error }
      }

      if (!zipObj.dir) {
        const normalized = pathCheck.normalizedPath!
        validFileList.push(normalized)

        const lowerEntry = normalized.toLowerCase()
        if (lowerEntry.endsWith("package.json")) {
          const pkgContent = await zipObj.async("string")
          totalUncompressedBytes += Buffer.byteLength(pkgContent, "utf8")
          try {
            const parsedPkg = JSON.parse(pkgContent)
            if (parsedPkg.scripts || parsedPkg.dependencies || parsedPkg.devDependencies) {
              return {
                valid: false,
                error:
                  "Gói skill không được phép chứa package.json có script thực thi hoặc yêu cầu cài đặt phụ thuộc (dependencies).",
              }
            }
          } catch {
            // ignore
          }
        } else if (
          lowerEntry.endsWith(".md") ||
          lowerEntry.endsWith(".txt") ||
          lowerEntry.endsWith(".json")
        ) {
          const textContent = await zipObj.async("string")
          totalUncompressedBytes += Buffer.byteLength(textContent, "utf8")
          if (totalUncompressedBytes > maxUncompressedBytes) {
            return {
              valid: false,
              error: "Tổng dung lượng giải nén của gói vượt ngưỡng an toàn (25 MB).",
            }
          }
          if (lowerEntry.endsWith(".md") || lowerEntry.endsWith(".txt")) {
            if (!extractedMarkdown || lowerEntry.includes("skill")) {
              extractedMarkdown = textContent
            }
          } else if (lowerEntry.endsWith(".json") && !extractedJsonText) {
            extractedJsonText = textContent
          }
        }
      }
    }

    const combinedText = `${extractedMarkdown}\n${extractedJsonText}`
    const piiScan = detectAndRedactStudentPii(combinedText, {
      knownStudents: params.knownStudents,
    })

    if (piiScan.hasPii) {
      return {
        valid: false,
        error: `Phát hiện dữ liệu nhận diện học sinh (${piiScan.detectedItems.slice(0, 3).join(", ")}) trong gói skill tải lên. Vui lòng ẩn danh trước khi tải lên.`,
        piiCheck: {
          hasPii: true,
          detectedItems: piiScan.detectedItems,
        },
      }
    }

    const draft = parseSkillDraftFromText(extractedMarkdown, extractedJsonText, rawName)
    return {
      valid: true,
      safeFileName: `${Date.now()}_${safeName}`,
      entryCount: validFileList.length,
      fileList: validFileList,
      extractedSkillDraft: draft,
      piiCheck: { hasPii: false, detectedItems: [] },
    }
  }

  // Case 2: Plain text / Markdown / JSON skill file
  if (ext === ".md" || ext === ".txt" || ext === ".json") {
    const textContent = params.buffer.toString("utf-8")
    const piiScan = detectAndRedactStudentPii(textContent, {
      knownStudents: params.knownStudents,
    })
    if (piiScan.hasPii) {
      return {
        valid: false,
        error: `Phát hiện dữ liệu nhận diện học sinh (${piiScan.detectedItems.slice(0, 3).join(", ")}) trong tệp skill. Vui lòng loại bỏ thông tin học sinh trước khi tải lên.`,
        piiCheck: {
          hasPii: true,
          detectedItems: piiScan.detectedItems,
        },
      }
    }

    const draft = parseSkillDraftFromText(
      ext === ".json" ? "" : textContent,
      ext === ".json" ? textContent : "",
      rawName
    )
    return {
      valid: true,
      safeFileName: `${Date.now()}_${safeName}`,
      entryCount: 1,
      fileList: [safeName],
      extractedSkillDraft: draft,
      piiCheck: { hasPii: false, detectedItems: [] },
    }
  }

  // Case 3: PDF / DOCX reference package
  return {
    valid: true,
    safeFileName: `${Date.now()}_${safeName}`,
    entryCount: 1,
    fileList: [safeName],
    piiCheck: { hasPii: false, detectedItems: [] },
  }
}

function parseSkillDraftFromText(
  markdownText: string,
  jsonText: string,
  fallbackFileName: string
): SkillPackageInspectionResult["extractedSkillDraft"] {
  if (jsonText.trim()) {
    try {
      const obj = JSON.parse(jsonText)
      return {
        name: sanitizeRichText(obj.name || obj.title || fallbackFileName.replace(/\.[a-z0-9]+$/i, "")),
        description: sanitizeRichText(obj.description || obj.summary || ""),
        purpose: sanitizeRichText(obj.purpose || ""),
        aiSystemPrompt: sanitizeRichText(obj.aiSystemPrompt || obj.prompt || obj.instructions || ""),
        usageGuide: sanitizeRichText(obj.usageGuide || ""),
        samplePrompt: sanitizeRichText(obj.samplePrompt || ""),
        sampleOutput: sanitizeRichText(obj.sampleOutput || ""),
      }
    } catch {
      // fall through
    }
  }

  if (markdownText.trim()) {
    const lines = markdownText.split(/\r?\n/)
    const headingLine = lines.find((l) => l.trim().startsWith("# "))
    const title = headingLine
      ? headingLine.replace(/^#+\s*/, "").trim()
      : fallbackFileName.replace(/\.[a-z0-9]+$/i, "")
    return {
      name: sanitizeRichText(title),
      description: sanitizeRichText(lines.slice(0, 6).join(" ").slice(0, 300)),
      aiSystemPrompt: sanitizeRichText(markdownText.slice(0, 4000)),
      usageGuide: "Tài liệu hướng dẫn được trích xuất từ gói skill tải lên.",
    }
  }

  return undefined
}

/**
 * Quét và ẩn danh dữ liệu nhận diện học sinh (PII) trên bài đăng tường, ví dụ công khai và gói tải xuống:
 * - Mã học sinh (VD: HS2024001, STU-10293, mã số học sinh 8-12 chữ số đi kèm nhãn Mã HS/MSHS).
 * - Số điện thoại cá nhân, email học sinh, CCCD/CMND.
 * - Tên học sinh cụ thể khi đối chiếu với danh sách lớp.
 */
export function detectAndRedactStudentPii(
  rawText?: string | null,
  options?: {
    knownStudents?: Array<{ fullName?: string | null; studentCode?: string | null }>
  }
): {
  hasPii: boolean
  detectedItems: string[]
  redactedText: string
} {
  if (!rawText) {
    return { hasPii: false, detectedItems: [], redactedText: "" }
  }

  let redacted = String(rawText)
  const detected = new Set<string>()

  // 1. Student Code patterns: HS20230123, MSHS: 20240192, Mã HS: 102938, STU_12345
  const studentCodeRegex = /\b(?:MSHS|M[aã]\s*HS|HS|STU|STUDENT[_-\s]*ID)\s*[:#-]?\s*([A-Z0-9_-]{4,14})\b/gi
  redacted = redacted.replace(studentCodeRegex, (match) => {
    detected.add(`Mã HS (${match.trim()})`)
    return "[MÃ_HỌC_SINH_ĐÃ_ẨN]"
  })

  // 2. Explicit Vietnamese student name markers in examples/posts: "Học sinh: Nguyễn Văn A", "Em Trần Thị B (Lớp ...)"
  const labeledStudentNameRegex =
    /\b(?:Học sinh|Họ\s*(?:và\s*)?tên\s*(?:HS|học sinh)|HS|Em)\s*[:#-]?\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})\b/g
  redacted = redacted.replace(labeledStudentNameRegex, (match, fullName) => {
    detected.add(`Tên HS (${fullName.trim()})`)
    return "Học sinh [ĐÃ_ẨN_DANH]"
  })

  // 3. Phone numbers (10-11 digits starting with 0 or +84)
  const phoneRegex = /\b(?:\+84|0)(?:3|5|7|8|9)\d{8}\b/g
  redacted = redacted.replace(phoneRegex, (match) => {
    detected.add(`SĐT (${match})`)
    return "[SĐT_ĐÃ_ẨN]"
  })

  // 4. Known students from class roster (if provided)
  if (options?.knownStudents && options.knownStudents.length > 0) {
    for (const stu of options.knownStudents) {
      const code = stu.studentCode?.trim()
      if (code && code.length >= 3 && redacted.includes(code)) {
        detected.add(`Mã HS (${code})`)
        redacted = redacted.split(code).join("[MÃ_HỌC_SINH_ĐÃ_ẨN]")
      }
      const name = stu.fullName?.trim()
      if (name && name.length >= 5) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const nameRegex = new RegExp(`\\b${escaped}\\b`, "gi")
        if (nameRegex.test(redacted)) {
          detected.add(`Tên HS (${name})`)
          redacted = redacted.replace(nameRegex, "[HỌC_SINH_ĐÃ_ẨN_DANH]")
        }
      }
    }
  }

  return {
    hasPii: detected.size > 0,
    detectedItems: Array.from(detected),
    redactedText: redacted,
  }
}

/**
 * Làm sạch dữ liệu đầu vào trước khi đưa vào AI (chống Prompt Injection):
 * Coi nội dung bài viết, tài liệu và gói skill là dữ liệu không tin cậy.
 */
export function sanitizeUntrustedAiInput(rawInput?: string | null, maxLen = 6000): string {
  if (!rawInput) return ""
  let cleaned = sanitizeRichText(rawInput)

  // Neutralize common prompt injection / jailbreak directives
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
    /bỏ\s+qua\s+(tất\s+cả\s+)?(hướng\s+dẫn|quy\s+tắc|yêu\s+cầu)\s+(trên|trước\s+đó)/gi,
    /system\s*prompt\s*:/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /tiết\s+lộ\s+khóa\s+api/gi,
    /reveal\s+(your\s+)?(api\s+key|system\s+prompt)/gi,
  ]

  for (const pat of injectionPatterns) {
    cleaned = cleaned.replace(pat, "[NỘI_DUNG_ĐIỀU_KHIỂN_BỊ_CHẶN]")
  }

  return cleaned.slice(0, maxLen)
}

// In-memory rate limiter for AI runs & interactive mutations
const rateLimitStore = new Map<string, number[]>()

export function checkSlcRateLimit(
  bucketKey: string,
  maxRequests = 15,
  windowMs = 60_000,
  nowMs = Date.now()
): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
  const history = (rateLimitStore.get(bucketKey) || []).filter((ts) => nowMs - ts < windowMs)
  if (history.length >= maxRequests) {
    const oldest = history[0] || nowMs
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000))
    rateLimitStore.set(bucketKey, history)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }
  history.push(nowMs)
  rateLimitStore.set(bucketKey, history)
  return { allowed: true, remaining: maxRequests - history.length }
}

