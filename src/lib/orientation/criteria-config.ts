/**
 * CẤU HÌNH TIÊU CHÍ PHỎNG VẤN ĐỊNH HƯỚNG ĐẦU VÀO - SSM SKY-LINE
 * Phiên bản: 2026.3 - Chuẩn hóa Biểu mẫu Phân hóa theo từng Khối lớp (Khối 1 đến 12)
 * 
 * Cấu trúc 02 Biểu mẫu chuẩn hóa:
 * A. PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH (10 Nhóm nội dung):
 *    1. Sở thích và thế mạnh
 *    2. Thái độ và động lực học tập
 *    3. Khả năng giải quyết vấn đề
 *    4. Tính chủ động
 *    5. Kỹ năng xã hội và khả năng thích nghi
 *    6. Nhận thức bản thân
 *    7. Kỳ vọng cá nhân tại Sky-Line
 *    8. Năng lực học tập tự nhận định
 *    9. Kỹ năng giao tiếp
 *    10. Thông tin bổ sung
 * 
 * B. TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH (05 Nhóm nội dung):
 *    1. Hiểu học sinh qua góc nhìn phụ huynh
 *    2. Quá trình và năng lực học tập
 *    3. Thói quen học tập tại nhà
 *    4. Cách phụ huynh đồng hành với việc học
 *    5. Động lực, kỳ vọng và mục tiêu giáo dục
 * 
 * Chuẩn hóa 04 mức mô tả quan sát định tính (không chấm điểm số):
 * - Thể hiện rõ (CONFIDENT / THE_HIEN_RO)
 * - Đang hình thành (NORMAL / DANG_HINH_THANH)
 * - Cần tìm hiểu thêm (NEED_SUPPORT / CAN_TIM_HIEU_THEM)
 * - Chưa đủ thông tin (SPECIAL_ATTENTION / CHUA_DU_THONG_TIN)
 * 
 * Phân định nguồn minh chứng:
 * - Học sinh tự chia sẻ (STUDENT_SHARED)
 * - Phụ huynh cung cấp (PARENT_PROVIDED - tham khảo, chưa kiểm chứng)
 * - Giáo viên trực tiếp quan sát (TEACHER_OBSERVED)
 * - Giáo viên nhận định hoặc đề xuất (TEACHER_ASSESSED)
 */

export const ORIENTATION_CRITERIA_VERSION = "2026.3";

export type GradeGroupKey =
  | "KHOI_1"
  | "KHOI_2"
  | "KHOI_3"
  | "KHOI_4"
  | "KHOI_5"
  | "KHOI_6"
  | "KHOI_7"
  | "KHOI_8"
  | "KHOI_9"
  | "KHOI_10"
  | "KHOI_11"
  | "KHOI_12"
  // Tương thích ngược với các phiên bản cũ:
  | "KHOI_2_5"
  | "KHOI_7_9"
  | "KHOI_10_12";

export type RatingCode = "CONFIDENT" | "NORMAL" | "NEED_SUPPORT" | "SPECIAL_ATTENTION";

export type EvidenceSource = "STUDENT_SHARED" | "PARENT_PROVIDED" | "TEACHER_OBSERVED" | "TEACHER_ASSESSED";

export interface OrientationCriterion {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  focus: string;
  guideline: string;
  suggestedQuestions: string[];
  mandatoryCommentRatings: RatingCode[];
  sortOrder: number;
}

export interface ParentOrientationGroup {
  id: string;
  code: string;
  category: string;
  categoryLabel: string;
  title: string;
  focus: string;
  suggestedQuestions: string[];
  placeholder: string;
  sortOrder: number;
}

export interface OrientationGradeGroupConfig {
  key: GradeGroupKey;
  gradeNumber: number;
  label: string;
  subLabel: string;
  focus: string;
  gradeList: string[];
  criteria: OrientationCriterion[];
  parentGroups: ParentOrientationGroup[];
  parentPrompts: {
    groupLabel: string;
    group1_expectations: { title: string; hints: string[]; placeholder: string };
    group2_personality: { title: string; hints: string[]; placeholder: string };
    group3_support: { title: string; hints: string[]; placeholder: string };
    group4_cooperation: { title: string; hints: string[]; placeholder: string };
  };
}

export interface OrientationSummaryStructure {
  strongPoints: string;          // 1. Điểm mạnh nổi bật của học sinh
  interestsMotivation: string;   // 2. Sở thích và động lực học tập
  adaptabilityAutonomy: string;  // 3. Khả năng thích nghi và tự lập
  difficultiesNeeds: string;     // 4. Khó khăn, nhu cầu cần quan tâm
  studentExpectations: string;   // 5. Kỳ vọng của học sinh
  parentExpectations: string;    // 6. Kỳ vọng của phụ huynh
  alignmentDifferences: string;  // 7. Những điểm tương đồng hoặc khác biệt giữa hai nguồn thông tin
  initialRecommendations: string;// 8. Đề xuất hỗ trợ và định hướng giáo dục ban đầu
  verificationItems: string;     // 9. Nội dung cần xác minh hoặc trao đổi chuyên môn
}

