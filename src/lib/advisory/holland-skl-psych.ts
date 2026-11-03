export const SKL_PSYCH_VERSION = "SKL_PSYCH v2.6.1"

export type RiasecCode = "R" | "I" | "A" | "S" | "E" | "C"

export type HollandSubFacet = "ACTIVITY" | "COMPETENCY" | "OCCUPATION"

export interface HollandQuestionItem {
  id: number // 1..108
  code: string // R01..R18, I01..I18, A01..A18, S01..S18, E01..E18, C01..C18
  dimension: RiasecCode
  groupName: string // e.g. "Kỹ thuật (Realistic)"
  prefix: string // "Tôi là người" | "Tôi có thể" | "Tôi thích"
  subText: string // e.g. "yêu thích vận động"
  partIndex: number // 1..6
  indexInPart: number // 1..18
  subFacet: HollandSubFacet
  subFacetLabel: string
  text: string // e.g. "Tôi là người: yêu thích vận động"
}

export interface RiasecDimensionProfile {
  code: RiasecCode
  nameVi: string
  nameEn: string
  role: string
  shortLabel: string
  tagline: string
  colorHex: string
  gradientClass: string
  bgSoftClass: string
  textClass: string
  borderClass: string
  badgeClass: string
  traits: string[]
  strengths: string[]
  learningStyle: string
  recommendedSubjects: string[]
  skylineSubjectCombinations: string[]
  careerClusters: string[]
  skylineActivities: string[]
  smartGoalSuggestions: string[]
  parentAccompanimentTips: string[]
}

export const RIASEC_ORDER: RiasecCode[] = ["R", "I", "A", "S", "E", "C"]

export const RIASEC_HEXAGON_NEIGHBORS: Record<RiasecCode, [RiasecCode, RiasecCode]> = {
  R: ["C", "I"],
  I: ["R", "A"],
  A: ["I", "S"],
  S: ["A", "E"],
  E: ["S", "C"],
  C: ["E", "R"]
}

export const SKYLINE_SUBJECT_COMBINATIONS: Record<RiasecCode, string[]> = {
  R: ["A00 (Toán, Lý, Hóa)", "A01 (Toán, Lý, Anh)"],
  I: ["A00 (Toán, Lý, Hóa)", "B00 (Toán, Hóa, Sinh)", "A01 (Toán, Lý, Anh)"],
  A: ["V00 (Toán, Lý, Vẽ)", "H00 (Văn, Năng khiếu Vẽ)", "D01 (Toán, Văn, Anh)"],
  S: ["D01 (Toán, Văn, Anh)", "C00 (Văn, Sử, Địa)", "B00 (Toán, Hóa, Sinh)"],
  E: ["D01 (Toán, Văn, Anh)", "A01 (Toán, Lý, Anh)", "D07 (Toán, Hóa, Anh)"],
  C: ["A00 (Toán, Lý, Hóa)", "A01 (Toán, Lý, Anh)", "D01 (Toán, Văn, Anh)"]
}

export const HOLLAND_OFFICIAL_INSTRUCTIONS =
  "Đây là bài trắc nghiệm Holland giúp bạn khám phá sở thích nghề nghiệp. Hãy đọc từng câu và chọn “Có” hoặc “Không” theo đúng suy nghĩ của bản thân, đừng suy nghĩ quá lâu nhé!"

export const HOLLAND_OFFICIAL_DISCLAIMER =
  "Kết quả khảo sát trên chỉ mang tính chất tham khảo tại thời điểm thực hiện và là công cụ hỗ trợ định hướng, không phản ánh toàn bộ năng lực hay giá trị con người bạn. Để hiểu sâu hơn về bản thân cũng như được giải đáp chi tiết các kết quả, bạn hãy liên hệ với Phòng Tâm lý và Hướng nghiệp học đường Sky-Line nhé."

