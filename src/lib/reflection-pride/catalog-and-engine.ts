import { createHash } from "crypto"

export const CRITERIA_VERSION_2026 = "v2026.1"
export const IP21_MAX_SCORE = 16.0
export const EXTENDED_MAX_SCORE = 20.0
export const IP21_DEFAULT_PASS_THRESHOLD_PERCENT = 72.0 // 72% of 16 = 11.52 points
export const IP21_DEFAULT_TARGET_RATE_PERCENT = 90.0 // Chỉ tiêu KPI IP2.1: 90%
export const DEFAULT_MIN_NPS_ANON_SAMPLE = 5 // Ngưỡng bảo mật ẩn danh tối thiểu cho lớp

export const IP21_OFFICIAL_CONFIG = {
  maxScore: IP21_MAX_SCORE,
  extendedMaxScore: EXTENDED_MAX_SCORE,
  studentPassThresholdPct: IP21_DEFAULT_PASS_THRESHOLD_PERCENT,
  studentPassMinScore16: 11.52,
  schoolKpiTargetPct: IP21_DEFAULT_TARGET_RATE_PERCENT,
  defaultMinNpsAnonymityCount: DEFAULT_MIN_NPS_ANON_SAMPLE,
  criteriaVersion: CRITERIA_VERSION_2026
} as const

export type QualityCode = "PC1" | "PC2" | "PC3" | "PC4" | "PC5"

export type CriterionRatingEntry = number | { score: number; note?: string }
export type CriteriaRatingMap = Record<string, CriterionRatingEntry>

export interface PrideNpsRawRecord {
  npsScore?: number
  score?: number
  campusId?: string | null
  classId?: string | null
  gradeLevel?: string | null
  semester?: string | null
  prideDriversJson?: string | null
  reasonsJson?: string | null
  proudMomentText?: string | null
  proudMoments?: string | null
  improvementSuggestion?: string | null
  improvementIdeas?: string | null
}

export interface CriterionDefinition {
  code: string
  aliasCode: string
  qualityCode: QualityCode
  order: number
  title: string
  shortName: string
  description: string
  statement: string
  studentPrompt: string
  isIp21Official: boolean
  rubric: Record<1 | 2 | 3 | 4, string>
}

export interface QualityDefinition {
  code: QualityCode
  order: number
  name: string
  shortName: string
  englishName: string
  isIp21Official: boolean
  includedInOfficialIp21: boolean
  maxScore: number
  color: string
  badgeBg: string
  description: string
  criteria: CriterionDefinition[]
}

export const RUBRIC_SCALE_LEVELS = [
  {
    score: 1,
    code: "CAN_CO_GANG",
    label: "Mức 1 • Cần cố gắng",
    shortLabel: "Cần cố gắng",
    description: "Đang hình thành thói quen, còn cần thầy cô và bố mẹ nhắc nhở thường xuyên.",
    color: "#E11D48",
    bg: "bg-rose-50 border-rose-200 text-rose-700"
  },
  {
    score: 2,
    code: "DAT",
    label: "Mức 2 • Đạt",
    shortLabel: "Đạt",
    description: "Thực hiện được theo hướng dẫn nhưng đôi lúc chưa duy trì đều đặn.",
    color: "#D97706",
    bg: "bg-amber-50 border-amber-200 text-amber-800"
  },
  {
    score: 3,
    code: "TOT",
    label: "Mức 3 • Tốt",
    shortLabel: "Tốt",
    description: "Chủ động, tự giác thực hiện thường xuyên và ổn định trong học tập, rèn luyện.",
    color: "#00A19A",
    bg: "bg-teal-50 border-teal-200 text-teal-800"
  },
  {
    score: 4,
    code: "XUAT_SAC",
    label: "Mức 4 • Xuất sắc & Lan tỏa",
    shortLabel: "Xuất sắc",
    description: "Thực hiện gương mẫu, bền bỉ và chủ động truyền cảm hứng tích cực cho bạn bè.",
    color: "#5B2D8B",
    bg: "bg-purple-50 border-purple-200 text-[#5B2D8B]"
  }
] as const

const DEFAULT_RUBRIC: Record<1 | 2 | 3 | 4, string> = {
  1: "Cần thầy cô, gia đình nhắc nhở nhiều; chưa tạo thành thói quen.",
  2: "Thực hiện được khi có hướng dẫn nhưng chưa duy trì đều đặn.",
  3: "Chủ động, tự giác thực hiện tốt và ổn định trong học tập, rèn luyện.",
  4: "Gương mẫu thực hiện xuất sắc và truyền cảm hứng tích cực cho bạn bè."
}

