import discBankVi from "./questions/disc_vi.json"
import epiBankVi from "./questions/epi_vi.json"
import hollandBankVi from "./questions/holland_vi.json"
import lyusinBankVi from "./questions/lyusin_eq_vi.json"
import mbtiBankVi from "./questions/mbti_vi.json"
import {
  RIASEC_PROFILES,
  SKYLINE_SUBJECT_COMBINATIONS,
  calculateHollandResult,
  type RiasecCode
} from "./holland-skl-psych"

export type SklPsychTestCode = "DISC" | "EPI" | "HOLLAND" | "LYUSIN_EQ" | "MBTI"

export interface SklPsychTestConfig {
  code: SklPsychTestCode
  name: string
  shortName: string
  category: string
  questionCount: number
  estimatedMinutes: number
  recommendedGrades: number[]
  recommendedLabel: string
  inputType: "MOST_LEAST_MATRIX" | "BINARY_YES_NO" | "LIKERT_4_SCALE" | "FORCED_CHOICE_AB"
  icon: string
  gradient: string
  badgeBg: string
  description: string
  instructions: string
}

export const SKL_PSYCH_CATALOG: SklPsychTestConfig[] = [
  {
    code: "DISC",
    name: "Trắc nghiệm Phong cách Hành vi Cá nhân DISC",
    shortName: "DISC Hành vi",
    category: "BEHAVIOR",
    questionCount: 28,
    estimatedMinutes: 15,
    recommendedGrades: [7, 8, 9, 10, 11, 12],
    recommendedLabel: "Khuyên dùng từ khối 7",
    inputType: "MOST_LEAST_MATRIX",
    icon: "⚡",
    gradient: "from-rose-500 to-pink-600",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    description:
      "Phân tích 4 trục hành vi Thống trị (D), Ảnh hưởng (I), Kiên định (S) và Tuân thủ (C) để thấu hiểu bản thân và phát triển kỹ năng làm việc nhóm.",
    instructions:
      "Với mỗi nhóm gồm 4 mô tả, hãy chọn:\n1 câu giống em nhất.\n1 câu ít giống em nhất.\nKhông chọn trùng một câu cho cả hai mục. Hãy trả lời theo cách em thường thể hiện trong thực tế, không có đáp án đúng hay sai."
  },
  {
    code: "EPI",
    name: "Trắc nghiệm Khí chất Hướng nội - Hướng ngoại (EPI)",
    shortName: "EPI Khí chất",
    category: "TEMPERAMENT",
    questionCount: 57,
    estimatedMinutes: 15,
    recommendedGrades: [10, 11, 12],
    recommendedLabel: "Khuyên dùng từ khối 10",
    inputType: "BINARY_YES_NO",
    icon: "🧠",
    gradient: "from-teal-500 to-emerald-600",
    badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
    description:
      "Nhận diện 4 nhóm khí chất cổ điển (Hoạt bát, Nóng nảy, Điềm tĩnh, Ưu tư) và mức độ ổn định cảm xúc.",
    instructions:
      "Hãy đọc từng câu hỏi và chọn “Có” hoặc “Không” theo đúng thói quen và cảm nhận tự nhiên đầu tiên của bản thân, không có câu trả lời đúng hay sai."
  },
  {
    code: "HOLLAND",
    name: "Trắc nghiệm Sở thích Nghề nghiệp RIASEC (Holland Code)",
    shortName: "Holland RIASEC",
    category: "CAREER",
    questionCount: 108,
    estimatedMinutes: 15,
    recommendedGrades: [8, 9, 10, 11, 12],
    recommendedLabel: "Khuyên dùng từ khối 8",
    inputType: "BINARY_YES_NO",
    icon: "🧭",
    gradient: "from-amber-500 to-orange-600",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    description:
      "Xác định Top 3 thiên hướng nghề nghiệp (R-I-A-S-E-C) và gợi ý tổ hợp môn THPT tại Sky-Line.",
    instructions:
      "Đây là bài trắc nghiệm Holland giúp bạn khám phá sở thích nghề nghiệp. Hãy đọc từng câu và chọn “Có” hoặc “Không” theo đúng suy nghĩ của bản thân, đừng suy nghĩ quá lâu nhé!"
  },
  {
    code: "LYUSIN_EQ",
    name: "Thang đo Trí tuệ Cảm xúc D.V. Lyusin (EQ)",
    shortName: "Lyusin EQ",
    category: "EMOTIONAL_INTELLIGENCE",
    questionCount: 46,
    estimatedMinutes: 15,
    recommendedGrades: [11, 12],
    recommendedLabel: "Khuyên dùng cho khối 11 và 12",
    inputType: "LIKERT_4_SCALE",
    icon: "💖",
    gradient: "from-sky-500 to-cyan-600",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    description:
      "Đo lường năng lực thấu cảm và điều khiển cảm xúc nội - liên nhân cách qua 9 thang đo và tiểu thang đo.",
    instructions:
      "Đây là thang đo trí tuệ cảm xúc của D.V. Lyusin, gồm 46 câu giúp bạn tìm hiểu khả năng nhận biết, thấu hiểu và điều chỉnh cảm xúc của bản thân cũng như người khác. Hãy đọc kỹ từng câu và chọn mức độ đồng ý phù hợp nhất với mình, từ “Hoàn toàn không đồng ý” đến “Hoàn toàn đồng ý”."
  },
  {
    code: "MBTI",
    name: "Trắc nghiệm 16 Nhóm Tính cách MBTI",
    shortName: "MBTI 16 Nhóm",
    category: "PERSONALITY",
    questionCount: 70,
    estimatedMinutes: 20,
    recommendedGrades: [10, 11, 12],
    recommendedLabel: "Khuyên dùng từ khối 10",
    inputType: "FORCED_CHOICE_AB",
    icon: "🧩",
    gradient: "from-indigo-500 to-purple-600",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description:
      "Khám phá 16 nhóm tính cách qua 4 cặp đối cực (E/I, S/N, T/F, J/P), phong cách học tập và phương pháp tư duy.",
    instructions:
      "HƯỚNG DẪN LÀM TRẮC NGHIỆM MBTI: Đây là bài trắc nghiệm tính cách, không có câu trả lời đúng hay sai. Hãy chọn phương án phù hợp nhất với bản thân em. Đọc và chọn theo cảm nhận đầu tiên, không cần phân tích quá nhiều. Thời gian hoàn thành 70 câu hỏi: 20 phút."
  }
]

