/**
 * subjectNormalization.ts
 * Lớp chuẩn hóa môn học và phân tích điểm mục tiêu tập trung cho SSM K12.
 * Đảm bảo:
 * 1. Không ghi đè raw_input của học sinh.
 * 2. Phân giải an toàn: raw text -> canonical subject -> subject ID/Code.
 * 3. Hỗ trợ các định dạng điểm: 7.5, 7,5, 8, 8.0 (Thang điểm 0 - 10).
 * 4. Đánh dấu "Cần xác nhận môn học" khi phát hiện trường hợp đa nghĩa (ambiguous).
 */

export interface CanonicalSubjectDefinition {
  code: string
  canonicalName: string
  aliases: string[]
  level: "PRIMARY" | "SECONDARY" | "HIGH" | "ALL"
}

export const CANONICAL_SUBJECTS: CanonicalSubjectDefinition[] = [
  {
    code: "MAT",
    canonicalName: "Toán",
    aliases: ["toan", "mon toan", "toan hoc", "math", "mathematics", "maths"],
    level: "ALL"
  },
  {
    code: "ENG",
    canonicalName: "Tiếng Anh",
    aliases: ["tieng anh", "anh", "ta", "english", "mon tieng anh", "tieng anh k12", "esl"],
    level: "ALL"
  },
  {
    code: "LIT",
    canonicalName: "Ngữ văn",
    aliases: ["ngu van", "van", "nv", "mon van", "tieng viet", "mon tieng viet", "literature"],
    level: "ALL"
  },
  {
    code: "PHY",
    canonicalName: "Vật lí",
    aliases: ["vat ly", "vat li", "ly", "mon ly", "physics"],
    level: "HIGH"
  },
  {
    code: "CHE",
    canonicalName: "Hóa học",
    aliases: ["hoa hoc", "hoa", "mon hoa", "chemistry"],
    level: "HIGH"
  },
  {
    code: "BIO",
    canonicalName: "Sinh học",
    aliases: ["sinh hoc", "sinh", "mon sinh", "biology"],
    level: "HIGH"
  },
  {
    code: "HIS",
    canonicalName: "Lịch sử",
    aliases: ["lich su", "su", "mon su", "history"],
    level: "ALL"
  },
  {
    code: "GEO",
    canonicalName: "Địa lí",
    aliases: ["dia ly", "dia li", "dia", "mon dia", "geography"],
    level: "ALL"
  },
  {
    code: "SCI",
    canonicalName: "Khoa học tự nhiên",
    aliases: ["khoa hoc tu nhien", "khtn", "khoa hoc", "science"],
    level: "SECONDARY"
  },
  {
    code: "SOC",
    canonicalName: "Lịch sử và Địa lí",
    aliases: ["lich su va dia ly", "lich su va dia li", "ls va dl", "ls-dl", "lsdl"],
    level: "SECONDARY"
  },
  {
    code: "INF",
    canonicalName: "Tin học",
    aliases: ["tin hoc", "tin", "mon tin", "informatics", "it", "computer science"],
    level: "ALL"
  },
  {
    code: "CIV",
    canonicalName: "Giáo dục công dân",
    aliases: ["giao duc cong dan", "gdcd", "dao duc", "civics", "giao duc kinh te va phap luat", "gdkt&pl", "gdktpl"],
    level: "ALL"
  },
  {
    code: "TECH",
    canonicalName: "Công nghệ",
    aliases: ["cong nghe", "cn", "technology"],
    level: "ALL"
  },
  {
    code: "ART",
    canonicalName: "Mĩ thuật",
    aliases: ["mi thuat", "my thuat", "ve", "hoi hoa", "art", "arts"],
    level: "ALL"
  },
  {
    code: "MUS",
    canonicalName: "Âm nhạc",
    aliases: ["am nhac", "nhac", "music"],
    level: "ALL"
  },
  {
    code: "PE",
    canonicalName: "Giáo dục thể chất",
    aliases: ["giao duc the chat", "gdtc", "the duc", "physical education", "pe"],
    level: "ALL"
  }
]

/**
 * Xóa dấu tiếng Việt và chuẩn hóa chuỗi phục vụ so khớp alias
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return ""
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

export interface ParsedSubjectGoalResult {
  rawInput: string
  isSubjectGoal: boolean
  canonicalSubject: string | null
  subjectCode: string | null
  targetScore: number | null
  rawScoreText: string | null
  isAmbiguous: boolean
  ambiguityReason?: string
  cleanText: string
}

/**
 * Parse an toàn điểm số mục tiêu (chấp nhận 7.5, 7,5, 8, 8.0 trong thang 0 - 10)
 */
