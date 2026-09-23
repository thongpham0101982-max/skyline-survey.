/**
 * Subject Name Normalizer and Alias Mapping
 * Ensures raw subject text strings map deterministically to standardized subjects.
 */

export interface NormalizedSubject {
  code: string;
  standardName: string;
  aliases: string[];
}

export const STANDARDIZED_SUBJECTS: NormalizedSubject[] = [
  {
    code: "TOAN",
    standardName: "Toán học",
    aliases: ["toán", "môn toán", "toán học", "math", "mathematics"]
  },
  {
    code: "NGU_VAN",
    standardName: "Ngữ văn",
    aliases: ["văn", "ngữ văn", "tiếng việt", "môn văn", "literature"]
  },
  {
    code: "TIENG_ANH",
    standardName: "Tiếng Anh",
    aliases: ["tiếng anh", "anh", "tiếng anh clc", "english", "esl", "anh văn"]
  },
  {
    code: "KHTN",
    standardName: "Khoa học tự nhiên",
    aliases: ["khtn", "khoa học tự nhiên", "science", "khoa học"]
  },
  {
    code: "VAT_LI",
    standardName: "Vật lí",
    aliases: ["vật lí", "vật lý", "lí", "lý", "physics"]
  },
  {
    code: "HOA_HOC",
    standardName: "Hóa học",
    aliases: ["hóa học", "hóa", "chemistry"]
  },
  {
    code: "SINH_HOC",
    standardName: "Sinh học",
    aliases: ["sinh học", "sinh", "biology"]
  },
  {
    code: "LICH_SU_DIA_LI",
    standardName: "Lịch sử và Địa lí",
    aliases: ["ls&đl", "lịch sử", "địa lí", "địa lý", "sử", "địa", "lịch sử và địa lí", "history", "geography"]
  },
  {
    code: "TIN_HOC",
    standardName: "Tin học",
    aliases: ["tin học", "tin", "ict", "computer science", "công nghệ thông tin"]
  },
  {
    code: "GDCD",
    standardName: "Giáo dục công dân",
    aliases: ["gdcd", "giáo dục công dân", "đạo đức", "civic education"]
  },
  {
    code: "CONG_NGHE",
    standardName: "Công nghệ",
    aliases: ["công nghệ", "technology", "kỹ thuật"]
  }
];

export function normalizeSubjectName(rawInput: string): { code: string; standardName: string } | null {
  if (!rawInput || typeof rawInput !== "string") return null;
  const clean = rawInput.trim().toLowerCase();

  for (const sub of STANDARDIZED_SUBJECTS) {
    if (sub.aliases.some(alias => clean === alias || clean.includes(alias))) {
      return { code: sub.code, standardName: sub.standardName };
    }
  }

  // Fallback: Return raw formatted string if no alias matched
  return { code: clean.toUpperCase().replace(/\s+/g, "_"), standardName: rawInput.trim() };
}