export const DISC_STYLE_TABLE: Record<
  "D" | "I" | "S" | "C",
  {
    code: "D" | "I" | "S" | "C"
    groupLabel: string
    displayName: string
    academicStrengths: string
    teamRole: string
    improvementNote: string
    color: string
    bgLight: string
    borderColor: string
  }
> = {
  D: {
    code: "D",
    groupLabel: "Nhóm D",
    displayName: "Người định hướng mục tiêu",
    academicStrengths:
      "Chủ động, quyết đoán, thích chinh phục các bài tập khó và giải quyết vấn đề nhanh gọn.",
    teamRole:
      "Người điều phối chung, đưa ra quyết định và thúc đẩy tiến độ khi nhóm bị chậm trễ.",
    improvementNote:
      "Học cách kiên nhẫn lắng nghe ý kiến trái chiều và chú ý hơn đến cảm xúc của các thành viên trong nhóm.",
    color: "from-rose-500 to-red-600",
    bgLight: "bg-rose-50/70",
    borderColor: "border-rose-200"
  },
  I: {
    code: "I",
    groupLabel: "Nhóm I",
    displayName: "Người kết nối và truyền cảm hứng",
    academicStrengths:
      "Giàu năng lượng, sáng tạo, dễ dàng trình bày ý tưởng và tạo không khí sôi nổi cho tập thể.",
    teamRole:
      "Người thuyết trình, đóng góp ý tưởng mới (brainstorm) và gắn kết các thành viên.",
    improvementNote:
      "Rèn luyện tính kỷ luật về thời gian, lập kế hoạch chi tiết và theo đuổi nhiệm vụ đến bước cuối cùng.",
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50/70",
    borderColor: "border-amber-200"
  },
  S: {
    code: "S",
    groupLabel: "Nhóm S",
    displayName: "Người đồng hành tin cậy",
    academicStrengths:
      "Kiên trì, biết lắng nghe, làm việc ổn định và luôn sẵn sàng hỗ trợ bạn bè khi cần.",
    teamRole:
      "Người hỗ trợ hậu cần, hòa giải mâu thuẫn và duy trì sự gắn kết, phối hợp nhịp nhàng trong nhóm.",
    improvementNote:
      "Tập thói quen chủ động nói lên quan điểm cá nhân và mạnh dạn thử sức với những thay đổi, thử thách mới.",
    color: "from-teal-500 to-emerald-600",
    bgLight: "bg-teal-50/70",
    borderColor: "border-teal-200"
  },
  C: {
    code: "C",
    groupLabel: "Nhóm C",
    displayName: "Người phân tích cẩn trọng",
    academicStrengths:
      "Tư duy logic, làm việc có hệ thống, cẩn thận với số liệu và luôn đảm bảo chất lượng bài làm ở mức cao.",
    teamRole:
      "Người lập kế hoạch chi tiết, tìm kiếm tài liệu, kiểm tra lỗi và đánh giá chất lượng sản phẩm của nhóm.",
    improvementNote:
      "Tránh cầu toàn quá mức gây áp lực thời gian cho bản thân; cởi mở hơn với các phương án linh hoạt.",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50/70",
    borderColor: "border-blue-200"
  }
}

export const EPI_TEMPERAMENT_PROFILES: Record<
  "Sanguine" | "Choleric" | "Phlegmatic" | "Melancholic",
  {
    code: "Sanguine" | "Choleric" | "Phlegmatic" | "Melancholic"
    vietnameseName: string
    description: string
    strengths: string[]
    suggestedCareers: string[]
  }
> = {
  Sanguine: {
    code: "Sanguine",
    vietnameseName: "Hoạt bát (Sanguine)",
    description:
      "Hòa đồng, nói chuyện tự nhiên, thích giao tiếp, lạc quan, thích nghi nhanh, dễ tạo thiện cảm, thích làm việc nhóm.",
    strengths: [
      "Giao tiếp tự tin, lan tỏa năng lượng tích cực",
      "Thích nghi linh hoạt, ứng biến nhanh với môi trường mới",
      "Chủ động khởi xướng ý tưởng và hoạt động tập thể"
    ],
    suggestedCareers: [
      "Truyền thông & Quan hệ công chúng (PR)",
      "Quản trị kinh doanh & Đối ngoại",
      "Giáo dục, Đào tạo & Tổ chức sự kiện",
      "Marketing – Du lịch – Dịch vụ"
    ]
  },
  Choleric: {
    code: "Choleric",
    vietnameseName: "Nóng nảy (Choleric)",
    description:
      "Năng động, quyết đoán, phản ứng nhanh, nhiệt huyết hướng tới mục tiêu nhưng đôi khi dễ bốc đồng hoặc thiếu kiên nhẫn.",
    strengths: [
      "Quyết đoán, dám nghĩ dám làm và dẫn dắt tiên phong",
      "Định hướng mục tiêu rõ ràng, hành động dứt khoát",
      "Tập trung năng lượng cao để vượt qua thử thách"
    ],
    suggestedCareers: [
      "Khởi nghiệp & Quản lý dự án tốc độ cao",
      "Luật học & Tranh tụng",
      "Kinh doanh, Điều hành & Quản trị rủi ro",
      "Báo chí – Truyền hình – Thể thao"
    ]
  },
  Phlegmatic: {
    code: "Phlegmatic",
    vietnameseName: "Điềm tĩnh (Phlegmatic)",
    description:
      "Trầm tĩnh, kiên nhẫn, cẩn trọng, đáng tin cậy, làm việc có phương pháp và duy trì sự ổn định tâm lý cao.",
    strengths: [
      "Khả năng làm việc độc lập với sự tập trung sâu",
      "Kiên nhẫn, điềm đạm, biết lắng nghe và giữ bình tĩnh dưới áp lực",
      "Đáng tin cậy, làm việc chuẩn mực và ít sai sót"
    ],
    suggestedCareers: [
      "Công nghệ thông tin, Lập trình & Phân tích hệ thống",
      "Kỹ thuật, Nghiên cứu khoa học & Kiểm toán – Tài chính",
      "Y tế, Dược học & Quản trị dữ liệu"
    ]
  },
  Melancholic: {
    code: "Melancholic",
    vietnameseName: "Ưu tư (Melancholic)",
    description:
      "Nhạy cảm, sâu sắc, tinh tế và giàu lòng nhân ái, suy nghĩ thấu đáo mọi việc nhưng dễ lo âu dưới áp lực lớn.",
    strengths: [
      "Tư duy phân tích sâu sắc và chú trọng chi tiết",
      "Trực giác nhạy bén, năng khiếu thẩm mỹ và nghệ thuật tốt",
      "Giàu lòng trắc ẩn và thấu cảm sâu với cảm xúc người khác"
    ],
    suggestedCareers: [
      "Nghiên cứu chuyên sâu & Biên kịch / Viết lách",
      "Thiết kế đồ họa, Mỹ thuật & Kiến trúc",
      "Tâm lý học, Tham vấn học đường & Giáo dục"
    ]
  }
}