export function parseTargetScore(scoreStr?: string | null): number | null {
  if (!scoreStr) return null
  const cleaned = String(scoreStr).trim().replace(",", ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  if (num < 0 || num > 10) return null
  return Math.round(num * 10) / 10 // Giữ tối đa 1 chữ số thập phân
}

/**
 * Phân tích chuỗi mục tiêu thô của học sinh
 * Hỗ trợ các mẫu:
 * - "Toán: 7.5"
 * - "Môn Toán 8,0"
 * - "Tiếng Anh: 7.5 và đạt chứng chỉ IELTS 6.5"
 * - "Ngữ Văn - 8"
 * - "Toán 7.5"
 */
export function parseSubjectGoal(rawInput: string): ParsedSubjectGoalResult {
  const result: ParsedSubjectGoalResult = {
    rawInput: rawInput || "",
    isSubjectGoal: false,
    canonicalSubject: null,
    subjectCode: null,
    targetScore: null,
    rawScoreText: null,
    isAmbiguous: false,
    cleanText: (rawInput || "").trim()
  }

  if (!rawInput || !rawInput.trim()) {
    return result
  }

  const raw = rawInput.trim()

  // 1. Trích xuất điểm số bằng regex có ngữ cảnh
  // Mẫu: (môn) ... (khoảng cách / dấu : / - / đạt / mục tiêu) ... (số từ 0.0 đến 10.0)
  const scoreRegex = /(?:[:\-\=]|\b(?:dat|muc tieu|diem|target|score)\b|\s)*\s*(\d{1,2}(?:[\.,]\d{1,2})?)(?:\s*\/\s*10|\s*diem)?(?:\s*$|[\s,;\.])/i
  
  // 2. Tìm kiếm môn học phù hợp qua alias
  const normalizedRaw = removeVietnameseTones(raw)
  
  const matchedSubjects: CanonicalSubjectDefinition[] = []

  for (const subj of CANONICAL_SUBJECTS) {
    for (const alias of subj.aliases) {
      const normAlias = removeVietnameseTones(alias)
      // Regex boundary cho alias
      const aliasRegex = new RegExp(`\\b${normAlias}\\b`, "i")
      if (aliasRegex.test(normalizedRaw)) {
        if (!matchedSubjects.some(s => s.code === subj.code)) {
          matchedSubjects.push(subj)
        }
        break
      }
    }
  }

  // Nếu không phát hiện môn học nào
  if (matchedSubjects.length === 0) {
    result.isSubjectGoal = false
    return result
  }

  // Nếu phát hiện nhiều hơn 1 môn học trong 1 câu (ví dụ: "Học giỏi Toán và Tiếng Anh")
  if (matchedSubjects.length > 1) {
    result.isSubjectGoal = true
    result.isAmbiguous = true
    result.ambiguityReason = `Phát hiện nhiều môn học trong một dòng (${matchedSubjects.map(s => s.canonicalName).join(", ")}). Cần xác nhận môn học.`
    return result
  }

  // Đúng 1 môn học được phát hiện
  const chosenSubj = matchedSubjects[0]
  result.isSubjectGoal = true
  result.canonicalSubject = chosenSubj.canonicalName
  result.subjectCode = chosenSubj.code

  // Trích xuất điểm số
  const scoreMatch = raw.match(/(?:[:\-\=]|\b(?:đạt|mục tiêu|điểm|target|score)\b|\s)*\s*(\d{1,2}(?:[\.,]\d{1,2})?)(?:\s*\/\s*10|\s*điểm)?(?:\s*$|[\s,;\.])/i)
  if (scoreMatch && scoreMatch[1]) {
    const rawVal = scoreMatch[1]
    const parsed = parseTargetScore(rawVal)
    if (parsed !== null) {
      result.targetScore = parsed
      result.rawScoreText = rawVal
    }
  } else {
    // Thử regex số độc lập ở cuối câu: "Toán 8", "Anh 7.5"
    const trailingNumberMatch = raw.match(/\b(\d{1,2}(?:[\.,]\d{1,2})?)\s*$/)
    if (trailingNumberMatch && trailingNumberMatch[1]) {
      const parsed = parseTargetScore(trailingNumberMatch[1])
      if (parsed !== null) {
        result.targetScore = parsed
        result.rawScoreText = trailingNumberMatch[1]
      }
    }
  }

  return result
}
