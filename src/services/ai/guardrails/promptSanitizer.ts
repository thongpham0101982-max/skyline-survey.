/**
 * Security Guardrails: Prompt Sanitizer & PII Masker
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /bỏ\s+qua\s+(toàn\s+bộ\s+)?(chỉ\s+thị|hướng\s+dẫn)\s+trước/i,
  /you\s+are\s+now\s+(an?\s+)?admin/i,
  /bây\s+giờ\s+bạn\s+là\s+quản\s+trị\s+viên/i,
  /select\s+.*\s+from\s+user/i,
  /drop\s+table/i,
  /reveal\s+system\s+prompt/i,
  /tiết\s+lộ\s+system\s+prompt/i
];

export interface SanitizationResult {
  isSafe: boolean;
  cleanText: string;
  violationReason?: string;
}

export function sanitizePrompt(text: string): SanitizationResult {
  if (!text) return { isSafe: true, cleanText: "" };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        cleanText: "",
        violationReason: "Yêu cầu vi phạm chính sách an toàn thông tin (Phát hiện Prompt Injection)."
      };
    }
  }

  // Remove potential script tags
  const sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();

  return { isSafe: true, cleanText: sanitized };
}

export function maskPII(text: string): string {
  if (!text) return "";

  // Mask Vietnamese Phone numbers (e.g. 0905123456 -> 0905***456)
  const phoneRegex = /\b(0[3|5|7|8|9]\d)(\d{3})(\d{3})\b/g;
  let masked = text.replace(phoneRegex, "$1***$3");

  // Mask Emails (e.g. example@gmail.com -> e***e@gmail.com)
  const emailRegex = /\b([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*([a-zA-Z0-9_.+-])@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g;
  masked = masked.replace(emailRegex, "$1***$2@$3");

  return masked;
}