export const LYUSIN_EQ_SCALES = [
  {
    code: "MEI",
    nameVi: "EQ liên nhân cách",
    maxScore: 66,
    type: "COMPOSITE" as const,
    description: "Khả năng hiểu và điều khiển cảm xúc của người khác."
  },
  {
    code: "VEI",
    nameVi: "EQ nội nhân cách",
    maxScore: 72,
    type: "COMPOSITE" as const,
    description: "Khả năng hiểu và điều khiển cảm xúc của bản thân."
  },
  {
    code: "PE",
    nameVi: "Hiểu cảm xúc",
    maxScore: 66,
    type: "COMPOSITE" as const,
    description: "Khả năng hiểu cảm xúc của bản thân và người khác."
  },
  {
    code: "UE",
    nameVi: "Điều khiển cảm xúc",
    maxScore: 72,
    type: "COMPOSITE" as const,
    description: "Khả năng điều khiển cảm xúc của bản thân và người khác."
  },
  {
    code: "MP",
    nameVi: "Hiểu cảm xúc của người khác",
    maxScore: 36,
    type: "SUBSCALE" as const,
    description:
      "Khả năng nhận biết trạng thái cảm xúc của người khác thông qua nét mặt, cử chỉ, giọng nói hoặc các dấu hiệu khác."
  },
  {
    code: "MU",
    nameVi: "Điều khiển cảm xúc của người khác",
    maxScore: 30,
    type: "SUBSCALE" as const,
    description:
      "Khả năng tác động đến cảm xúc của người khác, khơi gợi cảm xúc phù hợp và làm giảm những cảm xúc không cần thiết."
  },
  {
    code: "VP",
    nameVi: "Hiểu cảm xúc của bản thân",
    maxScore: 30,
    type: "SUBSCALE" as const,
    description:
      "Khả năng nhận biết, phân biệt, xác định nguyên nhân và diễn đạt cảm xúc của bản thân."
  },
  {
    code: "VU",
    nameVi: "Điều khiển cảm xúc của bản thân",
    maxScore: 21,
    type: "SUBSCALE" as const,
    description:
      "Khả năng điều chỉnh cảm xúc, duy trì những cảm xúc cần thiết và kiểm soát những cảm xúc không phù hợp."
  },
  {
    code: "VE",
    nameVi: "Kiểm soát sự biểu cảm",
    maxScore: 21,
    type: "SUBSCALE" as const,
    description: "Khả năng kiểm soát cách thể hiện cảm xúc ra bên ngoài."
  }
]

export const MBTI_GROUPS = [
  {
    code: "NT",
    title: "1. Nhóm Phân tích (Analysts - NT)",
    summary: "Thiên về tư duy logic, chiến lược và độc lập",
    types: ["INTJ", "INTP", "ENTJ", "ENTP"],
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200"
  },
  {
    code: "NF",
    title: "2. Nhóm Ngoại giao (Diplomats - NF)",
    summary: "Thiên về thấu cảm, sáng tạo nội dung và phát triển con người",
    types: ["INFJ", "INFP", "ENFJ", "ENFP"],
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
  },
  {
    code: "SJ",
    title: "3. Nhóm Bảo hộ (Sentinels - SJ)",
    summary: "Thiên về tính tổ chức, kỷ luật, trách nhiệm và quy trình",
    types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200"
  },
  {
    code: "SP",
    title: "4. Nhóm Khám phá (Explorers - SP)",
    summary: "Thiên về trải nghiệm thực tiễn, linh hoạt và ứng biến nhanh",
    types: ["ISTP", "ISFP", "ESTP", "ESFP"],
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
  }
]

export const MBTI_PROFILES: Record<
  string,
  {
    code: string
    labelVi: string
    temperamentCode: "NT" | "NF" | "SJ" | "SP"
    naturalStrengths: string
    learningStyle: string
    teamRole: string
    growthNotes: string
    referenceFields: string
  }
