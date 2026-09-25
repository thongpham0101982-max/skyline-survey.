/**
 * Tiện ích chuẩn hóa Họ và Tên theo quy chuẩn tiếng Việt và quốc tế:
 * - Tự động loại bỏ các khoảng trắng dư thừa ở đầu, cuối và giữa các từ.
 * - Định dạng viết hoa chữ cái đầu mỗi từ (Title Case / Proper Case), các ký tự còn lại viết thường.
 * - Hỗ trợ đầy đủ bộ ký tự Unicode tiếng Việt có dấu (Ă, Â, Đ, Ê, Ô, Ơ, Ư...).
 * - Hỗ trợ các tên ghép có dấu gạch ngang (ví dụ: Jean-Luc, Mai-Anh) hoặc dấu nháy (ví dụ: O'Connor).
 */

export function normalizePersonName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";

  // 1. Dọn dẹp khoảng trắng dư thừa
  const clean = rawName.trim().replace(/\s+/g, " ");
  if (!clean) return "";

  // 2. Chuyển toàn bộ về chữ thường chuẩn tiếng Việt
  const lower = clean.toLocaleLowerCase("vi-VN");

  // 3. Viết hoa chữ cái đầu tiên của từ (sau đầu chuỗi hoặc sau khoảng trắng, gạch nối, ngoặc, nháy, v.v.)
  // Sử dụng Unicode Property Escape \p{L} để nhận diện chính xác mọi ký tự chữ cái tiếng Việt & quốc tế
  return lower.replace(/(^|[\s\-\(\[\"\'\./])(\p{L})/gu, (match, prefix, char) => {
    return prefix + char.toLocaleUpperCase("vi-VN");
  });
}
