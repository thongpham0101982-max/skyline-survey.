/**
 * Chuẩn hóa tên hoạt động ngoại khóa & trải nghiệm:
 * Quy chuẩn: Viết hoa đầu dòng, không viết hoa tất cả (Sentence Case)
 * Bảo tồn các từ viết tắt chuyên ngành giáo dục Sky-Line: CTHS, HĐTN, STEM, Sky-Line, v.v.
 */

// Danh sách các từ viết tắt chuyên môn cần giữ nguyên dạng viết hoa
const PRESERVED_ACRONYMS = [
  'CTHS',
  'HĐTN',
  'HĐNG',
  'HĐNLLL',
  'STEM',
  'STEAM',
  'ICT',
  'GDTC',
  'TNXH',
  'THCS',
  'THPT',
  'TCM',
  'BGH',
  'GVCN',
  'GVBM',
  'TLHN',
  'GDCD',
  'GDĐP',
  'NPS',
  'ESL',
  'IELTS',
  'TOEFL',
  'KHTN',
  'KHXH',
  'MN',
  'TH',
  'QT',
  'SN'
];

// Danh sách danh từ riêng hoặc từ đặc biệt cần viết hoa chuẩn (ưu tiên cao)
const PROPER_WORDS: Record<string, string> = {
  'sky-line': 'Sky-Line',
  'skyline': 'Sky-Line',
  'đà nẵng': 'Đà Nẵng',
  'da nang': 'Đà Nẵng',
  'hà nội': 'Hà Nội',
  'hội an': 'Hội An',
  'việt nam': 'Việt Nam',
  'quảng nam': 'Quảng Nam'
};

/**
 * Kiểm tra xem chuỗi có đang bị viết HOA TOÀN BỘ (ALL CAPS) không
 */
function isAllCaps(str: string): boolean {
  const letters = str.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase();
}

/**
 * Chuẩn hóa tên hoạt động theo chuẩn Sentence Case:
 * - Viết hoa chữ cái đầu dòng / đầu câu
 * - Không viết hoa tất cả (nếu ALL CAPS thì chuyển về chữ thường rồi viết hoa đầu dòng)
 * - Sau dấu chấm, hai chấm, gạch ngang, ngoặc kép thì chữ cái đầu đoạn cũng viết hoa
 * - Bảo tồn thương hiệu Sky-Line và các từ viết tắt chuyên môn (CTHS, STEM, HĐTN...)
 */
export function normalizeActivityName(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';

  // 1. Dọn dẹp khoảng trắng dư thừa
  let text = rawName.trim().replace(/\s+/g, ' ');
  if (!text) return '';

  // 2. Nếu chuỗi đang bị viết HOA TOÀN BỘ (ALL CAPS)
  if (isAllCaps(text)) {
    text = text.toLowerCase();
  }

  // 3. Quy chuẩn sentence case: Ký tự đầu tiên của chuỗi luôn viết hoa
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Viết hoa chữ cái đầu sau dấu chấm và khoảng trắng: ". [a-z]" -> ". [A-Z]"
  text = text.replace(/(\.\s+)([a-zà-ỹ])/gi, (_, p1, p2) => p1 + p2.toUpperCase());

  // Viết hoa chữ cái đầu sau dấu hai chấm: ":\s+([a-zà-ỹ])" -> ": [A-Z]"
  text = text.replace(/(:\s+)([a-zà-ỹ])/gi, (_, p1, p2) => p1 + p2.toUpperCase());

  // Viết hoa chữ cái đầu sau dấu gạch ngang phân cách mệnh đề: " - [a-z]" -> " - [A-Z]"
  text = text.replace(/(\s+-\s+)([a-zà-ỹ])/gi, (_, p1, p2) => p1 + p2.toUpperCase());

  // Viết hoa chữ cái đầu sau mở ngoặc kép hoặc ngoặc đơn: '("“([a-zà-ỹ])'
  text = text.replace(/([“"\(]\s*)([a-zà-ỹ])/gi, (_, p1, p2) => p1 + p2.toUpperCase());

  // 4. Áp dụng các từ viết tắt chuyên ngành (CTHS, STEM, HĐTN...) dùng Unicode word boundary
  PRESERVED_ACRONYMS.forEach(acronym => {
    const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, 'gui');
    text = text.replace(regex, (match, prefix) => prefix + acronym);
  });

  // 5. Áp dụng các danh từ riêng (Sky-Line, Đà Nẵng, Hội An...)
  Object.entries(PROPER_WORDS).forEach(([key, val]) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, 'gui');
    text = text.replace(regex, (match, prefix) => prefix + val);
  });

  // Đảm bảo chữ cái đầu tiên luôn viết hoa
  return text.charAt(0).toUpperCase() + text.slice(1).trim();
}