> = {
  INTJ: {
    code: "INTJ",
    labelVi: "Người tư duy hệ thống và độc lập",
    temperamentCode: "NT",
    naturalStrengths:
      "Tư duy chiến lược, khả năng tự học cao, nhìn nhận vấn đề có chiều sâu và định hướng mục tiêu rõ ràng.",
    learningStyle:
      "Học tốt qua việc tự nghiên cứu tài liệu chuyên sâu, lập sơ đồ tư duy tổng thể và tìm hiểu bản chất nguyên lý của vấn đề.",
    teamRole:
      "Người xây dựng kế hoạch tổng thể, phân tích cấu trúc đề tài và định hướng chiến lược cho dự án.",
    growthNotes:
      "Mở lòng tham gia thảo luận nhóm để kết nối với bạn bè; học cách diễn đạt các góc nhìn logic một cách gần gũi, dễ tiếp nhận hơn.",
    referenceFields:
      "Nghiên cứu khoa học, công nghệ thông tin, phân tích dữ liệu, tài chính chiến lược, kiến trúc hệ thống, luật học."
  },
  INTP: {
    code: "INTP",
    labelVi: "Người nghiên cứu và giải quyết vấn đề",
    temperamentCode: "NT",
    naturalStrengths:
      "Ham học hỏi, tư duy phân tích sắc bén, thích khám phá các lý thuyết phức tạp và tìm tòi giải pháp mới.",
    learningStyle:
      "Học hiệu quả khi được đặt câu hỏi 'Tại sao', tự do tìm hiểu sâu một chủ đề yêu thích và giải các bài toán đòi hỏi tư duy logic.",
    teamRole:
      "Người phân tích chuyên môn, tìm kiếm giải pháp cho các câu hỏi khó và phát hiện lỗ hổng logic trong bài làm.",
    growthNotes:
      "Rèn luyện kỹ năng trình bày ý tưởng phức tạp một cách ngắn gọn và chú ý bám sát tiến độ thời gian chung khi làm bài tập nhóm.",
    referenceFields:
      "Khoa học máy tính, toán ứng dụng, nghiên cứu và phát triển (R&D), vật lý, triết học, kỹ thuật phần mềm."
  },
  ENTJ: {
    code: "ENTJ",
    labelVi: "Người tổ chức và định hướng chiến lược",
    temperamentCode: "NT",
    naturalStrengths:
      "Chủ động, quyết đoán, có khả năng nhìn nhận bức tranh tổng thể và sắp xếp nguồn lực hợp lý để đạt mục tiêu.",
    learningStyle:
      "Học tốt trong môi trường có mục tiêu rõ ràng, có tính thử thách cao, kết hợp giữa lý thuyết hệ thống và thảo luận phản biện.",
    teamRole:
      "Người điều phối chung, phân công nhiệm vụ, quản lý tiến độ và đại diện nhóm bảo vệ quan điểm.",
    growthNotes:
      "Lắng nghe nhiều hơn góc nhìn của các thành viên và đón nhận những lần sai sót như một bước tự nhiên trong quá trình học tập.",
    referenceFields:
      "Quản trị kinh doanh, kinh tế đối ngoại, luật, quản lý dự án, tài chính ngân hàng, kỹ thuật hệ thống."
  },
  ENTP: {
    code: "ENTP",
    labelVi: "Người tư duy đổi mới và sáng tạo",
    temperamentCode: "NT",
    naturalStrengths:
      "Nhanh nhạy, giàu ý tưởng mới, khả năng lập luận linh hoạt và thích ứng nhanh với các chủ đề đa dạng.",
    learningStyle:
      "Học tốt qua hình thức tranh biện, thảo luận mở, giải quyết tình huống thực tế hơn là học thuộc lòng theo khuôn mẫu.",
    teamRole:
      "Người khởi xướng ý tưởng mới, phản biện đa chiều và tìm kiếm các hướng tiếp cận sáng tạo cho dự án.",
    growthNotes:
      "Giữ thái độ ôn hòa khi tranh luận trên lớp; rèn luyện tính kiên trì để theo đuổi và hoàn thiện ý tưởng đến bước cuối cùng.",
    referenceFields:
      "Truyền thông sáng tạo, khởi nghiệp, marketing, quan hệ công chúng, luật sư tranh tụng, thiết kế giải pháp công nghệ."
  },
  INFJ: {
    code: "INFJ",
    labelVi: "Người định hướng chiều sâu và nhân văn",
    temperamentCode: "NF",
    naturalStrengths:
      "Thấu cảm sâu sắc, biết lắng nghe, làm việc có mục đích và luôn hướng tới các giá trị tốt đẹp cho cộng đồng.",
    learningStyle:
      "Học tốt trong không gian yên tĩnh, thông qua việc đọc hiểu sâu, viết luận và liên hệ kiến thức bài học với ý nghĩa cuộc sống.",
    teamRole:
      "Người định hướng nội dung nhân văn, lắng nghe để dung hòa ý kiến và biên tập chiều sâu cho sản phẩm của nhóm.",
    growthNotes:
      "Chủ động chia sẻ suy nghĩ với thầy cô, bạn bè và tránh đặt tiêu chuẩn quá cầu toàn gây áp lực tâm lý cho chính mình.",
    referenceFields:
      "Tâm lý học, tham vấn học đường, giáo dục, biên kịch, văn học, công tác xã hội, nhân sự và đào tạo."
  },
  INFP: {
    code: "INFP",
    labelVi: "Người giàu nội tâm và sáng tạo",
    temperamentCode: "NF",
    naturalStrengths:
      "Trí tưởng tượng phong phú, nhạy bén với ngôn từ và nghệ thuật, chân thành và tôn trọng sự khác biệt cá nhân.",
    learningStyle:
      "Học hiệu quả khi được thể hiện góc nhìn cá nhân qua bài viết, dự án sáng tạo, hình ảnh hóa kiến thức thay vì ghi nhớ máy móc.",
    teamRole:
      "Người sáng tạo nội dung, viết kịch bản, thiết kế thẩm mỹ và giữ gìn sự tôn trọng lẫn nhau giữa các thành viên.",
    growthNotes:
      "Tập thiết lập các mốc thời gian cụ thể cho kế hoạch học tập để biến những ý tưởng bay bổng thành sản phẩm hoàn chỉnh đúng hạn.",
    referenceFields:
      "Sáng tạo nội dung (Content), thiết kế đồ họa, tâm lý học, ngôn ngữ học, nghệ thuật, truyền thông đa phương tiện."
  },
  ENFJ: {
    code: "ENFJ",
    labelVi: "Người dẫn dắt và thấu cảm",
    temperamentCode: "NF",
    naturalStrengths:
      "Giao tiếp truyền cảm hứng, quan tâm đến sự phát triển của tập thể, dễ dàng gắn kết và khích lệ tinh thần mọi người.",
    learningStyle:
      "Học tốt khi được trao đổi nhóm, hướng dẫn lại bài học cho bạn bè và tham gia các dự án có tính ứng dụng cộng đồng.",
    teamRole:
      "Người gắn kết tập thể, dẫn dắt thảo luận, thuyết trình và khích lệ tinh thần các thành viên khi gặp bài khó.",
    growthNotes:
      "Học cách cân bằng giữa việc hỗ trợ bạn bè và dành thời gian cho mục tiêu cá nhân; tập từ chối khéo léo khi bản thân quá tải.",
    referenceFields:
      "Sư phạm, quản trị nhân sự, truyền thông đối ngoại, tư vấn tâm lý, quản lý giáo dục, tổ chức sự kiện."
  },
  ENFP: {
    code: "ENFP",
    labelVi: "Người giàu ý tưởng và nhiệt huyết",
    temperamentCode: "NF",
    naturalStrengths:
      "Năng động, cởi mở, khả năng liên kết thông tin sáng tạo và luôn mang lại bầu không khí tích cực cho lớp học.",
    learningStyle:
      "Học hiệu quả qua các hoạt động tương tác, làm dự án đa môn, khám phá chủ đề mới mẻ và trao đổi ý tưởng tự do.",
    teamRole:
      "Người đóng góp ý tưởng mới, khuấy động không khí làm việc, truyền thông và thuyết trình sản phẩm trước lớp.",
    growthNotes:
      "Rèn luyện kỹ năng quản lý thời gian, lập danh sách việc cần làm để hoàn thành trọn vẹn từng mục tiêu thay vì ôm đồm nhiều việc.",
    referenceFields:
      "Báo chí truyền thông, quảng cáo, quan hệ quốc tế, nghệ thuật biểu diễn, du lịch văn hóa, tâm lý giáo dục."
  },
  ISTJ: {
    code: "ISTJ",
    labelVi: "Người làm việc nguyên tắc và trách nhiệm",
    temperamentCode: "SJ",
    naturalStrengths:
      "Cẩn trọng, làm việc có kế hoạch rõ ràng, ghi nhớ dữ kiện chính xác và luôn hoàn thành nhiệm vụ đúng hạn.",
    learningStyle:
      "Học tốt khi có đề cương chi tiết, tài liệu cấu trúc rõ ràng, ôn tập theo từng bước tuần tự và luyện tập qua các dạng bài cụ thể.",
    teamRole:
      "Người quản lý tài liệu, kiểm tra số liệu, rà soát lỗi chính xác và đảm bảo nhóm thực hiện đúng quy định đề bài.",
    growthNotes:
      "Thử nghiệm thêm các phương pháp tư duy mở và cởi mở lắng nghe những ý tưởng mới mẻ từ bạn bè khi cùng làm dự án.",
    referenceFields:
      "Kế toán, kiểm toán, tài chính ngân hàng, quản trị dữ liệu, hành chính pháp lý, kỹ thuật chất lượng, hậu cần (Logistics)."
  },
  ISFJ: {
    code: "ISFJ",
    labelVi: "Người chu đáo và tận tâm",
    temperamentCode: "SJ",
    naturalStrengths:
      "Kiên nhẫn, tỉ mỉ, quan sát tinh tế nhu cầu của người xung quanh và luôn sẵn sàng hỗ trợ tập thể một cách thầm lặng.",
    learningStyle:
      "Học hiệu quả qua việc ghi chép cẩn thận, thực hành theo hướng dẫn mẫu rõ ràng và ôn tập trong nhóm nhỏ quen thuộc.",
    teamRole:
      "Người hỗ trợ hậu cần, tổng hợp biên bản làm việc, chăm chút hình thức bài nộp và duy trì sự hòa thuận trong nhóm.",
    growthNotes:
      "Mạnh dạn bày tỏ chính kiến và mong muốn của bản thân trong các buổi thảo luận, đồng thời sẵn sàng thử sức ở những vai trò mới.",
    referenceFields:
      "Y điều dưỡng, dược học, giáo dục mầm non và tiểu học, công tác xã hội, quản trị văn phòng, dịch vụ chăm sóc khách hàng."
  },
  ESTJ: {
    code: "ESTJ",
    labelVi: "Người quản lý thực tế và kỷ luật",
    temperamentCode: "SJ",
    naturalStrengths:
      "Rõ ràng, thực tế, có năng lực tổ chức công việc khoa học và luôn hướng tới hiệu quả cụ thể trong học tập.",
    learningStyle:
      "Học tốt qua các bài giảng có cấu trúc chặt chẽ, mục tiêu đánh giá minh bạch và áp dụng ngay lý thuyết vào bài tập thực hành.",
    teamRole:
      "Người lập kế hoạch hành động, phân chia mốc thời gian (Timeline), đôn đốc tiến độ và kiểm soát chất lượng chung.",
    growthNotes:
      "Linh hoạt hơn trước các tình huống phát sinh ngoài kế hoạch và chú ý dùng ngôn từ khích lệ nhẹ nhàng khi góp ý cho bạn cùng nhóm.",
    referenceFields:
      "Quản trị kinh doanh, quản lý chuỗi cung ứng, tài chính doanh nghiệp, luật kinh tế, quản lý dự án xây dựng, hành chính công."
  },
  ESFJ: {
    code: "ESFJ",
    labelVi: "Người kết nối và hỗ trợ tập thể",
    temperamentCode: "SJ",
    naturalStrengths:
      "Hòa đồng, nhiệt tình, có trách nhiệm cao với tập thể và luôn tạo sự gắn kết ấm áp trong môi trường lớp học.",
    learningStyle:
      "Học hiệu quả khi được học nhóm, thảo luận trực tiếp với thầy cô, bạn bè và tham gia các hoạt động ngoại khóa thực tế.",
    teamRole:
      "Người điều phối giao tiếp trong nhóm, tổ chức các buổi họp mặt và kết nối các thành viên cùng hoàn thành mục tiêu.",
    growthNotes:
      "Tập làm quen với các phương pháp học tập độc lập và giảm bớt việc quá bận tâm đến những lời nhận xét khách quan từ xung quanh.",
    referenceFields:
      "Quản trị khách sạn và du lịch, truyền thông sự kiện, sư phạm, quản trị nhân sự, chăm sóc sức khỏe, quan hệ khách hàng."
  },
  ISTP: {
    code: "ISTP",
    labelVi: "Người phân tích kỹ thuật và thực hành",
    temperamentCode: "SP",
    naturalStrengths:
      "Quan sát thực tế tốt, bình tĩnh trước tình huống phát sinh, giỏi tìm hiểu cơ chế vận hành của công cụ và thiết bị.",
    learningStyle:
      "Học tốt nhất qua thực hành phòng thí nghiệm, tháo lắp mô hình, giải quyết bài toán thực tiễn ngắn gọn thay vì đọc lý thuyết dài.",
    teamRole:
      "Người phụ trách kỹ thuật, xử lý sự cố công nghệ, làm mô hình thực nghiệm và tối ưu hóa công cụ cho nhóm.",
    growthNotes:
      "Duy trì việc lập kế hoạch học tập theo từng học kỳ và chủ động trao đổi thông tin thường xuyên hơn với các thành viên trong nhóm.",
    referenceFields:
      "Kỹ thuật cơ khí, tự động hóa, công nghệ ô tô, kỹ thuật mạng máy tính, hàng không, kiến trúc cảnh quan, khoa học ứng dụng."
  },
  ISFP: {
    code: "ISFP",
    labelVi: "Người cảm nhận tinh tế và linh hoạt",
    temperamentCode: "SP",
    naturalStrengths:
      "Có gu thẩm mỹ tốt, sống chan hòa, tôn trọng không gian riêng của người khác và nhạy bén với các trải nghiệm giác quan.",
    learningStyle:
      "Học hiệu quả qua hình ảnh trực quan, video, thực hành nghệ thuật, làm sản phẩm thủ công hoặc trải nghiệm thực địa.",
    teamRole:
      "Người phụ trách thiết kế hình ảnh, trình bày bố cục sáng tạo (Slide, Poster) và mang lại sự nhẹ nhàng cho nhóm.",
    growthNotes:
      "Chia nhỏ các nhiệm vụ học tập lý thuyết thành từng phần ngắn để dễ dàng theo kịp tiến độ mà không cảm thấy bị gò bó.",
    referenceFields:
      "Thiết kế đồ họa, thiết kế thời trang và nội thất, nhiếp ảnh, truyền thông thị giác, ẩm thực, nghệ thuật ứng dụng."
  },
  ESTP: {
    code: "ESTP",
    labelVi: "Người hành động thực tiễn và nhạy bén",
    temperamentCode: "SP",
    naturalStrengths:
      "Nhạy bén với thực tế, thích hành động trực tiếp, ứng biến tình huống nhanh và không ngại thử sức với thử thách mới.",
    learningStyle:
      "Học tốt qua trò chơi mô phỏng, thực hành tại chỗ, giải quyết tình huống thực tế và các hoạt động vận động, tương tác cao.",
    teamRole:
      "Người triển khai hoạt động thực địa, thương lượng, giải quyết tình huống phát sinh và thuyết trình trực diện.",
    growthNotes:
      "Rèn luyện thói quen suy nghĩ kỹ về các bước thực hiện trước khi bắt tay vào làm và kiên nhẫn hơn với các môn học nặng về lý thuyết.",
    referenceFields:
      "Kinh doanh thương mại, marketing thực chiến, quản lý thể thao và giải trí, logistics, truyền thông sự kiện, kỹ thuật hiện trường."
  },
  ESFP: {
    code: "ESFP",
    labelVi: "Người năng động và giàu trải nghiệm",
    temperamentCode: "SP",
    naturalStrengths:
      "Vui vẻ, nhiệt tình, khả năng giao tiếp tự nhiên, dễ dàng thu hút sự chú ý và lan tỏa năng lượng tích cực cho tập thể.",
    learningStyle:
      "Học hiệu quả qua việc học đi đôi với hành, làm việc nhóm sôi nổi, đóng vai tình huống và sử dụng đa phương tiện.",
    teamRole:
      "Người thuyết trình, dẫn chương trình, tạo động lực cho nhóm và kết nối dự án của nhóm với khán giả trên lớp.",
    growthNotes:
      "Kết hợp việc học qua trải nghiệm thực tế với việc lập kế hoạch ôn tập lý thuyết định kỳ để đảm bảo kết quả học tập dài hạn.",
    referenceFields:
      "Tổ chức sự kiện, quan hệ công chúng (PR), du lịch và lữ hành, nghệ thuật biểu diễn, dẫn chương trình, truyền thông giải trí."
  }
}