export const RIASEC_PROFILES: Record<RiasecCode, RiasecDimensionProfile> = {
  R: {
    code: "R",
    nameVi: "Kỹ thuật (Realistic)",
    nameEn: "Realistic (The Doer)",
    role: "Người hành động",
    shortLabel: "R • Kỹ thuật",
    tagline:
      "Thích vận động thể thao, làm việc với máy móc, công cụ thực tế, kỹ thuật, cây cảnh hoặc động vật ngoài trời.",
    colorHex: "#0D9488",
    gradientClass: "from-emerald-500 to-teal-600",
    bgSoftClass: "bg-teal-50",
    textClass: "text-teal-800",
    borderClass: "border-teal-200",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
    traits: [
      "Thực tế, cụ thể, thích bắt tay vào làm trực tiếp hơn là chỉ nói lý thuyết",
      "Khéo léo khi thao tác với công cụ, thiết bị điện tử, cơ khí, mô hình hoặc vận động thể chất",
      "Kiên trì, trung thực, yêu thích các kết quả hữu hình, rõ ràng"
    ],
    strengths: [
      "Khéo léo tay chân & thao tác thực hành",
      "Tư duy cơ khí, kỹ thuật thực tiễn",
      "Kiên trì, bền bỉ và chịu khó",
      "Nhanh nhạy trong xử lý sự cố thiết bị"
    ],
    learningStyle:
      "Học hiệu quả nhất qua thực hành phòng thí nghiệm (Lab), dự án chế tạo STEM/Robotics, mô phỏng trực quan và trải nghiệm thực tế.",
    recommendedSubjects: ["Toán học", "Vật lí", "Tin học / ICT", "Công nghệ", "Hóa học"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.R,
    careerClusters: [
      "Kỹ sư cơ khí & tự động hóa",
      "Lập trình phần cứng / IoT & Robotics",
      "Kiến trúc sư xây dựng công trình",
      "Nông nghiệp công nghệ cao & Môi trường",
      "Phi công, Hàng hải & Kỹ thuật vận hành"
    ],
    skylineActivities: [
      "CLB STEM – Robotics & Chế tạo mô hình kỹ thuật Sky-Line",
      "Dự án Khoa học kỹ thuật thực nghiệm & Ngày hội STEM Day",
      "Hoạt động trải nghiệm sinh tồn, thể thao vận động và kỹ năng thực hành"
    ],
    smartGoalSuggestions: [
      "Hoàn thành 01 sản phẩm thực hành STEM/Robotics hoặc mô hình kỹ thuật ứng dụng trong học kỳ và trình bày tại lớp.",
      "Duy trì điểm trung bình các môn Toán – Lý – Tin từ 8.0 trở lên để chuẩn bị nền tảng khối ngành Kỹ thuật – Công nghệ."
    ],
    parentAccompanimentTips: [
      "Tạo điều kiện cho con tham gia các hoạt động sửa chữa, lắp ráp mô hình, lập trình phần cứng hoặc trải nghiệm thực địa.",
      "Khuyến khích con kết hợp giữa thực hành kỹ thuật với rèn luyện kỹ năng trình bày và làm việc nhóm."
    ]
  },
  I: {
    code: "I",
    nameVi: "Nghiên cứu (Investigative)",
    nameEn: "Investigative (The Thinker)",
    role: "Người tư duy",
    shortLabel: "I • Nghiên cứu",
    tagline:
      "Thích quan sát, tìm hiểu, tra cứu, phân tích dữ liệu, đánh giá và giải quyết các bài toán khoa học phức tạp.",
    colorHex: "#4F46E5",
    gradientClass: "from-blue-500 to-indigo-600",
    bgSoftClass: "bg-indigo-50",
    textClass: "text-indigo-800",
    borderClass: "border-indigo-200",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
    traits: [
      "Tò mò trí tuệ, luôn đặt câu hỏi 'Tại sao?' và 'Như thế nào?' trước mọi hiện tượng",
      "Thích suy luận logic, đọc tài liệu chuyên sâu, làm thí nghiệm và phân tích nguyên nhân gốc rễ",
      "Độc lập, cẩn trọng, đề cao bằng chứng khoa học và tính chính xác"
    ],
    strengths: [
      "Tư duy phản biện và suy luận logic sắc bén",
      "Khả năng phân tích trừu tượng & dữ liệu",
      "Tập trung nghiên cứu độc lập chuyên sâu",
      "Đam mê khám phá bản chất khoa học"
    ],
    learningStyle:
      "Học tốt qua phương pháp truy vấn (Inquiry-based learning), giải quyết bài toán mở, nghiên cứu khoa học và đọc tài liệu chuyên sâu.",
    recommendedSubjects: ["Toán học", "Hóa học", "Sinh học", "Vật lí", "Tin học & Tiếng Anh học thuật"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.I,
    careerClusters: [
      "Chuyên gia Khoa học dữ liệu (Data Scientist)",
      "Kỹ sư Trí tuệ nhân tạo (AI Engineer) & Phần mềm",
      "Bác sĩ, Dược sĩ & Chuyên gia Y sinh",
      "Nhà nghiên cứu Công nghệ sinh học / R&D",
      "Chuyên gia Phân tích tài chính & Kinh tế lượng"
    ],
    skylineActivities: [
      "Cuộc thi Nghiên cứu Khoa học Kỹ thuật & Đội tuyển Học sinh giỏi Sky-Line",
      "CLB Khoa học – Thí nghiệm, Lập trình thuật toán & Tranh biện học thuật",
      "Dự án tìm hiểu chuyên đề khoa học liên môn và viết báo cáo nghiên cứu nhỏ"
    ],
    smartGoalSuggestions: [
      "Thực hiện 01 đề tài tìm hiểu khoa học hoặc chuyên đề nghiên cứu chuyên sâu ở môn học thế mạnh trong học kỳ.",
      "Đạt mục tiêu đọc tối thiểu 02 cuốn sách/tài liệu khoa học chuyên ngành và tóm tắt thành sơ đồ tư duy (Mindmap)."
    ],
    parentAccompanimentTips: [
      "Lắng nghe và khuyến khích những câu hỏi đào sâu của con; hỗ trợ con tiếp cận sách khoa học, khóa học trực tuyến chất lượng.",
      "Đồng hành giúp con cân bằng giữa thời gian nghiên cứu cá nhân với các hoạt động giao tiếp xã hội và vận động thể chất."
    ]
  },
  A: {
    code: "A",
    nameVi: "Nghệ thuật (Artistic)",
    nameEn: "Artistic (The Creator)",
    role: "Người kiến tạo",
    shortLabel: "A • Nghệ thuật",
    tagline:
      "Giàu trí tưởng tượng, trực giác nhạy bén, thích sáng tạo trong các tình huống linh hoạt không bị gò bó bởi quy tắc cứng nhắc.",
    colorHex: "#7C3AED",
    gradientClass: "from-purple-500 to-pink-600",
    bgSoftClass: "bg-purple-50",
    textClass: "text-purple-800",
    borderClass: "border-purple-200",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    traits: [
      "Giàu cảm xúc, trực giác nhạy bén, luôn tìm kiếm góc nhìn mới mẻ và sáng tạo",
      "Yêu thích cái đẹp trong ngôn từ, hình ảnh, âm thanh, không gian hoặc trình diễn",
      "Không thích sự rập khuôn cứng nhắc; phát huy tối đa trong môi trường cởi mở, khuyến khích ý tưởng mới"
    ],
    strengths: [
      "Cảm quan thẩm mỹ tinh tế & giàu trí tưởng tượng",
      "Tư duy hình ảnh và cảm xúc phong phú",
      "Đổi mới sáng tạo và mang đậm dấu ấn cá nhân",
      "Truyền đạt ấn tượng qua nghệ thuật thị giác, ngôn từ hoặc âm nhạc"
    ],
    learningStyle:
      "Học hiệu quả qua hình ảnh trực quan (Visual learning), sơ đồ tư duy màu sắc, dự án sáng tạo sản phẩm truyền thông, viết sáng tạo và nghệ thuật.",
    recommendedSubjects: ["Ngữ Văn", "Tiếng Anh", "Mỹ thuật – Thiết kế", "Âm nhạc", "Tin học đồ họa"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.A,
    careerClusters: [
      "Nhà thiết kế Đồ họa / UX-UI & Multimedia",
      "Đạo diễn truyền thông số & Sáng tạo nội dung",
      "Kiến trúc sư nội thất & Thiết kế thời trang",
      "Nhà văn, Biên kịch, Báo chí – Truyền thông",
      "Nhiếp ảnh gia nghệ thuật & Nghệ thuật biểu diễn"
    ],
    skylineActivities: [
      "CLB Truyền thông – Nhiếp ảnh, Thiết kế ấn phẩm & Ban biên tập Nội san Sky-Line",
      "CLB Âm nhạc, Mỹ thuật sáng tạo, Kịch nghệ & Sự kiện văn hóa nghệ thuật trường",
      "Xây dựng Portfolio cá nhân (Thiết kế, bài viết sáng tạo, video dự án học tập)"
    ],
    smartGoalSuggestions: [
      "Xây dựng Portfolio cá nhân gồm tối thiểu 03 sản phẩm sáng tạo (thiết kế, bài viết, video hoặc dự án nghệ thuật) trong năm học.",
      "Nâng cao năng lực Ngữ văn và Tiếng Anh để phục vụ định hướng ngành Truyền thông – Thiết kế sáng tạo quốc tế."
    ],
    parentAccompanimentTips: [
      "Tôn trọng không gian sáng tạo và cá tính thẩm mỹ của con; khích lệ các sản phẩm nghệ thuật, thiết kế hoặc bài viết của con.",
      "Hướng dẫn con rèn luyện thêm tính kỷ luật thời gian và lập kế hoạch để biến ý tưởng sáng tạo thành sản phẩm hoàn chỉnh."
    ]
  },
  S: {
    code: "S",
    nameVi: "Xã hội (Social)",
    nameEn: "Social (The Helper)",
    role: "Người đồng hành",
    shortLabel: "S • Xã hội",
    tagline:
      "Thích tương tác, giúp đỡ, đào tạo, chữa lành và phục vụ cộng đồng; coi trọng sự thấu cảm và các mối quan hệ con người.",
    colorHex: "#D97706",
    gradientClass: "from-amber-500 to-orange-600",
    bgSoftClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    traits: [
      "Thân thiện, ấm áp, biết lắng nghe và dễ dàng đồng cảm với suy nghĩ, cảm xúc của người khác",
      "Thích làm việc nhóm, giảng giải, hỗ trợ bạn bè, tham gia hoạt động thiện nguyện và vì cộng đồng",
      "Đề cao giá trị nhân văn, sự hòa hợp, công bằng và trách nhiệm xã hội"
    ],
    strengths: [
      "Thấu cảm sâu sắc và biết lắng nghe chân thành",
      "Giao tiếp truyền cảm hứng và diễn đạt rõ ràng",
      "Tinh thần đồng đội, hợp tác và kết nối mọi người",
      "Kiên nhẫn trong việc hướng dẫn, hỗ trợ người khác"
    ],
    learningStyle:
      "Học tốt nhất qua thảo luận nhóm, học tập hợp tác (Peer learning), thuyết trình, đóng vai và các dự án phục vụ cộng đồng (Service learning).",
    recommendedSubjects: ["Ngữ Văn", "Tiếng Anh", "Lịch sử – Địa lí", "Giáo dục Kinh tế & Pháp luật", "Sinh học"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.S,
    careerClusters: [
      "Chuyên viên Tâm lý học đường & Tham vấn",
      "Giáo viên, Giảng viên & Đào tạo phát triển",
      "Chuyên viên Quản trị nhân sự (HR)",
      "Bác sĩ / Điều dưỡng chăm sóc sức khỏe cộng đồng",
      "Chuyên gia Quan hệ công chúng (PR) & Ngoại giao"
    ],
    skylineActivities: [
      "Dự án Thiện nguyện vì cộng đồng, Đại sứ Nhân ái & Hoạt động Trải nghiệm Sky-Line",
      "Đội ngũ Mentor hỗ trợ bạn học cùng tiến (Peer Tutoring) & Ban cán sự đồng hành lớp",
      "CLB Kỹ năng sống, Tâm lý học đường & Giao lưu văn hóa quốc tế"
    ],
    smartGoalSuggestions: [
      "Tham gia tích cực tối thiểu 02 dự án cộng đồng/thiện nguyện hoặc hỗ trợ bạn học cùng tiến tại lớp trong học kỳ.",
      "Rèn luyện kỹ năng thuyết trình song ngữ Việt – Anh và nâng điểm các môn Xã hội – Ngoại ngữ đạt từ 8.0 trở lên."
    ],
    parentAccompanimentTips: [
      "Trò chuyện thường xuyên cùng con về các vấn đề xã hội, con người và khuyến khích con tham gia hoạt động cộng đồng.",
      "Nhắc nhở con biết chăm sóc cảm xúc bản thân và giữ sự khách quan khi hỗ trợ người khác."
    ]
  },
  E: {
    code: "E",
    nameVi: "Quản lý (Enterprising)",
    nameEn: "Enterprising (The Leader)",
    role: "Người dẫn dắt",
    shortLabel: "E • Quản lý",
    tagline:
      "Thích phiêu lưu, quyết đoán, tự tin, có tài thuyết phục, đàm phán và khả năng lãnh đạo nhóm hướng tới mục tiêu kinh doanh.",
    colorHex: "#E11D48",
    gradientClass: "from-rose-500 to-red-600",
    bgSoftClass: "bg-rose-50",
    textClass: "text-rose-800",
    borderClass: "border-rose-200",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    traits: [
      "Tự tin, giàu năng lượng, dám nghĩ dám làm và thích đảm nhận vai trò dẫn dắt tập thể",
      "Có khả năng ăn nói thuyết phục, đàm phán, tổ chức sự kiện và khởi xướng dự án mới",
      "Hướng tới mục tiêu, thành tích, hiệu quả kinh tế và tầm ảnh hưởng tích cực"
    ],
    strengths: [
      "Năng lực lãnh đạo và tổ chức điều phối nhóm",
      "Kỹ năng đàm phán, thương lượng và thuyết phục tốt",
      "Nhạy bén với cơ hội thị trường và dự án mới",
      "Quyết đoán và sẵn sàng nhận trách nhiệm"
    ],
    learningStyle:
      "Học hiệu quả qua làm trưởng nhóm dự án, tranh biện (Debate), mô phỏng kinh doanh – khởi nghiệp, tổ chức sự kiện và thử thách thực tế.",
    recommendedSubjects: ["Toán học", "Tiếng Anh", "Ngữ Văn", "Giáo dục Kinh tế & Pháp luật", "Tin học"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.E,
    careerClusters: [
      "Nhà sáng lập Khởi nghiệp (Startup Founder) & Quản trị kinh doanh",
      "Giám đốc Kinh doanh & Marketing chiến lược",
      "Luật sư thương mại & Kinh tế quốc tế",
      "Quản lý dự án quốc tế & Tổ chức sự kiện",
      "Chuyên gia Đầu tư tài chính & Thương mại điện tử"
    ],
    skylineActivities: [
      "Ban Cán sự lớp, Hội đồng Học sinh (Student Council) & Ban Tổ chức sự kiện Sky-Line",
      "CLB Tranh biện (Debate), Hùng biện Tiếng Anh & Dự án Khởi nghiệp học sinh",
      "Chủ trì điều phối 01 dự án học tập liên môn hoặc gian hàng gây quỹ tại trường"
    ],
    smartGoalSuggestions: [
      "Đảm nhận vai trò Trưởng nhóm/Điều phối viên trong tối thiểu 01 dự án học tập hoặc hoạt động ngoại khóa của lớp trong học kỳ.",
      "Đạt chứng chỉ Tiếng Anh quốc tế (IELTS/Cambridge) và điểm trung bình Toán – Anh – GDKT&PL từ 8.0 trở lên."
    ],
    parentAccompanimentTips: [
      "Trao quyền cho con tự lập kế hoạch cá nhân, quản lý chi tiêu nhỏ hoặc tổ chức các hoạt động gia đình.",
      "Định hướng con rèn luyện tính kiên nhẫn, biết lắng nghe ý kiến đa chiều và chú trọng chi tiết khi lãnh đạo nhóm."
    ]
  },
  C: {
    code: "C",
    nameVi: "Nghiệp vụ (Conventional)",
    nameEn: "Conventional (The Organizer)",
    role: "Người tổ chức",
    shortLabel: "C • Nghiệp vụ",
    tagline:
      "Thích sự ngăn nắp, rõ ràng, làm việc theo quy trình chuẩn mực, kiểm soát dữ liệu, thống kê và văn bản chi tiết.",
    colorHex: "#0284C7",
    gradientClass: "from-cyan-500 to-sky-600",
    bgSoftClass: "bg-sky-50",
    textClass: "text-sky-800",
    borderClass: "border-sky-200",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
    traits: [
      "Ngăn nắp, cẩn thận, tỉ mỉ, thích sự rõ ràng, trật tự và có kế hoạch chi tiết",
      "Làm việc hiệu quả với con số, bảng biểu, hồ sơ, dữ liệu hệ thống và quy trình chuẩn mực",
      "Đáng tin cậy, có trách nhiệm cao, luôn hoàn thành nhiệm vụ đúng hạn và chính xác"
    ],
    strengths: [
      "Tỉ mỉ, cẩn thận và có độ chính xác cao",
      "Tuân thủ tốt quy trình, nguyên tắc và chuẩn mực",
      "Quản lý thời gian, hồ sơ và dữ liệu khoa học",
      "Kỷ luật cao và luôn đáng tin cậy"
    ],
    learningStyle:
      "Học tốt qua lộ trình rõ ràng, ghi chép hệ thống (Cornell Notes), bảng biểu tổng hợp, checklist tiến độ và bài tập rèn luyện có cấu trúc.",
    recommendedSubjects: ["Toán học", "Tin học / ICT", "Tiếng Anh", "Giáo dục Kinh tế & Pháp luật", "Vật lí – Hóa học"],
    skylineSubjectCombinations: SKYLINE_SUBJECT_COMBINATIONS.C,
    careerClusters: [
      "Kế toán trưởng, Kiểm toán viên (ACCA/CPA)",
      "Chuyên viên Phân tích hệ thống thông tin (BA / MIS)",
      "Chuyên viên Vận hành / Logistics & Chuỗi cung ứng",
      "Quản trị Cơ sở dữ liệu (DBA) & Thống kê",
      "Chuyên viên Thẩm định tín dụng, Ngân hàng & Pháp chế"
    ],
    skylineActivities: [
      "Ban Thư ký – Thủ quỹ lớp, Quản lý hồ sơ dự án & Điều phối hậu cần sự kiện Sky-Line",
      "CLB Tin học văn phòng quốc tế (MOS), Toán ứng dụng & Quản lý tài chính cá nhân",
      "Thiết lập hệ thống Sổ kế hoạch học tập (Study Planner) và theo dõi tiến độ 4 mốc kỳ"
    ],
    smartGoalSuggestions: [
      "Duy trì 100% kế hoạch tự học hàng tuần đúng hạn trên Sổ Mục tiêu SSM và không có bài tập nào nộp trễ hạn.",
      "Rèn luyện kỹ năng Tin học ứng dụng/Bảng tính dữ liệu và đạt điểm Toán – Tin – GDKT&PL từ 8.0 trở lên."
    ],
    parentAccompanimentTips: [
      "Ghi nhận sự chỉn chu, trách nhiệm của con; hỗ trợ con tìm hiểu các công cụ quản lý thời gian, tài chính và dữ liệu số.",
      "Khuyến khích con thử sức thêm với các tình huống mở để tăng tính linh hoạt và khả năng thích ứng khi kế hoạch thay đổi."
    ]
  }
}

/**
 * 108 Câu hỏi chuẩn hóa từ Hệ thống Khảo sát Tâm lý & Hướng nghiệp Sky-Line (epi.skylineschool.edu.vn — SKL_PSYCH v2.6.1)
 */
const OFFICIAL_108_RAW_QUESTIONS: Array<{
  id: number
  category: RiasecCode
  groupName: string
  prefix: string
  subText: string
  text: string
}> = [
  // NHÓM R: Kỹ thuật (Realistic) — Câu 1..18
  { id: 1, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "yêu thích vận động", text: "Tôi là người: yêu thích vận động" },
  { id: 2, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "thẳng thắn", text: "Tôi là người: thẳng thắn" },
  { id: 3, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "thích làm việc với máy móc, dụng cụ", text: "Tôi là người: thích làm việc với máy móc, dụng cụ" },
  { id: 4, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "thích sự cụ thể, rõ ràng", text: "Tôi là người: thích sự cụ thể, rõ ràng" },
  { id: 5, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "khép kín", text: "Tôi là người: khép kín" },
  { id: 6, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi là người", subText: "thích làm việc ngoài trời", text: "Tôi là người: thích làm việc ngoài trời" },
  { id: 7, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "sửa chữa các thiết bị điện/ ô tô, xe máy, xe đạp, …", text: "Tôi có thể: sửa chữa các thiết bị điện/ ô tô, xe máy, xe đạp, …" },
  { id: 8, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "chơi 1 môn thể thao", text: "Tôi có thể: chơi 1 môn thể thao" },
  { id: 9, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "đọc bản vẽ/ bản thiết kế", text: "Tôi có thể: đọc bản vẽ/ bản thiết kế" },
  { id: 10, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "sử dụng/ vận hành/ bảo trì máy móc, thiết bị", text: "Tôi có thể: sử dụng/ vận hành/ bảo trì máy móc, thiết bị" },
  { id: 11, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "sử dụng công cụ để tạo kiểu tóc mới cho mình", text: "Tôi có thể: sử dụng công cụ để tạo kiểu tóc mới cho mình" },
  { id: 12, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi có thể", subText: "tự may áo/váy/đầm cho mình", text: "Tôi có thể: tự may áo/váy/đầm cho mình" },
  { id: 13, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "làm vườn/ trồng cây xanh, hoa kiểng", text: "Tôi thích: làm vườn/ trồng cây xanh, hoa kiểng" },
  { id: 14, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "xây dựng/ lắp ráp mô hình", text: "Tôi thích: xây dựng/ lắp ráp mô hình" },
  { id: 15, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "vận động tay chân và sử dụng tay chân để làm việc", text: "Tôi thích: vận động tay chân và sử dụng tay chân để làm việc" },
  { id: 16, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "tự ráp đồ nội thất (bàn/ghế/tủ)/ tự đóng bàn, ghế, tủ,…", text: "Tôi thích: tự ráp đồ nội thất (bàn/ghế/tủ)/ tự đóng bàn, ghế, tủ,…" },
  { id: 17, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "nấu ăn/ làm bánh", text: "Tôi thích: nấu ăn/ làm bánh" },
  { id: 18, category: "R", groupName: "Kỹ thuật (Realistic)", prefix: "Tôi thích", subText: "tham dự khoá học kỹ thuật (điện, sữa chữa máy móc…)", text: "Tôi thích: tham dự khoá học kỹ thuật (điện, sữa chữa máy móc…)" },

  // NHÓM I: Nghiên cứu (Investigative) — Câu 19..36
  { id: 19, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "hiểu biết rộng", text: "Tôi là người: hiểu biết rộng" },
  { id: 20, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "thích làm việc một mình", text: "Tôi là người: thích làm việc một mình" },
  { id: 21, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "khả năng phân tích cao", text: "Tôi là người: khả năng phân tích cao" },
  { id: 22, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "suy nghĩ logic", text: "Tôi là người: suy nghĩ logic" },
  { id: 23, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "thích khoa học", text: "Tôi là người: thích khoa học" },
  { id: 24, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi là người", subText: "có khả năng quan sát tốt", text: "Tôi là người: có khả năng quan sát tốt" },
  { id: 25, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "suy nghĩ trừu tượng", text: "Tôi có thể: suy nghĩ trừu tượng" },
  { id: 26, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "giải các bài toán khó, phức tạp", text: "Tôi có thể: giải các bài toán khó, phức tạp" },
  { id: 27, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "tiếp thu nhanh các lý thuyết khoa học", text: "Tôi có thể: tiếp thu nhanh các lý thuyết khoa học" },
  { id: 28, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "giải thích các công thức toán học", text: "Tôi có thể: giải thích các công thức toán học" },
  { id: 29, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "phân tích dữ liệu", text: "Tôi có thể: phân tích dữ liệu" },
  { id: 30, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi có thể", subText: "tiến hành những thí nghiệm khoa học", text: "Tôi có thể: tiến hành những thí nghiệm khoa học" },
  { id: 31, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "đặt câu hỏi", text: "Tôi thích: đặt câu hỏi" },
  { id: 32, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "tìm hiểu nhiều ý kiến khác nhau về 1 vấn đề cụ thể  nào đó", text: "Tôi thích: tìm hiểu nhiều ý kiến khác nhau về 1 vấn đề cụ thể  nào đó" },
  { id: 33, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "sử dụng máy vi tính", text: "Tôi thích: sử dụng máy vi tính" },
  { id: 34, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "đọc sách/ báo chuyên ngành/ kỹ thuật", text: "Tôi thích: đọc sách/ báo chuyên ngành/ kỹ thuật" },
  { id: 35, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "thiết lập đề tài nghiên cứu, làm khảo sát và kiểm tra kết quả", text: "Tôi thích: thiết lập đề tài nghiên cứu, làm khảo sát và kiểm tra kết quả" },
  { id: 36, category: "I", groupName: "Nghiên cứu (Investigative)", prefix: "Tôi thích", subText: "tham quan bảo tàng khoa học, phòng thí nghiệm, cơ sở khoa học", text: "Tôi thích: tham quan bảo tàng khoa học, phòng thí nghiệm, cơ sở khoa học" },

  // NHÓM A: Nghệ thuật (Artistic) — Câu 37..54
  { id: 37, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Rất sáng tạo", text: "Tôi là người: Rất sáng tạo" },
  { id: 38, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Giàu trí tưởng tượng", text: "Tôi là người: Giàu trí tưởng tượng" },
  { id: 39, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Thích cải tiến, đổi mới", text: "Tôi là người: Thích cải tiến, đổi mới" },
  { id: 40, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Độc đáo, khác lạ", text: "Tôi là người: Độc đáo, khác lạ" },
  { id: 41, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Dễ xúc động", text: "Tôi là người: Dễ xúc động" },
  { id: 42, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi là người", subText: "Rất nhạy cảm", text: "Tôi là người: Rất nhạy cảm" },
  { id: 43, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "phác thảo, vẽ, tô tranh", text: "Tôi có thể: phác thảo, vẽ, tô tranh" },
  { id: 44, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "chơi 1 nhac cụ", text: "Tôi có thể: chơi 1 nhac cụ" },
  { id: 45, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "viết truyện/ thơ/ sáng tác nhạc", text: "Tôi có thể: viết truyện/ thơ/ sáng tác nhạc" },
  { id: 46, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "hát/ diễn xuất/ nhảy/ khiêu vũ", text: "Tôi có thể: hát/ diễn xuất/ nhảy/ khiêu vũ" },
  { id: 47, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "tự thiết kế quần áo cho mình, bạn bè và người thân/ thiết kế nội thất cho nhà mình", text: "Tôi có thể: tự thiết kế quần áo cho mình, bạn bè và người thân/ thiết kế nội thất cho nhà mình" },
  { id: 48, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi có thể", subText: "chụp hình với những góc ảnh đẹp", text: "Tôi có thể: chụp hình với những góc ảnh đẹp" },
  { id: 49, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "tham gia khóa học thiết kế", text: "Tôi thích: tham gia khóa học thiết kế" },
  { id: 50, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "học hát/ nhạc/ nhảy/ khiêu vũ/ diễn xuất", text: "Tôi thích: học hát/ nhạc/ nhảy/ khiêu vũ/ diễn xuất" },
  { id: 51, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "làm đồ thủ công, tự làm quà cho bạn bè và người thân", text: "Tôi thích: làm đồ thủ công, tự làm quà cho bạn bè và người thân" },
  { id: 52, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "đọc truyện viễn tưởng/ kịch/ thơ ca", text: "Tôi thích: đọc truyện viễn tưởng/ kịch/ thơ ca" },
  { id: 53, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "thể hiện mình một cách sáng tạo/ mặc những thời trang lạ và thú vị", text: "Tôi thích: thể hiện mình một cách sáng tạo/ mặc những thời trang lạ và thú vị" },
  { id: 54, category: "A", groupName: "Nghệ thuật (Artistic)", prefix: "Tôi thích", subText: "xem hòa nhạc/ xem kịch/ triển lãm nghệ thuật", text: "Tôi thích: xem hòa nhạc/ xem kịch/ triển lãm nghệ thuật" },

  // NHÓM S: Xã hội (Social) — Câu 55..72
  { id: 55, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "rất thân thiện, hòa đồng", text: "Tôi là người: rất thân thiện, hòa đồng" },
  { id: 56, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "dễ thấu hiểu người khác", text: "Tôi là người: dễ thấu hiểu người khác" },
  { id: 57, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "hào phóng", text: "Tôi là người: hào phóng" },
  { id: 58, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "hay giúp đỡ người khác", text: "Tôi là người: hay giúp đỡ người khác" },
  { id: 59, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "có tinh thần đồng đội, tinh thần hợp tác", text: "Tôi là người: có tinh thần đồng đội, tinh thần hợp tác" },
  { id: 60, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi là người", subText: "dễ tha thứ", text: "Tôi là người: dễ tha thứ" },
  { id: 61, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "chỉ dẫn hoặc dạy người khác", text: "Tôi có thể: chỉ dẫn hoặc dạy người khác" },
  { id: 62, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "điều hành các cuộc thảo luận", text: "Tôi có thể: điều hành các cuộc thảo luận" },
  { id: 63, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "hòa giải mâu thuẫn/ tranh chấp", text: "Tôi có thể: hòa giải mâu thuẫn/ tranh chấp" },
  { id: 64, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "diễn đạt suy nghĩ và cảm xúc rất rõ ràng", text: "Tôi có thể: diễn đạt suy nghĩ và cảm xúc rất rõ ràng" },
  { id: 65, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "hợp tác tốt với những người khác", text: "Tôi có thể: hợp tác tốt với những người khác" },
  { id: 66, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi có thể", subText: "chơi môn thể thao có tính đồng đội", text: "Tôi có thể: chơi môn thể thao có tính đồng đội" },
  { id: 67, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "làm việc nhóm", text: "Tôi thích: làm việc nhóm" },
  { id: 68, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "tham gia hoạt động tình nguyện với các nhóm hoạt động xã hội tại trường, nhà thờ, chùa, phường, xóm hay cộng đồng", text: "Tôi thích: tham gia hoạt động tình nguyện với các nhóm hoạt động xã hội tại trường, nhà thờ, chùa, phường, xóm hay cộng đồng" },
  { id: 69, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "gặp gỡ và làm quen bạn mới", text: "Tôi thích: gặp gỡ và làm quen bạn mới" },
  { id: 70, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "lắng nghe và tư vấn cho người khác", text: "Tôi thích: lắng nghe và tư vấn cho người khác" },
  { id: 71, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "đóng góp trong các cuộc thảo luận", text: "Tôi thích: đóng góp trong các cuộc thảo luận" },
  { id: 72, category: "S", groupName: "Xã hội (Social)", prefix: "Tôi thích", subText: "tham gia các hội thảo về phát triển cộng đồng và giải quyết các vấn đề xã hội", text: "Tôi thích: tham gia các hội thảo về phát triển cộng đồng và giải quyết các vấn đề xã hội" },

  // NHÓM E: Quản lý (Enterprising) — Câu 73..90
  { id: 73, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "thích phiêu lưu", text: "Tôi là người: thích phiêu lưu" },
  { id: 74, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "quyết đoán", text: "Tôi là người: quyết đoán" },
  { id: 75, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "thuộc dạng nổi tiếng ở trường", text: "Tôi là người: thuộc dạng nổi tiếng ở trường" },
  { id: 76, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "có sức thuyết phục", text: "Tôi là người: có sức thuyết phục" },
  { id: 77, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "có nhiều hoài bão/ tham vọng", text: "Tôi là người: có nhiều hoài bão/ tham vọng" },
  { id: 78, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi là người", subText: "thích giao du, thích kết bạn", text: "Tôi là người: thích giao du, thích kết bạn" },
  { id: 79, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "khởi đầu/ đề xuất dự án, hoạt động mới", text: "Tôi có thể: khởi đầu/ đề xuất dự án, hoạt động mới" },
  { id: 80, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "thuyết phục người khác làm việc theo ý của tôi", text: "Tôi có thể: thuyết phục người khác làm việc theo ý của tôi" },
  { id: 81, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "lãnh đạo một nhóm", text: "Tôi có thể: lãnh đạo một nhóm" },
  { id: 82, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "bán hàng hoặc quảng bá ý tưởng", text: "Tôi có thể: bán hàng hoặc quảng bá ý tưởng" },
  { id: 83, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "lên kế hoạch/ chiến lược để đạt được mục tiêu", text: "Tôi có thể: lên kế hoạch/ chiến lược để đạt được mục tiêu" },
  { id: 84, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi có thể", subText: "điều hành hoạt động kinh doanh của gia đình", text: "Tôi có thể: điều hành hoạt động kinh doanh của gia đình" },
  { id: 85, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "có quyền lực, địa vị/ được bầu cử vào những vị trí quan trọng", text: "Tôi thích: có quyền lực, địa vị/ được bầu cử vào những vị trí quan trọng" },
  { id: 86, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "đưa ra quyết định có ảnh hưởng đến những người khác", text: "Tôi thích: đưa ra quyết định có ảnh hưởng đến những người khác" },
  { id: 87, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "giành chiến thắng một giải thưởng lãnh đạo hoặc bán hàng", text: "Tôi thích: giành chiến thắng một giải thưởng lãnh đạo hoặc bán hàng" },
  { id: 88, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "gặp gỡ những người quan trọng", text: "Tôi thích: gặp gỡ những người quan trọng" },
  { id: 89, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "tham gia khóa học về kinh doanh/ marketing…", text: "Tôi thích: tham gia khóa học về kinh doanh/ marketing…" },
  { id: 90, category: "E", groupName: "Quản lý (Enterprising)", prefix: "Tôi thích", subText: "đọc tạp chí kinh doanh", text: "Tôi thích: đọc tạp chí kinh doanh" },

  // NHÓM C: Nghiệp vụ (Conventional) — Câu 91..108
  { id: 91, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "gọn gàng, ngăn nắp", text: "Tôi là người: gọn gàng, ngăn nắp" },
  { id: 92, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "làm việc nguyên tắc, có trình tự, có kế hoạch", text: "Tôi là người: làm việc nguyên tắc, có trình tự, có kế hoạch" },
  { id: 93, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "chính xác", text: "Tôi là người: chính xác" },
  { id: 94, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "thích làm việc với dữ liệu, con số, văn bản", text: "Tôi là người: thích làm việc với dữ liệu, con số, văn bản" },
  { id: 95, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "tuân thủ nguyên tắc", text: "Tôi là người: tuân thủ nguyên tắc" },
  { id: 96, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi là người", subText: "chu đáo, tỉ mỉ", text: "Tôi là người: chu đáo, tỉ mỉ" },
  { id: 97, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "làm việc tốt trong khuôn khổ, theo quy định", text: "Tôi có thể: làm việc tốt trong khuôn khổ, theo quy định" },
  { id: 98, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "giải quyết công việc giấy tờ một cách nhanh chóng, hiệu quả và ngăn nắp", text: "Tôi có thể: giải quyết công việc giấy tờ một cách nhanh chóng, hiệu quả và ngăn nắp" },
  { id: 99, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "thực hiện các công việc đòi hỏi chú ý đến các chi tiết (sửa lỗi các văn bản, sắp xếp, dàn dựng chương trình cho sự kiện, …)", text: "Tôi có thể: thực hiện các công việc đòi hỏi chú ý đến các chi tiết (sửa lỗi các văn bản, sắp xếp, dàn dựng chương trình cho sự kiện, …)" },
  { id: 100, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "tổ chức, dàn dựng chương trình cho các hoạt động, sự kiện (tổ chức đêm ca nhạc, tổ chức buổi dã ngoại cho cả lớp, câu lạc bộ)", text: "Tôi có thể: tổ chức, dàn dựng chương trình cho các hoạt động, sự kiện (tổ chức đêm ca nhạc, tổ chức buổi dã ngoại cho cả lớp, câu lạc bộ)" },
  { id: 101, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "gõ nhanh hoặc viết tốc ký", text: "Tôi có thể: gõ nhanh hoặc viết tốc ký" },
  { id: 102, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi có thể", subText: "lưu trữ dữ liệu, hồ sơ chính xác", text: "Tôi có thể: lưu trữ dữ liệu, hồ sơ chính xác" },
  { id: 103, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "sử dụng các thiết bị xử lý dữ liệu (vd: máy tính,…)", text: "Tôi thích: sử dụng các thiết bị xử lý dữ liệu (vd: máy tính,…)" },
  { id: 104, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "sưu tầm đồ kỉ niệm", text: "Tôi thích: sưu tầm đồ kỉ niệm" },
  { id: 105, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "học, tìm hiểu các thủ tục, quy định, luật lệ (vd: nội quy, quy định, luật …)", text: "Tôi thích: học, tìm hiểu các thủ tục, quy định, luật lệ (vd: nội quy, quy định, luật …)" },
  { id: 106, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "sắp xếp nhà cửa hoặc nơi làm việc", text: "Tôi thích: sắp xếp nhà cửa hoặc nơi làm việc" },
  { id: 107, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "chơi trò tìm sự khác biệt giữa hai hình ảnh", text: "Tôi thích: chơi trò tìm sự khác biệt giữa hai hình ảnh" },
  { id: 108, category: "C", groupName: "Nghiệp vụ (Conventional)", prefix: "Tôi thích", subText: "làm việc dựa trên hướng dẫn cụ thể", text: "Tôi thích: làm việc dựa trên hướng dẫn cụ thể" }
]

const SUB_FACET_LABELS: Record<HollandSubFacet, string> = {
  ACTIVITY: "Tôi là người (Đặc điểm cá nhân)",
  COMPETENCY: "Tôi có thể (Năng lực & kỹ năng)",
  OCCUPATION: "Tôi thích (Sở thích & xu hướng)"
}

export const HOLLAND_108_QUESTIONS: HollandQuestionItem[] = OFFICIAL_108_RAW_QUESTIONS.map(q => {
  const partIndex = RIASEC_ORDER.indexOf(q.category) + 1
  const indexInPart = ((q.id - 1) % 18) + 1
  const numStr = String(indexInPart).padStart(2, "0")
  const subFacet: HollandSubFacet =
    indexInPart <= 6 ? "ACTIVITY" : indexInPart <= 12 ? "COMPETENCY" : "OCCUPATION"

  return {
    id: q.id,
    code: `${q.category}${numStr}`,
    dimension: q.category,
    groupName: q.groupName,
    prefix: q.prefix,
    subText: q.subText,
    partIndex,
    indexInPart,
    subFacet,
    subFacetLabel: SUB_FACET_LABELS[subFacet],
    text: q.text
  }
})

export interface HollandRankBucket {
  score: number
  codes: RiasecCode[]
  rank: number
}

export interface DimensionScoreDetail {
  code: RiasecCode
  nameVi: string
  nameEn: string
  role: string
  shortLabel: string
  rawScore: number // 0..18
  maxScore: number // 18
  percentage: number // 0..100
  activityScore: number // 0..6
  competencyScore: number // 0..6
  occupationScore: number // 0..6
  subFacetWeightIndex: number // occupationScore * 3 + competencyScore * 2 + activityScore
  hexagonCoherenceScore: number // sum of adjacent neighbors' raw scores on RIASEC hexagon
  rank: number // 1..6
  bucketRank: number // 1..6 (same rank when tied)
  isTied: boolean
}

export interface HollandComputedReport {
  version: string
  totalQuestions: number
  answeredCount: number
  scores: Record<RiasecCode, number>
  buckets: HollandRankBucket[]
  topGroups: RiasecCode[]
  rankedDimensions: DimensionScoreDetail[]
  top3Codes: [RiasecCode, RiasecCode, RiasecCode]
  hollandCode: string // e.g. "R-I-A"
  hollandCompactCode: string // e.g. "RIA" or "(R/I)A"
  primaryResultLabel: string
  hasTies: boolean
  tiedGroups: RiasecCode[]
  tieNotice: string | null
  tieBreakExplanation: string
  primaryProfile: RiasecDimensionProfile
  secondaryProfile: RiasecDimensionProfile
  tertiaryProfile: RiasecDimensionProfile
  combinedInterpretation: string
  recommendedSubjects: string[]
  skylineSubjectCombinations: string[]
  recommendedCareerClusters: string[]
  recommendedSkylineActivities: string[]
  recommendedSmartGoals: string[]
  parentAccompanimentGuide: string[]
}

function joinListVi(items: string[]): string {
  if (items.length <= 1) return items[0] || ""
  if (items.length === 2) return `${items[0]} và ${items[1]}`
  return `${items.slice(0, -1).join(", ")} và ${items[items.length - 1]}`
}

/**
 * Thuật toán phân nhóm đồng hạng chuẩn SKL_PSYCH v2.6.1 (Xr & Zr trong epi.skylineschool.edu.vn)
 */
export function computeHollandBuckets(scores: Record<RiasecCode, number>): {
  buckets: HollandRankBucket[]
  topGroups: RiasecCode[]
} {
  const buckets: HollandRankBucket[] = []
  const topGroups: RiasecCode[] = []
  const uniqueScores = Array.from(new Set(RIASEC_ORDER.map(c => scores[c] ?? 0))).sort(
    (a, b) => b - a
  )
  let currentRank = 1

  for (const sc of uniqueScores) {
    if (topGroups.length >= 3) break
    const codesWithScore = RIASEC_ORDER.filter(c => (scores[c] ?? 0) === sc)
    if (sc === 0) {
      codesWithScore.slice(0, 3 - topGroups.length).forEach((c, idx) => {
        buckets.push({ score: 0, codes: [c], rank: currentRank + idx })
        topGroups.push(c)
      })
      break
    }
    buckets.push({ score: sc, codes: codesWithScore, rank: currentRank })
    topGroups.push(...codesWithScore)
    currentRank += codesWithScore.length
  }

  return { buckets, topGroups }
}

export function buildVietnameseTieNotice(tiedBuckets: HollandRankBucket[]): string | null {
  if (tiedBuckets.length === 0) return null
  const getGroupName = (c: RiasecCode) => RIASEC_PROFILES[c].nameVi
  const formatBucket = (b: HollandRankBucket) =>
    `${b.codes.length === 2 ? "hai nhóm" : `${b.codes.length} nhóm`} ${joinListVi(
      b.codes.map(getGroupName)
    )} ở vị trí #${b.rank}`
  const isSinglePair = tiedBuckets.length === 1 && tiedBuckets[0].codes.length === 2

  return `Lưu ý: Kết quả của bạn có sự đồng hạng giữa ${tiedBuckets
    .map(formatBucket)
    .join(" và giữa ")}. Điều này cho thấy bạn sở hữu ${
    isSinglePair ? "cả hai thế mạnh này" : "các thế mạnh này"
  } ở mức độ tương đương. Bạn có thể lựa chọn các ngành nghề giao thoa giữa các nhóm này, hoặc tìm hiểu sâu hơn ${
    isSinglePair ? "cả hai lĩnh vực" : "các lĩnh vực này"
  } khi lập kế hoạch định hướng.`
}

/**
 * Thuật toán tính điểm & xử lý đồng hạng chuẩn SKL_PSYCH v2.6.1
 */
export function calculateHollandResult(
  answers: Record<string, boolean | number | null | undefined>
): HollandComputedReport {
  const rawScores: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  const activityScores: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  const competencyScores: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  const occupationScores: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }

  let answeredCount = 0

  for (const q of HOLLAND_108_QUESTIONS) {
    const valById = answers[String(q.id)]
    const valByCode = answers[q.code]
    const rawVal = valById !== undefined && valById !== null ? valById : valByCode

    if (rawVal === true || rawVal === 1 || rawVal === false || rawVal === 0) {
      answeredCount++
    }

    const isYes = rawVal === true || rawVal === 1
    if (isYes) {
      rawScores[q.dimension] += 1
      if (q.subFacet === "ACTIVITY") activityScores[q.dimension] += 1
      else if (q.subFacet === "COMPETENCY") competencyScores[q.dimension] += 1
      else if (q.subFacet === "OCCUPATION") occupationScores[q.dimension] += 1
    }
  }

  // Official SKL_PSYCH v2.6.1 bucket & tie-breaking calculation
  const { buckets, topGroups } = computeHollandBuckets(rawScores)
  const tiedBuckets = buckets.filter(b => b.codes.length > 1)
  const tieNotice = buildVietnameseTieNotice(tiedBuckets)

  // Map bucket rank for all 6 groups
  const allUniqueScores = Array.from(new Set(RIASEC_ORDER.map(c => rawScores[c] ?? 0))).sort(
    (a, b) => b - a
  )
  const bucketRankByCode: Record<RiasecCode, number> = { R: 1, I: 2, A: 3, S: 4, E: 5, C: 6 }
  let rCursor = 1
  for (const sc of allUniqueScores) {
    const groupCodes = RIASEC_ORDER.filter(c => (rawScores[c] ?? 0) === sc)
    groupCodes.forEach(c => {
      bucketRankByCode[c] = rCursor
    })
    rCursor += groupCodes.length
  }

  // Detect ties in rawScores
  const scoreCounts = new Map<number, RiasecCode[]>()
  for (const dim of RIASEC_ORDER) {
    const sc = rawScores[dim]
    const arr = scoreCounts.get(sc) || []
    arr.push(dim)
    scoreCounts.set(sc, arr)
  }

  const details: DimensionScoreDetail[] = RIASEC_ORDER.map(dim => {
    const [n1, n2] = RIASEC_HEXAGON_NEIGHBORS[dim]
    const hexCoherence = rawScores[n1] + rawScores[n2]
    const subWeight =
      occupationScores[dim] * 3 + competencyScores[dim] * 2 + activityScores[dim] * 1
    const raw = rawScores[dim]
    const tiedGroup = scoreCounts.get(raw) || []

    return {
      code: dim,
      nameVi: RIASEC_PROFILES[dim].nameVi,
      nameEn: RIASEC_PROFILES[dim].nameEn,
      role: RIASEC_PROFILES[dim].role,
      shortLabel: RIASEC_PROFILES[dim].shortLabel,
      rawScore: raw,
      maxScore: 18,
      percentage: Math.round((raw / 18) * 100),
      activityScore: activityScores[dim],
      competencyScore: competencyScores[dim],
      occupationScore: occupationScores[dim],
      subFacetWeightIndex: subWeight,
      hexagonCoherenceScore: hexCoherence,
      rank: 0,
      bucketRank: bucketRankByCode[dim],
      isTied: tiedGroup.length > 1 && raw > 0
    }
  })

  // Sort deterministic order for 3-party advisory cards while preserving official bucket structure
  const ranked = [...details].sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore
    if (b.subFacetWeightIndex !== a.subFacetWeightIndex) {
      return b.subFacetWeightIndex - a.subFacetWeightIndex
    }
    if (b.hexagonCoherenceScore !== a.hexagonCoherenceScore) {
      return b.hexagonCoherenceScore - a.hexagonCoherenceScore
    }
    return RIASEC_ORDER.indexOf(a.code) - RIASEC_ORDER.indexOf(b.code)
  })

  ranked.forEach((item, idx) => {
    item.rank = idx + 1
  })

  const top3Codes: [RiasecCode, RiasecCode, RiasecCode] = [
    ranked[0].code,
    ranked[1].code,
    ranked[2].code
  ]
  const hollandCode = `${top3Codes[0]}-${top3Codes[1]}-${top3Codes[2]}`
  const hollandCompactCode = buckets
    .map(b => (b.codes.length > 1 ? `(${b.codes.join("/")})` : b.codes[0]))
    .join("")

  const primaryCodes = buckets[0]?.codes || [top3Codes[0]]
  const otherTopCodes = topGroups.filter(c => !primaryCodes.includes(c))
  const firstProfile = RIASEC_PROFILES[primaryCodes[0]]

  const primaryResultLabel = `Mã ${hollandCompactCode}: ${buckets
    .map(b =>
      b.codes.length > 2
        ? `Đồng hạng ${b.codes.join("/")} (${b.score}/18)`
        : `${b.codes.map(c => RIASEC_PROFILES[c].role).join(" / ")} (${b.codes.join("/")}=${b.score}/18)`
    )
    .join(" - ")}`

  const scoreSummaryStr = topGroups.map(c => `${c} = ${rawScores[c] ?? 0}/18`).join(", ")
  const otherNamesStr = joinListVi(otherTopCodes.map(c => RIASEC_PROFILES[c].nameVi))
  const combinedSuffix = otherNamesStr ? `, kết hợp với đặc điểm của nhóm ${otherNamesStr}` : ""
  const leadSentence =
    primaryCodes.length === 1
      ? `Xu hướng nổi trội nhất của bạn là nhóm ${firstProfile.nameVi} (${firstProfile.role})${combinedSuffix}.`
      : `Bạn có thế mạnh tương đương ở ${joinListVi(
          primaryCodes.map(c => `${RIASEC_PROFILES[c].nameVi} (${RIASEC_PROFILES[c].role})`)
        )}${combinedSuffix}.`

  const combinedInterpretation = `Mã Holland chủ đạo của bạn là ${hollandCompactCode} (${scoreSummaryStr}). ${leadSentence} ${firstProfile.tagline}`

  const hasTies = tiedBuckets.length > 0
  const tiedTopGroups = tiedBuckets.flatMap(b => b.codes)
  const tieBreakExplanation =
    tieNotice || "Điểm số 3 nhóm dẫn đầu phân hóa rõ ràng, không phát sinh đồng hạng ở Top 3."

  const p1 = RIASEC_PROFILES[top3Codes[0]]
  const p2 = RIASEC_PROFILES[top3Codes[1]]
  const p3 = RIASEC_PROFILES[top3Codes[2]]

  const subjectComboCodes = Array.from(
    new Set([...primaryCodes, ...(buckets[1]?.codes ?? []), ...tiedTopGroups])
  )
  const skylineSubjectCombinations = Array.from(
    new Set(subjectComboCodes.flatMap(c => SKYLINE_SUBJECT_COMBINATIONS[c]))
  )

  const dedupeList = (arr: string[], limit = 8) => Array.from(new Set(arr)).slice(0, limit)

  return {
    version: SKL_PSYCH_VERSION,
    totalQuestions: 108,
    answeredCount,
    scores: rawScores,
    buckets,
    topGroups,
    rankedDimensions: ranked,
    top3Codes,
    hollandCode,
    hollandCompactCode,
    primaryResultLabel,
    hasTies,
    tiedGroups: tiedTopGroups,
    tieNotice,
    tieBreakExplanation,
    primaryProfile: p1,
    secondaryProfile: p2,
    tertiaryProfile: p3,
    combinedInterpretation,
    recommendedSubjects: dedupeList(
      [...p1.recommendedSubjects, ...p2.recommendedSubjects, ...p3.recommendedSubjects],
      6
    ),
    skylineSubjectCombinations,
    recommendedCareerClusters: dedupeList(
      [
        ...primaryCodes.flatMap(c => RIASEC_PROFILES[c].careerClusters),
        ...otherTopCodes.flatMap(c => RIASEC_PROFILES[c].careerClusters.slice(0, 2))
      ],
      8
    ),
    recommendedSkylineActivities: dedupeList(
      [...p1.skylineActivities, ...p2.skylineActivities.slice(0, 2), ...p3.skylineActivities.slice(0, 1)],
      5
    ),
    recommendedSmartGoals: dedupeList(
      [...p1.smartGoalSuggestions, ...p2.smartGoalSuggestions, ...p3.smartGoalSuggestions],
      4
    ),
    parentAccompanimentGuide: dedupeList(
      [...p1.parentAccompanimentTips, ...p2.parentAccompanimentTips],
      4
    )
  }
}