export const SKYLINE_5_QUALITIES_CATALOG: QualityDefinition[] = [
  {
    code: "PC1",
    order: 1,
    name: "Yêu nước & Trách nhiệm cộng đồng",
    shortName: "Yêu nước",
    englishName: "Patriotism & Civic Responsibility",
    isIp21Official: true,
    includedInOfficialIp21: true,
    maxScore: 4.0,
    color: "#5B2D8B",
    badgeBg: "bg-purple-50 text-[#5B2D8B] border-purple-200",
    description: "Tôn trọng nội quy, giữ gìn môi trường học đường và tích cực đóng góp cho cộng đồng.",
    criteria: [
      {
        code: "PC1_TC1",
        aliasCode: "TC1.1",
        qualityCode: "PC1",
        order: 1,
        title: "Chấp hành nội quy & văn hóa học đường",
        shortName: "Chấp hành nội quy & văn hóa học đường",
        description: "Tôn trọng pháp luật, thực hiện nghiêm túc nội quy nhà trường và quy tắc ứng xử văn minh.",
        statement: "Em tự giác thực hiện nội quy trường lớp, đi học đúng giờ và ứng xử văn minh nơi công cộng.",
        studentPrompt: "Em tự giác thực hiện nội quy trường lớp, đi học đúng giờ và ứng xử văn minh nơi công cộng.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC1_TC2",
        aliasCode: "TC1.2",
        qualityCode: "PC1",
        order: 2,
        title: "Bảo vệ môi trường xanh – sạch – đẹp",
        shortName: "Bảo vệ môi trường xanh – sạch – đẹp",
        description: "Có ý thức giữ gìn vệ sinh, tiết kiệm năng lượng và bảo vệ cảnh quan tại trường và nơi ở.",
        statement: "Em chủ động giữ gìn không gian lớp học sạch đẹp, phân loại rác và bảo vệ cây xanh, tài sản chung.",
        studentPrompt: "Em chủ động giữ gìn không gian lớp học sạch đẹp, phân loại rác và bảo vệ cây xanh, tài sản chung.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC1_TC3",
        aliasCode: "TC1.3",
        qualityCode: "PC1",
        order: 3,
        title: "Trân trọng bản sắc & phụng sự cộng đồng",
        shortName: "Trân trọng bản sắc & phụng sự cộng đồng",
        description: "Tự hào truyền thống dân tộc và tích cực tham gia các dự án thiện nguyện, hoạt động xã hội.",
        statement: "Em kính trọng lịch sử, văn hóa dân tộc và hào hứng tham gia các hoạt động vì cộng đồng của trường.",
        studentPrompt: "Em kính trọng lịch sử, văn hóa dân tộc và hào hứng tham gia các hoạt động vì cộng đồng của trường.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      }
    ]
  },
  {
    code: "PC2",
    order: 2,
    name: "Nhân ái & Tôn trọng sự khác biệt",
    shortName: "Nhân ái",
    englishName: "Compassion & Respect for Diversity",
    isIp21Official: true,
    includedInOfficialIp21: true,
    maxScore: 4.0,
    color: "#7C3AED",
    badgeBg: "bg-violet-50 text-violet-800 border-violet-200",
    description: "Biết yêu thương, thấu cảm, sẻ chia và tôn trọng sự khác biệt của mỗi cá nhân.",
    criteria: [
      {
        code: "PC2_TC1",
        aliasCode: "TC2.1",
        qualityCode: "PC2",
        order: 4,
        title: "Yêu thương, quan tâm & sẻ chia",
        shortName: "Yêu thương, quan tâm & sẻ chia",
        description: "Kính trọng thầy cô, hiếu thảo với ông bà cha mẹ và sẵn lòng giúp đỡ bạn bè khi gặp khó khăn.",
        statement: "Em luôn lễ phép với thầy cô, người lớn và sẵn sàng hỗ trợ, động viên bạn bè trong lớp.",
        studentPrompt: "Em luôn lễ phép với thầy cô, người lớn và sẵn sàng hỗ trợ, động viên bạn bè trong lớp.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC2_TC2",
        aliasCode: "TC2.2",
        qualityCode: "PC2",
        order: 5,
        title: "Tôn trọng sự khác biệt cá nhân",
        shortName: "Tôn trọng sự khác biệt cá nhân",
        description: "Lắng nghe, không định kiến và tôn trọng cá tính, quan điểm, hoàn cảnh riêng của bạn bè.",
        statement: "Em tôn trọng ý kiến, sở thích và sự khác biệt của các bạn; không trêu chọc hay cô lập bạn.",
        studentPrompt: "Em tôn trọng ý kiến, sở thích và sự khác biệt của các bạn; không trêu chọc hay cô lập bạn.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC2_TC3",
        aliasCode: "TC2.3",
        qualityCode: "PC2",
        order: 6,
        title: "Hợp tác hòa nhã & xây dựng tập thể ấm áp",
        shortName: "Hợp tác hòa nhã & xây dựng tập thể ấm áp",
        description: "Biết kiểm soát cảm xúc, chủ động hòa giải mâu thuẫn và góp phần tạo môi trường lớp học thân thiện.",
        statement: "Em biết lắng nghe, bình tĩnh giải quyết bất đồng và cùng các bạn xây dựng tập thể đoàn kết.",
        studentPrompt: "Em biết lắng nghe, bình tĩnh giải quyết bất đồng và cùng các bạn xây dựng tập thể đoàn kết.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      }
    ]
  },
  {
    code: "PC3",
    order: 3,
    name: "Chăm chỉ & Tự chủ học tập",
    shortName: "Chăm chỉ",
    englishName: "Diligence & Self-Directed Learning",
    isIp21Official: true,
    includedInOfficialIp21: true,
    maxScore: 4.0,
    color: "#00A19A",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
    description: "Nỗ lực vươn lên trong học tập, rèn luyện kỹ năng tự lập và quản lý bản thân hiệu quả.",
    criteria: [
      {
        code: "PC3_TC1",
        aliasCode: "TC3.1",
        qualityCode: "PC3",
        order: 7,
        title: "Chuyên cần & hoàn thành nhiệm vụ học tập",
        shortName: "Chuyên cần & hoàn thành nhiệm vụ học tập",
        description: "Chủ động chuẩn bị bài, hoàn thành đầy đủ nhiệm vụ học tập và tập trung trong giờ học.",
        statement: "Em hoàn thành bài tập đúng hạn, chuẩn bị bài kỹ trước khi lên lớp và tập trung nghe giảng.",
        studentPrompt: "Em hoàn thành bài tập đúng hạn, chuẩn bị bài kỹ trước khi lên lớp và tập trung nghe giảng.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC3_TC2",
        aliasCode: "TC3.2",
        qualityCode: "PC3",
        order: 8,
        title: "Vượt khó & chủ động khám phá tri thức",
        shortName: "Vượt khó & chủ động khám phá tri thức",
        description: "Kiên trì trước bài khó, chủ động đặt câu hỏi, đọc sách và rèn luyện kỹ năng mới.",
        statement: "Khi gặp bài khó hoặc thử thách mới, em kiên trì tìm cách giải quyết hoặc chủ động hỏi thầy cô, bạn bè.",
        studentPrompt: "Khi gặp bài khó hoặc thử thách mới, em kiên trì tìm cách giải quyết hoặc chủ động hỏi thầy cô, bạn bè.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC3_TC3",
        aliasCode: "TC3.3",
        qualityCode: "PC3",
        order: 9,
        title: "Tự lập, quản lý thời gian & lao động tích cực",
        shortName: "Tự lập, quản lý thời gian & lao động tích cực",
        description: "Có kế hoạch học tập – nghỉ ngơi khoa học, tự phục vụ bản thân và tham gia việc nhà, việc lớp.",
        statement: "Em biết sắp xếp thời gian biểu hợp lý, tự giác trong sinh hoạt cá nhân và tích cực trực nhật, phụ giúp gia đình.",
        studentPrompt: "Em biết sắp xếp thời gian biểu hợp lý, tự giác trong sinh hoạt cá nhân và tích cực trực nhật, phụ giúp gia đình.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      }
    ]
  },
  {
    code: "PC4",
    order: 4,
    name: "Trung thực & Kỷ luật tự giác",
    shortName: "Trung thực & Kỷ luật",
    englishName: "Integrity & Self-Discipline",
    isIp21Official: true,
    includedInOfficialIp21: true,
    maxScore: 4.0,
    color: "#0284C7",
    badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
    description: "Sống ngay thẳng, trung thực trong học tập – thi cử và có trách nhiệm với lời nói, việc làm.",
    criteria: [
      {
        code: "PC4_TC1",
        aliasCode: "TC4.1",
        qualityCode: "PC4",
        order: 10,
        title: "Trung thực trong học tập & kiểm tra đánh giá",
        shortName: "Trung thực trong học tập & kiểm tra đánh giá",
        description: "Tự làm bài bằng năng lực thật, không quay cóp hay gian lận trong học tập và kiểm tra.",
        statement: "Em luôn tự lực làm bài kiểm tra, tôn trọng kết quả thực chất và nói đúng sự thật.",
        studentPrompt: "Em luôn tự lực làm bài kiểm tra, tôn trọng kết quả thực chất và nói đúng sự thật.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC4_TC2",
        aliasCode: "TC4.2",
        qualityCode: "PC4",
        order: 11,
        title: "Dám nhận lỗi & cầu thị sửa đổi",
        shortName: "Dám nhận lỗi & cầu thị sửa đổi",
        description: "Thẳng thắn nhận trách nhiệm khi làm sai và chủ động khắc phục, bảo vệ điều đúng đắn.",
        statement: "Khi có thiếu sót, em dũng cảm nhận lỗi, lắng nghe góp ý của thầy cô để tiến bộ hơn.",
        studentPrompt: "Khi có thiếu sót, em dũng cảm nhận lỗi, lắng nghe góp ý của thầy cô để tiến bộ hơn.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC4_TC3",
        aliasCode: "TC4.3",
        qualityCode: "PC4",
        order: 12,
        title: "Giữ chữ tín & cam kết trách nhiệm cá nhân",
        shortName: "Giữ chữ tín & cam kết trách nhiệm cá nhân",
        description: "Thực hiện đúng lời hứa với thầy cô, bạn bè, gia đình và hoàn thành trọn vẹn phần việc được giao.",
        statement: "Em giữ lời hứa, có trách nhiệm đến cùng với nhiệm vụ nhóm và mục tiêu cá nhân đã cam kết.",
        studentPrompt: "Em giữ lời hứa, có trách nhiệm đến cùng với nhiệm vụ nhóm và mục tiêu cá nhân đã cam kết.",
        isIp21Official: true,
        rubric: DEFAULT_RUBRIC
      }
    ]
  },
  {
    code: "PC5",
    order: 5,
    name: "Tự hào Sky-Line & Khát vọng vươn xa",
    shortName: "Tự hào Sky-Line",
    englishName: "Sky-Line Pride & Global Aspiration",
    isIp21Official: false,
    includedInOfficialIp21: false,
    maxScore: 4.0,
    color: "#D97706",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    description: "Phẩm chất đặc trưng Sky-Line: Tự hào bản sắc học sinh Sky-Line, nuôi dưỡng khát vọng công dân toàn cầu.",
    criteria: [
      {
        code: "PC5_TC1",
        aliasCode: "TC5.1",
        qualityCode: "PC5",
        order: 13,
        title: "Tự hào bản sắc & giá trị cốt lõi Sky-Line",
        shortName: "Tự hào bản sắc & giá trị cốt lõi Sky-Line",
        description: "Giữ gìn hình ảnh văn minh, thanh lịch của học sinh Sky-Line; thực hành Có trách nhiệm – Biết yêu thương – Tự lập – Hợp tác.",
        statement: "Em tự hào khoác lên mình đồng phục Sky-Line, giữ tác phong lịch sự và lan tỏa năng lượng tích cực của một Sky-Liner.",
        studentPrompt: "Em tự hào khoác lên mình đồng phục Sky-Line, giữ tác phong lịch sự và lan tỏa năng lượng tích cực của một Sky-Liner.",
        isIp21Official: false,
        rubric: DEFAULT_RUBRIC
      },
      {
        code: "PC5_TC2",
        aliasCode: "TC5.2",
        qualityCode: "PC5",
        order: 14,
        title: "Tự tin hội nhập & khát vọng kiến tạo tương lai",
        shortName: "Tự tin hội nhập & khát vọng kiến tạo tương lai",
        description: "Chủ động rèn luyện ngoại ngữ, công nghệ số, tư duy sáng tạo và đóng góp ý tưởng xây dựng trường học hạnh phúc.",
        statement: "Em tự tin giao tiếp, tích cực trải nghiệm hội nhập quốc tế và nuôi dưỡng ước mơ, mục tiêu vươn xa.",
        studentPrompt: "Em tự tin giao tiếp, tích cực trải nghiệm hội nhập quốc tế và nuôi dưỡng ước mơ, mục tiêu vươn xa.",
        isIp21Official: false,
        rubric: DEFAULT_RUBRIC
      }
    ]
  }
]

export const ALL_14_CRITERIA: CriterionDefinition[] = SKYLINE_5_QUALITIES_CATALOG.flatMap(q => q.criteria)

export const PRIDE_NPS_DRIVERS = [
  { code: "TEACHERS_CARE", label: "Thầy cô tận tâm, yêu thương và lắng nghe" },
  { code: "HAPPY_ENVIRONMENT", label: "Môi trường học đường an toàn, tôn trọng & hạnh phúc" },
  { code: "EXPERIENTIAL_EVENTS", label: "Hoạt động trải nghiệm, sự kiện & CLB đa dạng" },
  { code: "FRIENDSHIP_CULTURE", label: "Tình bạn đẹp, văn hóa lớp học đoàn kết" },
  { code: "GLOBAL_INTEGRATION", label: "Chương trình Tiếng Anh, Công nghệ & Hội nhập quốc tế" },
  { code: "FACILITIES_CAMPUS", label: "Không gian trường học xanh, cơ sở vật chất hiện đại" },
  { code: "ADVISORY_SUPPORT", label: "Cố vấn học tập 1:1 & định hướng phát triển cá nhân" }
] as const

export const REFLECTION_HIGHLIGHT_TAGS = [
  { code: "ACADEMIC_PROGRESS", label: "Tiến bộ rõ rệt trong môn học" },
  { code: "SELF_DISCIPLINE", label: "Rèn luyện thói quen tự giác & đúng giờ" },
  { code: "TEAMWORK_LEADERSHIP", label: "Hợp tác nhóm & hỗ trợ bạn bè tốt" },
  { code: "CONFIDENCE_COMMUNICATION", label: "Tự tin thuyết trình & giao tiếp" },
  { code: "EMOTIONAL_BALANCE", label: "Biết quản lý cảm xúc & vượt qua áp lực" },
  { code: "COMMUNITY_CONTRIBUTION", label: "Tích cực tham gia hoạt động tập thể & thiện nguyện" }
] as const

export function parseStudentGradeNumber(gradeStr?: string | null, className?: string | null): number | null {
  const candidates = [gradeStr, className].filter(Boolean).map(s => String(s).trim())
  for (const raw of candidates) {
    const exactMatch = raw.match(/^(?:KHỐI|LỚP|K)?\s*(1[0-2]|[1-9])(?:\b|[^0-9])/i)
    if (exactMatch && exactMatch[1]) {
      const n = parseInt(exactMatch[1], 10)
      if (n >= 1 && n <= 12) return n
    }
    const anyMatch = raw.match(/(1[0-2]|[1-9])/)
    if (anyMatch && anyMatch[1]) {
      const n = parseInt(anyMatch[1], 10)
      if (n >= 1 && n <= 12) return n
    }
  }
  return null
}

export const normalizeGradeNumber = parseStudentGradeNumber

export function isEligibleGrade4To12(gradeStr?: string | null, className?: string | null): boolean {
  const gradeNum = parseStudentGradeNumber(gradeStr, className)
  return gradeNum !== null && gradeNum >= 4 && gradeNum <= 12
}

export interface ComputedStudentQualityScores {
  criterionScores: Record<string, number>
  answeredCriteriaCount: number
  isCompleteAll14: boolean
  q1PatriotismScore: number
  q2CompassionScore: number
  q3DiligenceScore: number
  q4HonestyScore: number
  q5PrideScore: number
  ip21Score16: number
  ip21TotalScore16: number
  ip21Percent: number
  ip21Percentage: number
  ip21Passed: boolean
  extendedScore20: number
  extended5TotalScore20: number
  extendedPercent: number
  extended5Percentage: number
  prideQualityScore4: number
  ip21ClassificationLabel: string
  ip21LevelCode: "LAN_TOA" | "VUNG_VANG" | "DANG_REN_LUYEN" | "CAN_DONG_HANH"
  ip21LevelLabel: string
  qualities: Array<{
    qualityCode: QualityCode
    qualityName: string
    includedInOfficialIp21: boolean
    averageScore: number
    percentage: number
    ratedCriteriaCount: number
    totalCriteriaCount: number
    criteriaScores: Array<{ code: string; shortName: string; score: number }>
  }>
}

function extractScoreValue(entry: any): number {
  if (typeof entry === "number") return entry
  if (entry && typeof entry === "object" && "score" in entry) return Number(entry.score)
  return Number(entry)
}

export function calculateStudentQualityScoresFromRatings(
  rawRatings: Record<string, any> | string | null | undefined,
  passThresholdPercent: number = IP21_DEFAULT_PASS_THRESHOLD_PERCENT
): ComputedStudentQualityScores {
  let parsed: Record<string, any> = {}
  if (typeof rawRatings === "string") {
    try {
      parsed = JSON.parse(rawRatings) || {}
    } catch {
      parsed = {}
    }
  } else if (rawRatings && typeof rawRatings === "object") {
    parsed = rawRatings
  }

  const criterionScores: Record<string, number> = {}
  let answeredCriteriaCount = 0

  for (const crit of ALL_14_CRITERIA) {
    const rawEntry = parsed[crit.code] !== undefined ? parsed[crit.code] : parsed[crit.aliasCode]
    const val = extractScoreValue(rawEntry)
    if (Number.isFinite(val) && val >= 1 && val <= 4) {
      const clamped = Math.round(val)
      criterionScores[crit.code] = clamped
      answeredCriteriaCount++
    }
  }

  const qualities = SKYLINE_5_QUALITIES_CATALOG.map(qDef => {
    const criteriaScores: Array<{ code: string; shortName: string; score: number }> = []
    for (const c of qDef.criteria) {
      const s = criterionScores[c.code]
      if (typeof s === "number" && s >= 1 && s <= 4) {
        criteriaScores.push({ code: c.code, shortName: c.shortName, score: s })
      }
    }
    const avg =
      criteriaScores.length > 0
        ? Math.round((criteriaScores.reduce((a, b) => a + b.score, 0) / criteriaScores.length) * 100) / 100
        : 0
    return {
      qualityCode: qDef.code,
      qualityName: qDef.name,
      includedInOfficialIp21: qDef.isIp21Official,
      averageScore: avg,
      percentage: Math.round((avg / 4) * 10000) / 100,
      ratedCriteriaCount: criteriaScores.length,
      totalCriteriaCount: qDef.criteria.length,
      criteriaScores
    }
  })

  const q1PatriotismScore = qualities.find(q => q.qualityCode === "PC1")?.averageScore || 0
  const q2CompassionScore = qualities.find(q => q.qualityCode === "PC2")?.averageScore || 0
  const q3DiligenceScore = qualities.find(q => q.qualityCode === "PC3")?.averageScore || 0
  const q4HonestyScore = qualities.find(q => q.qualityCode === "PC4")?.averageScore || 0
  const q5PrideScore = qualities.find(q => q.qualityCode === "PC5")?.averageScore || 0

  const ip21Score16 =
    Math.round((q1PatriotismScore + q2CompassionScore + q3DiligenceScore + q4HonestyScore) * 100) / 100
  const ip21Percent = Math.round((ip21Score16 / IP21_MAX_SCORE) * 10000) / 100
  const ip21Passed = answeredCriteriaCount >= 12 && ip21Percent >= passThresholdPercent

  const extendedScore20 = Math.round((ip21Score16 + q5PrideScore) * 100) / 100
  const extendedPercent = Math.round((extendedScore20 / EXTENDED_MAX_SCORE) * 10000) / 100

  let ip21LevelCode: "LAN_TOA" | "VUNG_VANG" | "DANG_REN_LUYEN" | "CAN_DONG_HANH" = "CAN_DONG_HANH"
  let ip21ClassificationLabel = "Cần đồng hành sát"

  if (ip21Percent >= 85) {
    ip21LevelCode = "LAN_TOA"
    ip21ClassificationLabel = "Mức 4 • Xuất sắc & Lan tỏa"
  } else if (ip21Percent >= passThresholdPercent) {
    ip21LevelCode = "VUNG_VANG"
    ip21ClassificationLabel = "Mức 3 • Đạt chuẩn IP2.1 (Vững vàng)"
  } else if (ip21Percent >= 50) {
    ip21LevelCode = "DANG_REN_LUYEN"
    ip21ClassificationLabel = "Mức 2 • Đang rèn luyện"
  }

  return {
    criterionScores,
    answeredCriteriaCount,
    isCompleteAll14: answeredCriteriaCount === ALL_14_CRITERIA.length,
    q1PatriotismScore,
    q2CompassionScore,
    q3DiligenceScore,
    q4HonestyScore,
    q5PrideScore,
    ip21Score16,
    ip21TotalScore16: ip21Score16,
    ip21Percent,
    ip21Percentage: ip21Percent,
    ip21Passed,
    extendedScore20,
    extended5TotalScore20: extendedScore20,
    extendedPercent,
    extended5Percentage: extendedPercent,
    prideQualityScore4: q5PrideScore,
    ip21ClassificationLabel,
    ip21LevelCode,
    ip21LevelLabel: ip21ClassificationLabel,
    qualities
  }
}

export type NpsCategoryGroup = "PROMOTER" | "PASSIVE" | "DETRACTOR"

export function classifyNpsScore(score: number): NpsCategoryGroup {
  const s = Math.max(0, Math.min(10, Math.round(score)))
  if (s >= 9) return "PROMOTER"
  if (s >= 7) return "PASSIVE"
  return "DETRACTOR"
}

export interface AggregatedPrideNpsMetrics {
  totalResponses: number
  minRequiredSample: number
  minAnonymityThreshold: number
  isMaskedForAnonymity: boolean
  isAnonymityMet: boolean
  promoterCount: number
  passiveCount: number
  detractorCount: number
  promotersCount: number | null
  passivesCount: number | null
  detractorsCount: number | null
  promoterPercent: number
  passivePercent: number
  detractorPercent: number
  promoterPct: number | null
  passivePct: number | null
  detractorPct: number | null
  npsScore: number | null
  averageScore10: number | null
  driverBreakdown: Array<{ code: string; label: string; count: number; percent: number }>
  topReasons: Array<{ code: string; label: string; count: number; pct: number }>
  scoreDistribution: Array<{ score: number; count: number; group: NpsCategoryGroup }>
  anonymizedComments: Array<{
    group: NpsCategoryGroup
    proudMoments?: string
    improvementIdeas?: string
  }>
}

export function aggregatePrideNpsFromRawResponses(
  rawResponses: PrideNpsRawRecord[],
  optionsOrThreshold?:
    | {
        enforceAnonymityThreshold?: boolean
        minSampleSize?: number
      }
    | number
): AggregatedPrideNpsMetrics {
  const isNumberArg = typeof optionsOrThreshold === "number"
  const minRequiredSample = isNumberArg
    ? optionsOrThreshold
    : optionsOrThreshold?.minSampleSize ?? DEFAULT_MIN_NPS_ANON_SAMPLE
  const enforceAnon = isNumberArg ? true : optionsOrThreshold?.enforceAnonymityThreshold ?? false

  const normalized = (rawResponses || [])
    .map(r => {
      const s = typeof r.npsScore === "number" ? r.npsScore : typeof r.score === "number" ? r.score : NaN
      return {
        ...r,
        resolvedScore: s
      }
    })
    .filter(r => Number.isFinite(r.resolvedScore) && r.resolvedScore >= 0 && r.resolvedScore <= 10)

  const totalResponses = normalized.length
  const isAnonymityMet = totalResponses >= minRequiredSample

  if ((enforceAnon && !isAnonymityMet) || totalResponses === 0) {
    return {
      totalResponses,
      minRequiredSample,
      minAnonymityThreshold: minRequiredSample,
      isMaskedForAnonymity: totalResponses < minRequiredSample,
      isAnonymityMet: false,
      promoterCount: 0,
      passiveCount: 0,
      detractorCount: 0,
      promotersCount: null,
      passivesCount: null,
      detractorsCount: null,
      promoterPercent: 0,
      passivePercent: 0,
      detractorPercent: 0,
      promoterPct: null,
      passivePct: null,
      detractorPct: null,
      npsScore: null,
      averageScore10: null,
      driverBreakdown: [],
      topReasons: [],
      scoreDistribution: [],
      anonymizedComments: []
    }
  }

  let promoterCount = 0
  let passiveCount = 0
  let detractorCount = 0
  let scoreSum = 0
  const distMap: Record<number, number> = {}
  const driverCounts: Record<string, number> = {}
  const anonymizedComments: Array<{
    group: NpsCategoryGroup
    proudMoments?: string
    improvementIdeas?: string
  }> = []

  for (let s = 0; s <= 10; s++) distMap[s] = 0

  for (const r of normalized) {
    const s = Math.round(r.resolvedScore)
    scoreSum += s
    distMap[s] = (distMap[s] || 0) + 1
    const grp = classifyNpsScore(s)
    if (grp === "PROMOTER") promoterCount++
    else if (grp === "PASSIVE") passiveCount++
    else detractorCount++

    const driversRaw = r.prideDriversJson || r.reasonsJson
    if (driversRaw) {
      try {
        const arr = typeof driversRaw === "string" ? JSON.parse(driversRaw) : driversRaw
        if (Array.isArray(arr)) {
          for (const code of arr) {
            const k = String(code)
            driverCounts[k] = (driverCounts[k] || 0) + 1
          }
        }
      } catch {}
    }

    const proud = (r.proudMomentText || r.proudMoments || "").trim()
    const improve = (r.improvementSuggestion || r.improvementIdeas || "").trim()
    if (proud || improve) {
      anonymizedComments.push({
        group: grp,
        proudMoments: proud || undefined,
        improvementIdeas: improve || undefined
      })
    }
  }

  const promoterPercent = Math.round((promoterCount / totalResponses) * 1000) / 10
  const passivePercent = Math.round((passiveCount / totalResponses) * 1000) / 10
  const detractorPercent = Math.round((detractorCount / totalResponses) * 1000) / 10
  const npsScore = Math.round(((promoterCount - detractorCount) / totalResponses) * 1000) / 10
  const averageScore10 = Math.round((scoreSum / totalResponses) * 100) / 100

  const driverBreakdown = PRIDE_NPS_DRIVERS.map(d => {
    const count = driverCounts[d.code] || 0
    const percent = Math.round((count / totalResponses) * 1000) / 10
    return {
      code: d.code,
      label: d.label,
      count,
      percent
    }
  }).sort((a, b) => b.count - a.count)

  const topReasons = driverBreakdown
    .filter(d => d.count > 0)
    .map(d => ({
      code: d.code,
      label: d.label,
      count: d.count,
      pct: d.percent
    }))

  const scoreDistribution = Array.from({ length: 11 }, (_, s) => ({
    score: s,
    count: distMap[s] || 0,
    group: classifyNpsScore(s)
  }))

  return {
    totalResponses,
    minRequiredSample,
    minAnonymityThreshold: minRequiredSample,
    isMaskedForAnonymity: false,
    isAnonymityMet: true,
    promoterCount,
    passiveCount,
    detractorCount,
    promotersCount: promoterCount,
    passivesCount: passiveCount,
    detractorsCount: detractorCount,
    promoterPercent,
    passivePercent,
    detractorPercent,
    promoterPct: promoterPercent,
    passivePct: passivePercent,
    detractorPct: detractorPercent,
    npsScore,
    averageScore10,
    driverBreakdown,
    topReasons,
    scoreDistribution,
    anonymizedComments
  }
}

export function buildAnonymousNpsTokenHash(periodId: string, studentId: string): string {
  const salt = process.env.AUTH_SECRET || "skyline-pride-nps-anon-salt-2026"
  return createHash("sha256")
    .update(`PRIDE_NPS:${periodId}:${studentId}:${salt}`)
    .digest("hex")
}

export function isStudentInPeriodScope(
  periodOrCombined: {
    status?: string
    startDate?: Date | string | null
    endDate?: Date | string | null
    extendedUntil?: Date | string | null
    targetGradesJson?: string | null
    targetCampusIdsJson?: string | null
    targetCampusesJson?: string | null
    targetClassIdsJson?: string | null
    targetClassesJson?: string | null
    gradeLevel?: string | null
    className?: string | null
    campusId?: string | null
    classId?: string | null
  },
  studentContextArg?: {
    gradeLevel?: string | null
    className?: string | null
    campusId?: string | null
    classId?: string | null
  }
): { eligible: boolean; isOpenForSubmission: boolean; reason?: string } {
  const studentContext = studentContextArg || {
    gradeLevel: periodOrCombined.gradeLevel,
    className: periodOrCombined.className,
    campusId: periodOrCombined.campusId,
    classId: periodOrCombined.classId
  }

  const gradeNum = parseStudentGradeNumber(studentContext.gradeLevel, studentContext.className)
  if (!gradeNum || gradeNum < 4 || gradeNum > 12) {
    return {
      eligible: false,
      isOpenForSubmission: false,
      reason: "Chương trình Tự nhìn nhận & Pride NPS chỉ áp dụng cho học sinh Khối 4–12."
    }
  }

  let targetGrades: string[] = ["4", "5", "6", "7", "8", "9", "10", "11", "12"]
  try {
    if (periodOrCombined.targetGradesJson) {
      const parsed = JSON.parse(periodOrCombined.targetGradesJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        targetGrades = parsed.map(x => String(x).replace(/^K/i, "").trim())
      }
    }
  } catch {}

  if (!targetGrades.includes("ALL") && !targetGrades.includes(String(gradeNum))) {
    return {
      eligible: false,
      isOpenForSubmission: false,
      reason: `Khối ${gradeNum} không thuộc phạm vi của kỳ khảo sát này.`
    }
  }

  let targetCampuses: string[] = ["ALL"]
  const rawCampusesJson = periodOrCombined.targetCampusIdsJson ?? periodOrCombined.targetCampusesJson
  try {
    if (rawCampusesJson) {
      const parsed = JSON.parse(rawCampusesJson)
      if (Array.isArray(parsed) && parsed.length > 0) targetCampuses = parsed.map(String)
    }
  } catch {}

  if (
    !targetCampuses.includes("ALL") &&
    studentContext.campusId &&
    !targetCampuses.includes(studentContext.campusId)
  ) {
    return {
      eligible: false,
      isOpenForSubmission: false,
      reason: "Cơ sở của học sinh không thuộc phạm vi kỳ khảo sát này."
    }
  }

  let targetClasses: string[] = ["ALL"]
  const rawClassesJson = periodOrCombined.targetClassIdsJson ?? periodOrCombined.targetClassesJson
  try {
    if (rawClassesJson) {
      const parsed = JSON.parse(rawClassesJson)
      if (Array.isArray(parsed) && parsed.length > 0) targetClasses = parsed.map(String)
    }
  } catch {}

  if (
    !targetClasses.includes("ALL") &&
    studentContext.classId &&
    !targetClasses.includes(studentContext.classId)
  ) {
    return {
      eligible: false,
      isOpenForSubmission: false,
      reason: "Lớp của học sinh không thuộc phạm vi kỳ khảo sát này."
    }
  }

  const st = String(periodOrCombined.status || "OPEN").toUpperCase()
  if (st === "DRAFT") {
    return {
      eligible: false,
      isOpenForSubmission: false,
      reason: "Kỳ khảo sát chưa được mở."
    }
  }

  const now = Date.now()
  const effectiveEnd = periodOrCombined.extendedUntil
    ? new Date(periodOrCombined.extendedUntil).getTime()
    : periodOrCombined.endDate
    ? new Date(periodOrCombined.endDate).getTime()
    : null
  const withinDeadline = !effectiveEnd || isNaN(effectiveEnd) || now <= effectiveEnd + 86400000

  const isOpenForSubmission = st === "OPEN" && withinDeadline

  return {
    eligible: true,
    isOpenForSubmission
  }
}