export const OFFICIAL_DISCLAIMER_VI =
  "Kết quả khảo sát trên chỉ mang tính chất tham khảo tại thời điểm thực hiện và là công cụ hỗ trợ định hướng, không phản ánh toàn bộ năng lực hay giá trị con người bạn. Để hiểu sâu hơn về bản thân cũng như được giải đáp chi tiết các kết quả, bạn hãy chủ động kết nối với Giáo viên Chủ nhiệm hoặc Phòng Tham vấn Học đường của Hệ thống Giáo dục Sky-Line nhé!"

export function getTestConfig(testCode: SklPsychTestCode): SklPsychTestConfig {
  return SKL_PSYCH_CATALOG.find(c => c.code === testCode) || SKL_PSYCH_CATALOG[2]
}

export function getQuestionsByTestCode(testCode: SklPsychTestCode): any[] {
  switch (testCode) {
    case "DISC":
      return (discBankVi as any).questions || []
    case "EPI":
      return (epiBankVi as any).questions || []
    case "HOLLAND":
      return (hollandBankVi as any).questions || []
    case "LYUSIN_EQ":
      return (lyusinBankVi as any).questions || []
    case "MBTI":
      return (mbtiBankVi as any).questions || []
    default:
      return []
  }
}

export function isQuestionAnswered(testCode: SklPsychTestCode, val: any): boolean {
  if (val === null || val === undefined) return false
  if (testCode === "DISC") {
    return (
      typeof val === "object" &&
      typeof val.most === "number" &&
      typeof val.least === "number" &&
      val.most >= 0 &&
      val.least >= 0 &&
      val.most !== val.least
    )
  }
  if (testCode === "EPI" || testCode === "HOLLAND") {
    return typeof val === "boolean" || val === 1 || val === 0 || val === "YES" || val === "NO"
  }
  if (testCode === "LYUSIN_EQ") {
    return typeof val === "number" && val >= 0 && val <= 3
  }
  if (testCode === "MBTI") {
    return val === "A" || val === "B"
  }
  return false
}