export const ORIENTATION_EVIDENCE_SOURCES: Record<EvidenceSource, { code: EvidenceSource; label: string; subText: string; isVerified: boolean }> = {
  STUDENT_SHARED: {
    code: "STUDENT_SHARED",
    label: "Học sinh tự chia sẻ",
    subText: "Lời nói, cảm nghĩ và chia sẻ trực tiếp của học sinh trong buổi phỏng vấn",
    isVerified: true
  },
  PARENT_PROVIDED: {
    code: "PARENT_PROVIDED",
    label: "Phụ huynh cung cấp",
    subText: "Thông tin gia đình cung cấp (nguồn tham khảo, chưa tự động xem là đã kiểm chứng)",
    isVerified: false
  },
  TEACHER_OBSERVED: {
    code: "TEACHER_OBSERVED",
    label: "Giáo viên trực tiếp quan sát",
    subText: "Hành vi, thái độ, phản xạ thực tế quan sát được trong suốt quá trình khảo sát",
    isVerified: true
  },
  TEACHER_ASSESSED: {
    code: "TEACHER_ASSESSED",
    label: "Giáo viên nhận định / Đề xuất",
    subText: "Đánh giá chuyên môn sư phạm và khuyến nghị giải pháp đồng hành ban đầu",
    isVerified: true
  }
};

