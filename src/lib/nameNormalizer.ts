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

  // 3. Tách theo khoảng trắng và viết hoa chữ cái đầu mỗi từ
  const words = lower.split(" ");

  const capitalizedWords = words.map(word => {
    if (!word) return "";

    // Xử lý từ ghép có dấu gạch ngang (ví dụ: Jean-Luc, Mai-Anh)
    if (word.includes("-")) {
      return word
        .split("-")
        .map(part => part ? part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1) : "")
        .join("-");
    }

    // Xử lý từ ghép có dấu nháy đơn (ví dụ: O'Connor)
    if (word.includes("'")) {
      return word
        .split("'")
        .map(part => part ? part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1) : "")
        .join("'");
    }

    // Xử lý nếu từ nằm trong ngoặc tròn (ví dụ: (Bảo))
    if (word.startsWith("(") && word.length > 1) {
      return "(" + word.charAt(1).toLocaleUpperCase("vi-VN") + word.slice(2);
    }

    // Viết hoa chữ cái đầu tiên của từ
    return word.charAt(0).toLocaleUpperCase("vi-VN") + word.slice(1);
  });

  return capitalizedWords.join(" ").trim();
}