export function normalizeAnswersArray(
  testCode: SklPsychTestCode,
  rawAnswers: any
): any[] {
  const questions = getQuestionsByTestCode(testCode)
  const total = questions.length
  if (Array.isArray(rawAnswers)) {
    const arr = Array(total).fill(null)
    for (let i = 0; i < Math.min(total, rawAnswers.length); i++) {
      arr[i] = rawAnswers[i]
    }
    return arr
  }
  if (rawAnswers && typeof rawAnswers === "object") {
    const arr = Array(total).fill(null)
    for (let i = 0; i < total; i++) {
      const q = questions[i]
      const k1 = String(i)
      const k2 = String(q?.id ?? i + 1)
      const k3 = `${q?.category || "R"}${String((i % 18) + 1).padStart(2, "0")}`
      const v = rawAnswers[k1] ?? rawAnswers[k2] ?? rawAnswers[k3]
      if (v !== undefined) {
        if (testCode === "HOLLAND" || testCode === "EPI") {
          arr[i] = v === true || v === 1 || v === "YES" || v === "1"
        } else {
          arr[i] = v
        }
      }
    }
    return arr
  }
  return Array(total).fill(null)
}

const EPI_E_YES = [1, 3, 8, 10, 13, 17, 22, 25, 27, 39, 44, 46, 49, 53, 56]
const EPI_E_NO = [5, 15, 20, 29, 32, 34, 37, 41, 51]
const EPI_N_YES = [
  2, 4, 7, 9, 11, 14, 16, 19, 21, 23, 26, 28, 31, 33, 35, 38, 40, 43, 45, 47, 50, 52, 55, 57
]
const EPI_L_YES = [6, 24, 36]
const EPI_L_NO = [12, 18, 30, 42, 48, 54]