export const ORIENTATION_GRADE_GROUPS: Record<GradeGroupKey, OrientationGradeGroupConfig> = {
  // 1. KHỐI 1 - BM.KTĐBCL.31
  KHOI_1: {
    key: "KHOI_1",
    gradeNumber: 1,
    label: "Khối 1 (BM.KTĐBCL.31)",
    subLabel: "Phiếu phỏng vấn định hướng học sinh và trao đổi với phụ huynh (Dành cho khối 1)",
    focus: "Biểu mẫu BM.KTĐBCL.31 — Ban Khảo thí & Đảm bảo chất lượng",
    gradeList: ["1", "Khối 1", "Lớp 1", "K1"],
    criteria: [
      {
        id: "k1_a01",
        code: "A01",
        name: "A01. Con thích chơi hoặc làm hoạt động gì nhất?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A01. Con thích chơi hoặc làm hoạt động gì nhất?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày. Với khối nhỏ, kết hợp trò chuyện và hoạt động đơn giản.",
        suggestedQuestions: ["Con thích chơi hoặc làm hoạt động gì nhất?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1,
      },
      {
        id: "k1_a02",
        code: "A02",
        name: "A02. Con đã tự làm được những việc gì?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A02. Con đã tự làm được những việc gì?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Con đã tự làm được những việc gì?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2,
      },
      {
        id: "k1_a03",
        code: "A03",
        name: "A03. Khi gặp việc khó, con thường làm gì?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A03. Khi gặp việc khó, con thường làm gì?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Khi gặp việc khó, con thường làm gì?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3,
      },
      {
        id: "k1_a04",
        code: "A04",
        name: "A04. Con làm quen với bạn mới thế nào?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A04. Con làm quen với bạn mới thế nào?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Con làm quen với bạn mới thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4,
      },
      {
        id: "k1_a05",
        code: "A05",
        name: "A05. Điều gì khiến con vui hoặc lo khi đến trường?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A05. Điều gì khiến con vui hoặc lo khi đến trường?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Điều gì khiến con vui hoặc lo khi đến trường?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5,
      },
      {
        id: "k1_a06",
        code: "A06",
        name: "A06. Con mong được làm gì ở Sky-Line?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A06. Con mong được làm gì ở Sky-Line?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Con mong được làm gì ở Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6,
      },
    ],
    parentGroups: [
      {
        id: "k1_b01",
        code: "B01",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B01. Đặc điểm cá nhân & cảm xúc.",
        focus: "Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?",
        suggestedQuestions: ["Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?"],
        placeholder: "",
        sortOrder: 1,
      },
      {
        id: "k1_b02",
        code: "B02",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B02. Quá trình học tập.",
        focus: "Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?",
        suggestedQuestions: ["Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?"],
        placeholder: "",
        sortOrder: 2,
      },
      {
        id: "k1_b03",
        code: "B03",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B03. Thói quen tại nhà.",
        focus: "Con tự học, tự quản lý thời gian ở mức nào? Thói quen sinh hoạt, sử dụng thiết bị và hoạt động ngoài giờ ra sao?",
        suggestedQuestions: ["Con tự học, tự quản lý thời gian ở mức nào? Thói quen sinh hoạt, sử dụng thiết bị và hoạt động ngoài giờ ra sao?"],
        placeholder: "",
        sortOrder: 3,
      },
      {
        id: "k1_b04",
        code: "B04",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B04. Gia đình đồng hành.",
        focus: "Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?",
        suggestedQuestions: ["Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?"],
        placeholder: "",
        sortOrder: 4,
      },
      {
        id: "k1_b05",
        code: "B05",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B05. Mục tiêu & kỳ vọng.",
        focus: "Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?",
        suggestedQuestions: ["Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?"],
        placeholder: "",
        sortOrder: 5,
      },
      {
        id: "k1_c01",
        code: "C01",
        category: "C_PHAN_HOA_KHOI_1",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 1 (Phụ huynh)",
        title: "C01. Khả năng thích nghi:",
        focus: "Con phản ứng thế nào khi xa bố mẹ, gặp thầy cô hoặc bạn mới?",
        suggestedQuestions: ["Con phản ứng thế nào khi xa bố mẹ, gặp thầy cô hoặc bạn mới?"],
        placeholder: "",
        sortOrder: 6,
      },
      {
        id: "k1_c02",
        code: "C02",
        category: "C_PHAN_HOA_KHOI_1",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 1 (Phụ huynh)",
        title: "C02. Sẵn sàng vào lớp 1:",
        focus: "Con có thể tự phục vụ, nghe hướng dẫn, tập trung vào một hoạt động ra sao?",
        suggestedQuestions: ["Con có thể tự phục vụ, nghe hướng dẫn, tập trung vào một hoạt động ra sao?"],
        placeholder: "",
        sortOrder: 7,
      },
      {
        id: "k1_c03",
        code: "C03",
        category: "C_PHAN_HOA_KHOI_1",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 1 (Phụ huynh)",
        title: "C03. Tiền đọc viết & số học:",
        focus: "Con thích kể chuyện, nhận diện chữ/số, đếm và quan sát như thế nào?",
        suggestedQuestions: ["Con thích kể chuyện, nhận diện chữ/số, đếm và quan sát như thế nào?"],
        placeholder: "",
        sortOrder: 8,
      },
      {
        id: "k1_c04",
        code: "C04",
        category: "C_PHAN_HOA_KHOI_1",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 1 (Phụ huynh)",
        title: "C04. Nếp sinh hoạt:",
        focus: "Giấc ngủ, ăn uống, đi vệ sinh, tự chuẩn bị đồ dùng có cần hỗ trợ?",
        suggestedQuestions: ["Giấc ngủ, ăn uống, đi vệ sinh, tự chuẩn bị đồ dùng có cần hỗ trợ?"],
        placeholder: "",
        sortOrder: 9,
      },
      {
        id: "k1_c05",
        code: "C05",
        category: "C_PHAN_HOA_KHOI_1",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 1 (Phụ huynh)",
        title: "C05. Giao tiếp & phối hợp:",
        focus: "Con diễn đạt nhu cầu, chờ lượt và chia sẻ với bạn thế nào?",
        suggestedQuestions: ["Con diễn đạt nhu cầu, chờ lượt và chia sẻ với bạn thế nào?"],
        placeholder: "",
        sortOrder: 10,
      },
    ],
    parentPrompts: {
      groupLabel: "Khối 1 (BM.KTĐBCL.31)",
      group1_expectations: {
        title: "B05. Mục tiêu & kỳ vọng",
        hints: ["Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?"],
        placeholder: "",
      },
      group2_personality: {
        title: "B01. Đặc điểm cá nhân & cảm xúc",
        hints: ["Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?"],
        placeholder: "",
      },
      group3_support: {
        title: "B02. Quá trình học tập",
        hints: ["Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?"],
        placeholder: "",
      },
      group4_cooperation: {
        title: "B04. Gia đình đồng hành",
        hints: ["Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?"],
        placeholder: "",
      },
    },
  },
  // 2. KHỐI 2 - BM.KTĐBCL.32
  KHOI_2: {
    key: "KHOI_2",
    gradeNumber: 2,
    label: "Khối 2 (BM.KTĐBCL.32)",
    subLabel: "Phiếu phỏng vấn định hướng học sinh và trao đổi với phụ huynh (Dành cho khối 2)",
    focus: "Biểu mẫu BM.KTĐBCL.32 — Ban Khảo thí & Đảm bảo chất lượng",
    gradeList: ["2", "Khối 2", "Lớp 2", "K2"],
    criteria: [
      {
        id: "k2_a01",
        code: "A01",
        name: "A01. Em thích môn học hoặc hoạt động nào?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A01. Em thích môn học hoặc hoạt động nào?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày. Với khối nhỏ, kết hợp trò chuyện và hoạt động đơn giản.",
        suggestedQuestions: ["Em thích môn học hoặc hoạt động nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1,
      },
      {
        id: "k2_a02",
        code: "A02",
        name: "A02. Khi gặp bài đọc hoặc toán khó, em làm gì?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A02. Khi gặp bài đọc hoặc toán khó, em làm gì?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Khi gặp bài đọc hoặc toán khó, em làm gì?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2,
      },
      {
        id: "k2_a03",
        code: "A03",
        name: "A03. Em tự chuẩn bị đồ dùng học tập như thế nào?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A03. Em tự chuẩn bị đồ dùng học tập như thế nào?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Em tự chuẩn bị đồ dùng học tập như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3,
      },
      {
        id: "k2_a04",
        code: "A04",
        name: "A04. Khi làm bài sai, em thường làm gì?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A04. Khi làm bài sai, em thường làm gì?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Khi làm bài sai, em thường làm gì?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4,
      },
      {
        id: "k2_a05",
        code: "A05",
        name: "A05. Em làm gì khi muốn chơi với bạn mới?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A05. Em làm gì khi muốn chơi với bạn mới?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Em làm gì khi muốn chơi với bạn mới?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5,
      },
      {
        id: "k2_a06",
        code: "A06",
        name: "A06. Em muốn học thêm điều gì ở trường mới?",
        category: "A_PHONG_VAN_HS",
        categoryLabel: "A. Phỏng vấn định hướng học sinh",
        focus: "A06. Em muốn học thêm điều gì ở trường mới?",
        guideline: "Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày.",
        suggestedQuestions: ["Em muốn học thêm điều gì ở trường mới?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6,
      },
    ],
    parentGroups: [
      {
        id: "k2_b01",
        code: "B01",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B01. Đặc điểm cá nhân & cảm xúc.",
        focus: "Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?",
        suggestedQuestions: ["Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?"],
        placeholder: "",
        sortOrder: 1,
      },
      {
        id: "k2_b02",
        code: "B02",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B02. Quá trình học tập.",
        focus: "Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?",
        suggestedQuestions: ["Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?"],
        placeholder: "",
        sortOrder: 2,
      },
      {
        id: "k2_b03",
        code: "B03",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B03. Thói quen tại nhà.",
        focus: "Con tự học, tự quản lý thời gian ở mức nào? Thói quen sinh hoạt, sử dụng thiết bị và hoạt động ngoài giờ ra sao?",
        suggestedQuestions: ["Con tự học, tự quản lý thời gian ở mức nào? Thói quen sinh hoạt, sử dụng thiết bị và hoạt động ngoài giờ ra sao?"],
        placeholder: "",
        sortOrder: 3,
      },
      {
        id: "k2_b04",
        code: "B04",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B04. Gia đình đồng hành.",
        focus: "Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?",
        suggestedQuestions: ["Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?"],
        placeholder: "",
        sortOrder: 4,
      },
      {
        id: "k2_b05",
        code: "B05",
        category: "B_TRAO_DOI_PH",
        categoryLabel: "B. Trao đổi định hướng với phụ huynh",
        title: "B05. Mục tiêu & kỳ vọng.",
        focus: "Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?",
        suggestedQuestions: ["Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?"],
        placeholder: "",
        sortOrder: 5,
      },
      {
        id: "k2_c01",
        code: "C01",
        category: "C_PHAN_HOA_KHOI_2",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 2 (Phụ huynh)",
        title: "C01. Thích nghi với học tập:",
        focus: "Con làm quen việc đọc, viết và bài tập về nhà ở lớp 1 như thế nào?",
        suggestedQuestions: ["Con làm quen việc đọc, viết và bài tập về nhà ở lớp 1 như thế nào?"],
        placeholder: "",
        sortOrder: 6,
      },
      {
        id: "k2_c02",
        code: "C02",
        category: "C_PHAN_HOA_KHOI_2",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 2 (Phụ huynh)",
        title: "C02. Đọc hiểu & toán cơ bản:",
        focus: "Con tự đọc yêu cầu và giải bài toán ở mức nào?",
        suggestedQuestions: ["Con tự đọc yêu cầu và giải bài toán ở mức nào?"],
        placeholder: "",
        sortOrder: 7,
      },
      {
        id: "k2_c03",
        code: "C03",
        category: "C_PHAN_HOA_KHOI_2",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 2 (Phụ huynh)",
        title: "C03. Tính tự giác:",
        focus: "Con có tự chuẩn bị sách vở và hoàn thành việc học không?",
        suggestedQuestions: ["Con có tự chuẩn bị sách vở và hoàn thành việc học không?"],
        placeholder: "",
        sortOrder: 8,
      },
      {
        id: "k2_c04",
        code: "C04",
        category: "C_PHAN_HOA_KHOI_2",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 2 (Phụ huynh)",
        title: "C04. Tiếng Anh:",
        focus: "Con thích học từ vựng, nghe nói hay hoạt động nào bằng tiếng Anh?",
        suggestedQuestions: ["Con thích học từ vựng, nghe nói hay hoạt động nào bằng tiếng Anh?"],
        placeholder: "",
        sortOrder: 9,
      },
      {
        id: "k2_c05",
        code: "C05",
        category: "C_PHAN_HOA_KHOI_2",
        categoryLabel: "C. Câu hỏi phân hóa riêng cho khối 2 (Phụ huynh)",
        title: "C05. Kỳ vọng:",
        focus: "Gia đình mong con cải thiện thói quen hay năng lực nào ở lớp 2?",
        suggestedQuestions: ["Gia đình mong con cải thiện thói quen hay năng lực nào ở lớp 2?"],
        placeholder: "",
        sortOrder: 10,
      },
    ],
    parentPrompts: {
      groupLabel: "Khối 2 (BM.KTĐBCL.32)",
      group1_expectations: {
        title: "B05. Mục tiêu & kỳ vọng",
        hints: ["Gia đình kỳ vọng điều gì nhất khi chọn Sky-Line? Ưu tiên phát triển kiến thức, tiếng Anh, kỹ năng, phẩm chất hay trải nghiệm nào?"],
        placeholder: "",
      },
      group2_personality: {
        title: "B01. Đặc điểm cá nhân & cảm xúc",
        hints: ["Ba từ mô tả con; điểm mạnh; điều con cần cải thiện. Con thường phản ứng thế nào khi gặp khó khăn, bị góp ý hoặc thất bại?"],
        placeholder: "",
      },
      group3_support: {
        title: "B02. Quá trình học tập",
        hints: ["Môn học/hoạt động con yêu thích và lĩnh vực cần hỗ trợ? Gia đình hoặc giáo viên đã áp dụng biện pháp hỗ trợ nào; hiệu quả?"],
        placeholder: "",
      },
      group4_cooperation: {
        title: "B04. Gia đình đồng hành",
        hints: ["Gia đình thường theo dõi và hỗ trợ việc học thế nào? Khi kết quả chưa tốt, gia đình phản hồi ra sao; mong muốn trao đổi với trường theo cách nào?"],
        placeholder: "",
      },
    },
  },
  // 3. KHỐI 3 - Tự học, khám phá, hợp tác
  KHOI_3: {
    key: "KHOI_3",
    gradeNumber: 3,
    label: "Khối 3",
    subLabel: "Tự học, khám phá, hợp tác nhóm và tư duy sáng tạo",
    focus: "Tự học, khám phá, hợp tác",
    gradeList: ["3","Khối 3","Lớp 3","K3"],
    criteria: [
      {
        id: "k3_c1",
        code: "K3-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 3)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Tự học, khám phá, hợp tác.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k3_c2",
        code: "K3-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 3)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Tự học, khám phá, hợp tác.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k3_c3",
        code: "K3-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 3)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k3_c4",
        code: "K3-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 3)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k3_c5",
        code: "K3-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 3)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k3_c6",
        code: "K3-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 3)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k3_c7",
        code: "K3-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 3)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k3_c8",
        code: "K3-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 3)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k3_c9",
        code: "K3-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 3)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k3_c10",
        code: "K3-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 3)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k3_p1",
        code: "K3-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 3)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k3_p2",
        code: "K3-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 3)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k3_p3",
        code: "K3-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 3)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k3_p4",
        code: "K3-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 3)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k3_p5",
        code: "K3-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 3)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 3 (Tự học, khám phá, hợp tác)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 4. KHỐI 4 - Trách nhiệm, quản lý thời gian, tư duy độc lập
  KHOI_4: {
    key: "KHOI_4",
    gradeNumber: 4,
    label: "Khối 4",
    subLabel: "Trách nhiệm, quản lý thời gian, tư duy độc lập và giải quyết vấn đề",
    focus: "Trách nhiệm, quản lý thời gian, tư duy độc lập",
    gradeList: ["4","Khối 4","Lớp 4","K4"],
    criteria: [
      {
        id: "k4_c1",
        code: "K4-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 4)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Trách nhiệm, quản lý thời gian, tư duy độc lập.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k4_c2",
        code: "K4-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 4)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Trách nhiệm, quản lý thời gian, tư duy độc lập.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k4_c3",
        code: "K4-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 4)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k4_c4",
        code: "K4-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 4)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k4_c5",
        code: "K4-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 4)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k4_c6",
        code: "K4-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 4)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k4_c7",
        code: "K4-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 4)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k4_c8",
        code: "K4-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 4)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k4_c9",
        code: "K4-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 4)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k4_c10",
        code: "K4-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 4)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k4_p1",
        code: "K4-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 4)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k4_p2",
        code: "K4-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 4)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k4_p3",
        code: "K4-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 4)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k4_p4",
        code: "K4-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 4)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k4_p5",
        code: "K4-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 4)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 4 (Trách nhiệm, quản lý thời gian, tư duy độc lập)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 5. KHỐI 5 - Nền tảng học tập, chuẩn bị chuyển cấp THCS
  KHOI_5: {
    key: "KHOI_5",
    gradeNumber: 5,
    label: "Khối 5",
    subLabel: "Nền tảng học tập vững chắc, chuẩn bị tâm thế chuyển cấp THCS",
    focus: "Nền tảng học tập, chuẩn bị chuyển cấp THCS",
    gradeList: ["5","Khối 5","Lớp 5","K5"],
    criteria: [
      {
        id: "k5_c1",
        code: "K5-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 5)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Nền tảng học tập, chuẩn bị chuyển cấp THCS.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k5_c2",
        code: "K5-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 5)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Nền tảng học tập, chuẩn bị chuyển cấp THCS.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k5_c3",
        code: "K5-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 5)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k5_c4",
        code: "K5-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 5)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k5_c5",
        code: "K5-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 5)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k5_c6",
        code: "K5-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 5)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k5_c7",
        code: "K5-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 5)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k5_c8",
        code: "K5-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 5)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k5_c9",
        code: "K5-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 5)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k5_c10",
        code: "K5-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 5)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k5_p1",
        code: "K5-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 5)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k5_p2",
        code: "K5-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 5)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k5_p3",
        code: "K5-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 5)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k5_p4",
        code: "K5-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 5)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k5_p5",
        code: "K5-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 5)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 5 (Nền tảng học tập, chuẩn bị chuyển cấp THCS)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 6. KHỐI 6 - Thích nghi THCS, nhiều môn học, nhiều giáo viên
  KHOI_6: {
    key: "KHOI_6",
    gradeNumber: 6,
    label: "Khối 6",
    subLabel: "Thích nghi THCS, phương pháp học đa môn, nhiều giáo viên bộ môn",
    focus: "Thích nghi THCS, nhiều môn học, nhiều giáo viên",
    gradeList: ["6","Khối 6","Lớp 6","K6"],
    criteria: [
      {
        id: "k6_c1",
        code: "K6-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 6)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Thích nghi THCS, nhiều môn học, nhiều giáo viên.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k6_c2",
        code: "K6-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 6)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Thích nghi THCS, nhiều môn học, nhiều giáo viên.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k6_c3",
        code: "K6-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 6)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k6_c4",
        code: "K6-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 6)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k6_c5",
        code: "K6-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 6)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k6_c6",
        code: "K6-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 6)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k6_c7",
        code: "K6-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 6)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k6_c8",
        code: "K6-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 6)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k6_c9",
        code: "K6-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 6)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k6_c10",
        code: "K6-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 6)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k6_p1",
        code: "K6-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 6)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k6_p2",
        code: "K6-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 6)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k6_p3",
        code: "K6-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 6)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k6_p4",
        code: "K6-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 6)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k6_p5",
        code: "K6-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 6)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 6 (Thích nghi THCS, nhiều môn học, nhiều giáo viên)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 7. KHỐI 7 - Động lực, thói quen học tập, quản lý bản thân
  KHOI_7: {
    key: "KHOI_7",
    gradeNumber: 7,
    label: "Khối 7",
    subLabel: "Động lực học tập nội tại, thói quen tự giác, quản lý cảm xúc bản thân",
    focus: "Động lực, thói quen học tập, quản lý bản thân",
    gradeList: ["7","Khối 7","Lớp 7","K7"],
    criteria: [
      {
        id: "k7_c1",
        code: "K7-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 7)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Động lực, thói quen học tập, quản lý bản thân.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k7_c2",
        code: "K7-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 7)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Động lực, thói quen học tập, quản lý bản thân.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k7_c3",
        code: "K7-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 7)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k7_c4",
        code: "K7-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 7)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k7_c5",
        code: "K7-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 7)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k7_c6",
        code: "K7-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 7)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k7_c7",
        code: "K7-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 7)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k7_c8",
        code: "K7-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 7)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k7_c9",
        code: "K7-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 7)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k7_c10",
        code: "K7-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 7)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k7_p1",
        code: "K7-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 7)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k7_p2",
        code: "K7-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 7)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k7_p3",
        code: "K7-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 7)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k7_p4",
        code: "K7-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 7)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k7_p5",
        code: "K7-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 7)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 7 (Động lực, thói quen học tập, quản lý bản thân)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 8. KHỐI 8 - Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề
  KHOI_8: {
    key: "KHOI_8",
    gradeNumber: 8,
    label: "Khối 8",
    subLabel: "Tư duy độc lập, phản biện, quản lý cảm xúc và giải quyết xung đột",
    focus: "Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề",
    gradeList: ["8","Khối 8","Lớp 8","K8"],
    criteria: [
      {
        id: "k8_c1",
        code: "K8-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 8)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k8_c2",
        code: "K8-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 8)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k8_c3",
        code: "K8-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 8)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k8_c4",
        code: "K8-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 8)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k8_c5",
        code: "K8-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 8)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k8_c6",
        code: "K8-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 8)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k8_c7",
        code: "K8-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 8)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k8_c8",
        code: "K8-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 8)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k8_c9",
        code: "K8-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 8)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k8_c10",
        code: "K8-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 8)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k8_p1",
        code: "K8-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 8)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k8_p2",
        code: "K8-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 8)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k8_p3",
        code: "K8-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 8)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k8_p4",
        code: "K8-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 8)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k8_p5",
        code: "K8-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 8)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 8 (Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 9. KHỐI 9 - Mục tiêu chuyển cấp THPT, phương pháp ôn tập
  KHOI_9: {
    key: "KHOI_9",
    gradeNumber: 9,
    label: "Khối 9",
    subLabel: "Xác định mục tiêu chuyển cấp THPT, phương pháp ôn tập thi cử hiệu quả",
    focus: "Mục tiêu chuyển cấp THPT, phương pháp ôn tập",
    gradeList: ["9","Khối 9","Lớp 9","K9"],
    criteria: [
      {
        id: "k9_c1",
        code: "K9-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 9)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Mục tiêu chuyển cấp THPT, phương pháp ôn tập.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k9_c2",
        code: "K9-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 9)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Mục tiêu chuyển cấp THPT, phương pháp ôn tập.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k9_c3",
        code: "K9-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 9)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k9_c4",
        code: "K9-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 9)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k9_c5",
        code: "K9-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 9)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k9_c6",
        code: "K9-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 9)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k9_c7",
        code: "K9-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 9)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k9_c8",
        code: "K9-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 9)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k9_c9",
        code: "K9-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 9)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k9_c10",
        code: "K9-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 9)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k9_p1",
        code: "K9-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 9)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k9_p2",
        code: "K9-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 9)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k9_p3",
        code: "K9-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 9)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k9_p4",
        code: "K9-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 9)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k9_p5",
        code: "K9-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 9)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 9 (Mục tiêu chuyển cấp THPT, phương pháp ôn tập)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 10. KHỐI 10 - Thích nghi THPT, lựa chọn môn học, định hướng cá nhân
  KHOI_10: {
    key: "KHOI_10",
    gradeNumber: 10,
    label: "Khối 10",
    subLabel: "Thích nghi môi trường THPT, lựa chọn tổ hợp môn học, định hướng cá nhân",
    focus: "Thích nghi THPT, lựa chọn môn học, định hướng cá nhân",
    gradeList: ["10","Khối 10","Lớp 10","K10"],
    criteria: [
      {
        id: "k10_c1",
        code: "K10-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 10)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Thích nghi THPT, lựa chọn môn học, định hướng cá nhân.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k10_c2",
        code: "K10-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 10)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Thích nghi THPT, lựa chọn môn học, định hướng cá nhân.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k10_c3",
        code: "K10-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 10)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k10_c4",
        code: "K10-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 10)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k10_c5",
        code: "K10-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 10)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k10_c6",
        code: "K10-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 10)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k10_c7",
        code: "K10-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 10)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k10_c8",
        code: "K10-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 10)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k10_c9",
        code: "K10-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 10)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k10_c10",
        code: "K10-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 10)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k10_p1",
        code: "K10-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 10)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k10_p2",
        code: "K10-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 10)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k10_p3",
        code: "K10-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 10)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k10_p4",
        code: "K10-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 10)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k10_p5",
        code: "K10-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 10)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 10 (Thích nghi THPT, lựa chọn môn học, định hướng cá nhân)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 11. KHỐI 11 - Hướng nghiệp, ngoại ngữ, kế hoạch đại học
  KHOI_11: {
    key: "KHOI_11",
    gradeNumber: 11,
    label: "Khối 11",
    subLabel: "Định hướng nghề nghiệp, phát triển ngoại ngữ học thuật, kế hoạch tuyển sinh đại học",
    focus: "Hướng nghiệp, ngoại ngữ, kế hoạch đại học",
    gradeList: ["11","Khối 11","Lớp 11","K11"],
    criteria: [
      {
        id: "k11_c1",
        code: "K11-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 11)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Hướng nghiệp, ngoại ngữ, kế hoạch đại học.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k11_c2",
        code: "K11-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 11)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Hướng nghiệp, ngoại ngữ, kế hoạch đại học.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k11_c3",
        code: "K11-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 11)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k11_c4",
        code: "K11-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 11)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k11_c5",
        code: "K11-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 11)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k11_c6",
        code: "K11-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 11)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k11_c7",
        code: "K11-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 11)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k11_c8",
        code: "K11-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 11)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k11_c9",
        code: "K11-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 11)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k11_c10",
        code: "K11-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 11)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k11_p1",
        code: "K11-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 11)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k11_p2",
        code: "K11-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 11)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k11_p3",
        code: "K11-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 11)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k11_p4",
        code: "K11-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 11)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k11_p5",
        code: "K11-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 11)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 11 (Hướng nghiệp, ngoại ngữ, kế hoạch đại học)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // 12. KHỐI 12 - Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp
  KHOI_12: {
    key: "KHOI_12",
    gradeNumber: 12,
    label: "Khối 12",
    subLabel: "Mục tiêu tốt nghiệp THPT, chiến lược xét tuyển đại học / du học, vững vàng nghề nghiệp",
    focus: "Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp",
    gradeList: ["12","Khối 12","Lớp 12","K12"],
    criteria: [
      {
        id: "k12_c1",
        code: "K12-A01",
        name: "Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (Khối 12)",
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        focus: "Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp.",
        guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
        suggestedQuestions: ["Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?","Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?","Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k12_c2",
        code: "K12-A02",
        name: "Động lực học tập nội tại và thái độ với mục tiêu học đường (Khối 12)",
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        focus: "Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp.",
        guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
        suggestedQuestions: ["Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?","Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?","Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k12_c3",
        code: "K12-A03",
        name: "Tư duy logic, giải quyết khúc mắc và vượt khó (Khối 12)",
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        focus: "Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.",
        guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
        suggestedQuestions: ["Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?","Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?","Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k12_c4",
        code: "K12-A04",
        name: "Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (Khối 12)",
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        focus: "Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.",
        guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
        suggestedQuestions: ["Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?","Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?","Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k12_c5",
        code: "K12-A05",
        name: "Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (Khối 12)",
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        focus: "Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.",
        guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
        suggestedQuestions: ["Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?","Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?","Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k12_c6",
        code: "K12-A06",
        name: "Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (Khối 12)",
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        focus: "Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.",
        guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
        suggestedQuestions: ["Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?","Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?","Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k12_c7",
        code: "K12-A07",
        name: "Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (Khối 12)",
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        focus: "Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.",
        guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
        suggestedQuestions: ["Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?","Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?","Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k12_c8",
        code: "K12-A08",
        name: "Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (Khối 12)",
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        focus: "Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.",
        guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
        suggestedQuestions: ["Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?","Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?","Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      },
      {
        id: "k12_c9",
        code: "K12-A09",
        name: "Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (Khối 12)",
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        focus: "Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.",
        guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
        suggestedQuestions: ["Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?","Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?","Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 9
      },
      {
        id: "k12_c10",
        code: "K12-A010",
        name: "Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (Khối 12)",
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        focus: "Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.",
        guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
        suggestedQuestions: ["Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?","Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?","Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?"],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 10
      }
    ],
    parentGroups: [
      {
        id: "k12_p1",
        code: "K12-B01",
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (Khối 12)",
        focus: "Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.",
        suggestedQuestions: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...",
        sortOrder: 1
      },
      {
        id: "k12_p2",
        code: "K12-B02",
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (Khối 12)",
        focus: "Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.",
        suggestedQuestions: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...",
        sortOrder: 2
      },
      {
        id: "k12_p3",
        code: "K12-B03",
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (Khối 12)",
        focus: "Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.",
        suggestedQuestions: ["Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?","Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?","Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?"],
        placeholder: "Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...",
        sortOrder: 3
      },
      {
        id: "k12_p4",
        code: "K12-B04",
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (Khối 12)",
        focus: "Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.",
        suggestedQuestions: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...",
        sortOrder: 4
      },
      {
        id: "k12_p5",
        code: "K12-B05",
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (Khối 12)",
        focus: "Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.",
        suggestedQuestions: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...",
        sortOrder: 5
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 12 (Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ["Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?","Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?","Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?"],
        placeholder: "Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ["Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?","Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?","Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?"],
        placeholder: "Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ["Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?","Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?","Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?"],
        placeholder: "Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ["Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?","Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?","Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?"],
        placeholder: "Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường..."
      }
    }
  },
  // Alias tương thích ngược
  get KHOI_2_5() { return this.KHOI_2; },
  get KHOI_7_9() { return this.KHOI_8; },
  get KHOI_10_12() { return this.KHOI_11; }
};

/**
 * Lấy cấu hình nhóm khối dựa trên khối lớp (grade) của học sinh
 * Hỗ trợ nhận diện chính xác từng khối từ 1 đến 12
 */
export function getGradeGroupKey(grade?: string | number | null): GradeGroupKey {
  if (!grade) return "KHOI_1";
  const str = String(grade).trim().toLowerCase();

  // Nhận diện từng khối chính xác
  if (str === "1" || str === "k1" || str === "lớp 1" || str === "khối 1" || str.includes("khối 1") || str.includes("lớp 1")) {
    if (!str.includes("10") && !str.includes("11") && !str.includes("12")) return "KHOI_1";
  }
  if (str === "2" || str === "k2" || str === "lớp 2" || str === "khối 2" || str.includes("khối 2") || str.includes("lớp 2")) return "KHOI_2";
  if (str === "3" || str === "k3" || str === "lớp 3" || str === "khối 3" || str.includes("khối 3") || str.includes("lớp 3")) return "KHOI_3";
  if (str === "4" || str === "k4" || str === "lớp 4" || str === "khối 4" || str.includes("khối 4") || str.includes("lớp 4")) return "KHOI_4";
  if (str === "5" || str === "k5" || str === "lớp 5" || str === "khối 5" || str.includes("khối 5") || str.includes("lớp 5")) return "KHOI_5";
  if (str === "6" || str === "k6" || str === "lớp 6" || str === "khối 6" || str.includes("khối 6") || str.includes("lớp 6")) return "KHOI_6";
  if (str === "7" || str === "k7" || str === "lớp 7" || str === "khối 7" || str.includes("khối 7") || str.includes("lớp 7")) return "KHOI_7";
  if (str === "8" || str === "k8" || str === "lớp 8" || str === "khối 8" || str.includes("khối 8") || str.includes("lớp 8")) return "KHOI_8";
  if (str === "9" || str === "k9" || str === "lớp 9" || str === "khối 9" || str.includes("khối 9") || str.includes("lớp 9")) return "KHOI_9";
  if (str === "10" || str === "k10" || str === "lớp 10" || str === "khối 10" || str.includes("khối 10") || str.includes("lớp 10")) return "KHOI_10";
  if (str === "11" || str === "k11" || str === "lớp 11" || str === "khối 11" || str.includes("khối 11") || str.includes("lớp 11")) return "KHOI_11";
  if (str === "12" || str === "k12" || str === "lớp 12" || str === "khối 12" || str.includes("khối 12") || str.includes("lớp 12")) return "KHOI_12";

  // Thử parse số nguyên
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 12) {
      return ("KHOI_" + num) as GradeGroupKey;
    }
  }

  return "KHOI_1";
}

import { PVDH_SEED_TEMPLATES, getDefaultPvdhCodeForGrade } from "@/lib/pvdh/constants";

// Đồng bộ hóa tiêu chí phỏng vấn Học sinh (6 nhóm) & Phụ huynh (5 nhóm) theo đúng cấu hình Mẫu định hướng HS và PHHS (PVDH-01..05)
Object.values(ORIENTATION_GRADE_GROUPS).forEach((group) => {
  const pvdhCode = getDefaultPvdhCodeForGrade(group.gradeNumber) || "PVDH-03";
  const pvdhTpl = PVDH_SEED_TEMPLATES.find((t) => t.code === pvdhCode);
  if (!pvdhTpl) return;

  const hsFields = pvdhTpl.fields
    .filter((f) => f.sectionCode === "II_STUDENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const phFields = pvdhTpl.fields
    .filter((f) => f.sectionCode === "IV_PARENT" || f.sectionCode === "C_PARENT_GRADE")
    .sort((a, b) => {
      if (a.sectionCode !== b.sectionCode) return a.sectionCode === "IV_PARENT" ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });

  if (pvdhTpl.code.startsWith("BM.KTĐBCL.")) {
    group.label = `Khối ${group.gradeNumber} (${pvdhTpl.code})`;
    if (group.reportConfig) {
      group.reportConfig.groupLabel = `Khối ${group.gradeNumber} (${pvdhTpl.code})`;
    }
  }
  group.subLabel = `${pvdhTpl.code} — ${pvdhTpl.name}`;
  group.focus = pvdhTpl.description;

  if (hsFields.length > 0) {
    group.criteria = hsFields.map((f, idx) => ({
      id: f.fieldKey,
      code: f.fieldKey,
      name: f.label,
      category: f.sectionCode,
      categoryLabel: f.itemNumber ? `${f.itemNumber}. ${f.label}` : f.label,
      focus: f.promptQuestion || f.guideline || "",
      guideline: f.guideline || "",
      suggestedQuestions: f.promptQuestion ? [f.promptQuestion] : [],
      mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
      sortOrder: f.itemNumber || idx + 1,
    }));
  }

  if (phFields.length > 0) {
    group.parentGroups = phFields.map((f, idx) => ({
      id: f.fieldKey,
      code: f.fieldKey,
      category: f.sectionCode,
      categoryLabel: f.itemNumber ? `${f.itemNumber}. ${f.label}` : f.label,
      title: f.label,
      focus: f.promptQuestion || f.guideline || "",
      suggestedQuestions: f.promptQuestion ? [f.promptQuestion] : [],
      placeholder: f.guideline || "",
      sortOrder: f.itemNumber || idx + 1,
    }));
  }
});

/**
 * Trả về toàn bộ cấu hình nhóm khối của học sinh (đã đồng bộ với PVDH-01..05)
 */
export function getOrientationGradeGroupConfig(grade?: string | number | null): OrientationGradeGroupConfig {
  const key = getGradeGroupKey(grade);
  return ORIENTATION_GRADE_GROUPS[key] || ORIENTATION_GRADE_GROUPS.KHOI_1;
}

/**
 * Bảng 04 mức mô tả quan sát chuẩn hóa cho phiếu định hướng (không chấm điểm số)
 */
export const ORIENTATION_RATING_OPTIONS: Record<
  RatingCode,
  {
    code: RatingCode;
    label: string;
    subText: string;
    colorClass: string;
    badgeClass: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
  }
> = {
  CONFIDENT: {
    code: "CONFIDENT",
    label: "Thể hiện rõ",
    subText: "Thể hiện nổi bật, tự tin, chủ động và vững vàng",
    colorClass: "teal",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300 font-semibold",
    bgClass: "bg-teal-50/70",
    borderClass: "border-teal-400",
    textClass: "text-teal-800"
  },
  NORMAL: {
    code: "NORMAL",
    label: "Đang hình thành",
    subText: "Đạt chuẩn phát triển lứa tuổi, đang dần hoàn thiện nề nếp",
    colorClass: "blue",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 font-semibold",
    bgClass: "bg-blue-50/70",
    borderClass: "border-blue-400",
    textClass: "text-blue-800"
  },
  NEED_SUPPORT: {
    code: "NEED_SUPPORT",
    label: "Cần tìm hiểu thêm",
    subText: "Cần GVCN/Bộ môn quan sát sâu & hỗ trợ đồng hành ban đầu",
    colorClass: "amber",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    bgClass: "bg-amber-50/70",
    borderClass: "border-amber-400",
    textClass: "text-amber-800"
  },
  SPECIAL_ATTENTION: {
    code: "SPECIAL_ATTENTION",
    label: "Chưa đủ thông tin",
    subText: "Cần thêm thời gian tương tác hoặc xác minh chuyên môn bổ sung",
    colorClass: "slate",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 font-bold",
    bgClass: "bg-slate-50/70",
    borderClass: "border-slate-400",
    textClass: "text-slate-800"
  }
};

/**
 * Kiểm tra xem mức đánh giá này có bắt buộc nhập nhận xét không
 */
export function isCommentMandatory(rating: RatingCode): boolean {
  return rating === "NEED_SUPPORT" || rating === "SPECIAL_ATTENTION";
}