const DISC_KEY_MAP: Record<string, "D" | "I" | "S" | "C" | null> = {
  O: "D",
  A: "I",
  B: "S",
  P: "C",
  N: null
}

export interface ScoredPsychResult {
  testCode: SklPsychTestCode
  testName: string
  answeredCount: number
  totalQuestions: number
  primaryResultCode: string
  primaryResultLabel: string
  validityStatus: "VALID" | "WARNING"
  scoresSummary: Record<string, any>
  profileAnalysis: Record<string, any>
  hollandReport?: ReturnType<typeof calculateHollandResult>
}

export function scorePsychAssessment(
  testCode: SklPsychTestCode,
  rawAnswers: any
): ScoredPsychResult {
  const cfg = getTestConfig(testCode)
  const questions = getQuestionsByTestCode(testCode)
  const answers = normalizeAnswersArray(testCode, rawAnswers)
  const answeredCount = answers.filter(v => isQuestionAnswered(testCode, v)).length

  if (testCode === "HOLLAND") {
    const hollandMap: Record<string, boolean> = {}
    answers.forEach((v, idx) => {
      if (v === true || v === false) {
        hollandMap[String(idx + 1)] = v
      }
    })
    const hr = calculateHollandResult(hollandMap)
    return {
      testCode: "HOLLAND",
      testName: cfg.name,
      answeredCount: hr.answeredCount,
      totalQuestions: 108,
      primaryResultCode: hr.hollandCode,
      primaryResultLabel: hr.primaryResultLabel,
      validityStatus: "VALID",
      scoresSummary: {
        HOLLAND: {
          scores: hr.scores,
          maxScorePerGroup: 18,
          top3: hr.top3Codes,
          top3Code: hr.hollandCode,
          tieNotice: hr.tieNotice,
          groupDetails: hr.rankedDimensions.map(d => ({
            code: d.code,
            rank: d.rank,
            score: d.rawScore
          }))
        }
      },
      profileAnalysis: {
        description: hr.combinedInterpretation,
        tieNotice: hr.tieNotice,
        strengths: hr.strengths,
        suggestedCareers: hr.suggestedCareers,
        skylineSubjectCombinations: hr.skylineSubjectCombinations
      },
      hollandReport: hr
    }
  }

  if (testCode === "EPI") {
    let eScore = 0
    let nScore = 0
    let lScore = 0

    EPI_E_YES.forEach(qId => {
      if (answers[qId - 1] === true) eScore++
    })
    EPI_E_NO.forEach(qId => {
      if (answers[qId - 1] === false) eScore++
    })
    EPI_N_YES.forEach(qId => {
      if (answers[qId - 1] === true) nScore++
    })
    EPI_L_YES.forEach(qId => {
      if (answers[qId - 1] === true) lScore++
    })
    EPI_L_NO.forEach(qId => {
      if (answers[qId - 1] === false) lScore++
    })

    const temperament: "Sanguine" | "Choleric" | "Phlegmatic" | "Melancholic" =
      eScore >= 12
        ? nScore >= 12
          ? "Choleric"
          : "Sanguine"
        : nScore >= 12
        ? "Melancholic"
        : "Phlegmatic"

    const prof = EPI_TEMPERAMENT_PROFILES[temperament]
    const validityStatus = lScore >= 5 ? "WARNING" : "VALID"

    return {
      testCode: "EPI",
      testName: cfg.name,
      answeredCount,
      totalQuestions: 57,
      primaryResultCode: temperament,
      primaryResultLabel: `Khí chất ${prof.vietnameseName}`,
      validityStatus,
      scoresSummary: {
        EPI: {
          e_score: eScore,
          n_score: nScore,
          l_score: lScore,
          temperament
        }
      },
      profileAnalysis: {
        description: prof.description,
        strengths: prof.strengths,
        suggestedCareers: prof.suggestedCareers,
        lieWarning:
          lScore >= 5
            ? "Điểm L cao (≥ 5), phản ánh xu hướng trả lời theo kỳ vọng xã hội. Nên tham vấn thêm cùng Giáo viên Cố vấn."
            : null
      }
    }
  }

  if (testCode === "DISC") {
    const dimensions: Record<"D" | "I" | "S" | "C", { most: number; least: number; net: number }> = {
      D: { most: 0, least: 0, net: 0 },
      I: { most: 0, least: 0, net: 0 },
      S: { most: 0, least: 0, net: 0 },
      C: { most: 0, least: 0, net: 0 }
    }

    questions.forEach((q, idx) => {
      const ans = answers[idx]
      if (!ans || typeof ans !== "object") return
      const opts = q.options || []
      const mostOpt = opts[ans.most]
      const leastOpt = opts[ans.least]
      if (mostOpt?.most_key) {
        const dKey = DISC_KEY_MAP[mostOpt.most_key]
        if (dKey) dimensions[dKey].most++
      }
      if (leastOpt?.least_key) {
        const dKey = DISC_KEY_MAP[leastOpt.least_key]
        if (dKey) dimensions[dKey].least++
      }
    })

    ;(["D", "I", "S", "C"] as const).forEach(k => {
      dimensions[k].net = dimensions[k].most - dimensions[k].least
    })

    const sorted = (["D", "I", "S", "C"] as const).slice().sort((a, b) => {
      const diff = dimensions[b].net - dimensions[a].net
      return diff !== 0 ? diff : dimensions[b].most - dimensions[a].most
    })

    const primary = sorted[0]
    const secondary = sorted[1]
    const pattern = `${primary}${secondary}`
    const pMeta = DISC_STYLE_TABLE[primary]
    const sMeta = DISC_STYLE_TABLE[secondary]

    return {
      testCode: "DISC",
      testName: cfg.name,
      answeredCount,
      totalQuestions: 28,
      primaryResultCode: pattern,
      primaryResultLabel: `Phong cách ${pattern} – ${pMeta.displayName} & ${sMeta.displayName}`,
      validityStatus: "VALID",
      scoresSummary: {
        DISC: {
          primary,
          secondary,
          pattern,
          dimensions
        }
      },
      profileAnalysis: {
        description: `Mã phong cách hành vi chủ đạo của bạn là ${pattern} — kết hợp giữa ${pMeta.groupLabel} (${pMeta.displayName}) và ${sMeta.groupLabel} (${sMeta.displayName}). ${pMeta.academicStrengths}`,
        strengths: [pMeta.academicStrengths, pMeta.teamRole, sMeta.academicStrengths],
        improvementNote: pMeta.improvementNote
      }
    }
  }

  if (testCode === "LYUSIN_EQ") {
    const subScores: Record<string, number> = { MP: 0, MU: 0, VP: 0, VU: 0, VE: 0 }
    questions.forEach((q, idx) => {
      const raw = answers[idx]
      if (typeof raw !== "number" || raw < 0 || raw > 3) return
      const scale = q.scale as string
      const val = q.direction === "-" ? 3 - raw : raw
      if (subScores[scale] !== undefined) {
        subScores[scale] += val
      }
    })

    const MEI = subScores.MP + subScores.MU
    const VEI = subScores.VP + subScores.VU + subScores.VE
    const PE = subScores.MP + subScores.VP
    const UE = subScores.MU + subScores.VU + subScores.VE
    const totalEI = MEI + VEI

    const compositeScales: Record<string, { score: number; maxScore: number; percentage: number }> = {
      MEI: { score: MEI, maxScore: 66, percentage: Math.round((MEI / 66) * 100) },
      VEI: { score: VEI, maxScore: 72, percentage: Math.round((VEI / 72) * 100) },
      PE: { score: PE, maxScore: 66, percentage: Math.round((PE / 66) * 100) },
      UE: { score: UE, maxScore: 72, percentage: Math.round((UE / 72) * 100) }
    }

    const subScales: Record<string, { score: number; maxScore: number; percentage: number }> = {}
    LYUSIN_EQ_SCALES.filter(s => s.type === "SUBSCALE").forEach(s => {
      const sc = subScores[s.code] || 0
      subScales[s.code] = {
        score: sc,
        maxScore: s.maxScore,
        percentage: Math.round((sc / s.maxScore) * 100)
      }
    })

    const scalesDetail = LYUSIN_EQ_SCALES.map(s => {
      const obj = s.type === "COMPOSITE" ? compositeScales[s.code] : subScales[s.code]
      return {
        code: s.code,
        nameVi: s.nameVi,
        type: s.type,
        score: obj.score,
        maxScore: s.maxScore,
        percentage: obj.percentage,
        description: s.description
      }
    })

    const subList = scalesDetail.filter(s => s.type === "SUBSCALE")
    const highestSubs = [...subList].sort((a, b) => b.percentage - a.percentage || b.score - a.score)
    const lowestSubs = [...subList].sort((a, b) => a.percentage - b.percentage || a.score - b.score)

    const pct = Math.round((totalEI / 138) * 100)

    return {
      testCode: "LYUSIN_EQ",
      testName: cfg.name,
      answeredCount,
      totalQuestions: 46,
      primaryResultCode: `EI ${pct}%`,
      primaryResultLabel: `Chỉ số Trí tuệ Cảm xúc: ${totalEI}/138 điểm (${pct}%)`,
      validityStatus: "VALID",
      scoresSummary: {
        LYUSIN_EQ: {
          totalEI: { score: totalEI, maxScore: 138, percentage: pct },
          compositeScales,
          subScales,
          scalesDetail
        }
      },
      profileAnalysis: {
        description:
          "Trí tuệ cảm xúc không chỉ là một con số. Kết quả dưới đây giúp bạn hiểu rõ hơn cách mình nhận diện, thấu hiểu và điều chỉnh cảm xúc của bản thân cũng như người khác.",
        closingMessage:
          "Kết quả phản ánh câu trả lời trong bài trắc nghiệm, không phải đánh giá cố định về con người bạn. Năng lực cảm xúc có thể tiếp tục được phát triển qua trải nghiệm và thực hành.",
        highlights: highestSubs
          .slice(0, 3)
          .map(
            s => `${s.code} – ${s.nameVi} (${s.score}/${s.maxScore} điểm - ${s.percentage}%): ${s.description}`
          ),
        developmentAreas: lowestSubs
          .slice(0, 2)
          .map(
            s =>
              `${s.code} – ${s.nameVi} (${s.score}/${s.maxScore} điểm - ${s.percentage}%): Bạn có thể tiếp tục tìm hiểu và rèn luyện thêm ${s.description.charAt(0).toLowerCase() + s.description.slice(1)}`
          ),
        scalesDetail
      }
    }
  }

  // MBTI
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  questions.forEach((q, idx) => {
    const val = answers[idx]
    if (val !== "A" && val !== "B") return
    const opt = (q.options || []).find((o: any) => o.value === val)
    const trait = opt?.trait as keyof typeof counts
    if (trait && counts[trait] !== undefined) {
      counts[trait]++
    }
  })

  const code = `${counts.E >= counts.I ? "E" : "I"}${counts.S >= counts.N ? "S" : "N"}${
    counts.T >= counts.F ? "T" : "F"
  }${counts.J >= counts.P ? "J" : "P"}`

  const mbtiProf = MBTI_PROFILES[code] || MBTI_PROFILES.ENFP

  return {
    testCode: "MBTI",
    testName: cfg.name,
    answeredCount,
    totalQuestions: 70,
    primaryResultCode: code,
    primaryResultLabel: `Nhóm ${code} – ${mbtiProf.labelVi}`,
    validityStatus: "VALID",
    scoresSummary: {
      MBTI: {
        code,
        temperamentCode: mbtiProf.temperamentCode,
        dimensions: {
          EI: { E: counts.E, I: counts.I },
          SN: { S: counts.S, N: counts.N },
          TF: { T: counts.T, F: counts.F },
          JP: { J: counts.J, P: counts.P }
        }
      }
    },
    profileAnalysis: {
      description: mbtiProf.naturalStrengths,
      learningStyle: mbtiProf.learningStyle,
      teamRole: mbtiProf.teamRole,
      growthNotes: mbtiProf.growthNotes,
      referenceFields: mbtiProf.referenceFields
    }
  }
}

export { RIASEC_PROFILES, SKYLINE_SUBJECT_COMBINATIONS, type RiasecCode }
