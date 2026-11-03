/**
 * CẤU HÌNH TIÊU CHÍ PHỎNG VẤN ĐỊNH HƯỚNG ĐẦU VÀO - SSM SKY-LINE
 * Phiên bản: 2026.2 (Chuẩn hóa 8 Tiêu chí / Câu hỏi Phỏng vấn Học sinh cho mỗi nhóm khối)
 * 
 * Quản lý tập trung 05 nhóm khối:
 * - Khối 1 (Chuyển tiếp mầm non & Làm quen lớp 1) - 8 Câu hỏi chuẩn
 * - Khối 2–5 (Tiểu học: Nề nếp tự học & Phát triển toàn diện) - 8 Câu hỏi chuẩn
 * - Khối 6 (Chuyển tiếp THCS: Môi trường mới & Tự học) - 8 Câu hỏi chuẩn
 * - Khối 7–9 (THCS: Trách nhiệm, Sở trường & Kỹ năng) - 8 Câu hỏi chuẩn
 * - Khối 10–12 (THPT: Tư duy phản biện & Định hướng nghề nghiệp) - 8 Câu hỏi chuẩn
 */

export const ORIENTATION_CRITERIA_VERSION = "2026.2";

export type GradeGroupKey = "KHOI_1" | "KHOI_2_5" | "KHOI_6" | "KHOI_7_9" | "KHOI_10_12";

export type RatingCode = "CONFIDENT" | "NORMAL" | "NEED_SUPPORT" | "SPECIAL_ATTENTION";

export interface OrientationCriterion {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  guideline: string;
  suggestedQuestions: string[];
  mandatoryCommentRatings: RatingCode[];
  sortOrder: number;
}

export interface OrientationGradeGroupConfig {
  key: GradeGroupKey;
  label: string;
  subLabel: string;
  gradeList: string[];
  criteria: OrientationCriterion[];
  parentPrompts: {
    groupLabel: string;
    group1_expectations: { title: string; hints: string[]; placeholder: string };
    group2_personality: { title: string; hints: string[]; placeholder: string };
    group3_support: { title: string; hints: string[]; placeholder: string };
    group4_cooperation: { title: string; hints: string[]; placeholder: string };
  };
}

export const ORIENTATION_GRADE_GROUPS: Record<GradeGroupKey, OrientationGradeGroupConfig> = {
  // 1. KHỐI 1 (8 CÂU HỎI CHUẨN)
  KHOI_1: {
    key: "KHOI_1",
    label: "Khối 1",
    subLabel: "Chuyển tiếp Mầm non & Làm quen Lớp 1 (8 Câu hỏi chuẩn)",
    gradeList: ["1", "Khối 1", "Lớp 1", "K1"],
    criteria: [
      {
        id: "k1_c1",
        name: "1. Giao tiếp & Tự giới thiệu",
        category: "GIAO_TIEP_TU_GIOI_THIEU",
        categoryLabel: "Giao tiếp & Tự giới thiệu",
        guideline: "Quan sát phản xạ chào hỏi, ánh mắt tiếp xúc, sự tự tin hay e dè khi giao tiếp với người lạ và cô giáo.",
        suggestedQuestions: [
          "Con tên là gì? Hôm nay ai đưa con đến trường Sky-Line?",
          "Con nhìn thấy trường và lớp học có gì đẹp, có bạn nào con muốn làm quen không?",
          "Con có thích giới thiệu về bản thân hoặc gia đình mình với cô không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k1_c2",
        name: "2. Kỹ năng tự phục vụ & Nề nếp",
        category: "TU_PHUC_VU_NE_NEP",
        categoryLabel: "Tự phục vụ & Nề nếp",
        guideline: "Đánh giá mức độ tự lập trong sinh hoạt cá nhân, kỹ năng tự phục vụ cơ bản phù hợp lứa tuổi 5-6 tuổi.",
        suggestedQuestions: [
          "Ở nhà hay ở trường mầm non, con tự đi giày dép, rửa tay và dọn dẹp đồ chơi như thế nào?",
          "Con có tự xúc cơm ăn và cất đồ dùng của mình vào ba lô được không?",
          "Khi cần đi vệ sinh hoặc muốn uống nước, con sẽ nói với cô thế nào?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k1_c3",
        name: "3. Hứng thú học tập & Khám phá",
        category: "HUNG_THU_HOC_TAP",
        categoryLabel: "Hứng thú Học tập & Khám phá",
        guideline: "Quan sát tính tò mò, hứng thú với học liệu (tranh ảnh, sách truyện, đồ chơi tư duy) và sự chú ý.",
        suggestedQuestions: [
          "Con thích nhất trò chơi, bức tranh hay hoạt động nào?",
          "Con có thích nghe cô kể chuyện, đọc thơ hoặc tô màu, nhận biết chữ cái không?",
          "Con có tò mò muốn biết cách các bạn nhỏ lớp 1 tập đọc và làm toán không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k1_c4",
        name: "4. Tư duy trực quan & Chú ý tập trung",
        category: "TU_DUY_TRUC_QUAN_CHU_Y",
        categoryLabel: "Tư duy Trực quan & Chú ý",
        guideline: "Đánh giá khả năng tập trung lắng nghe hướng dẫn ngắn, phân biệt hình khối, màu sắc và logic tranh ảnh đơn giản.",
        suggestedQuestions: [
          "Con nhìn vào bức tranh này và tìm giúp cô xem có bao nhiêu bạn nhỏ đang chơi đùa nhé?",
          "Theo con, đồ vật nào dưới đây không cùng nhóm với các đồ vật còn lại?",
          "Khi cô hướng dẫn một trò chơi mới, con có thể lắng nghe từ đầu đến cuối không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k1_c5",
        name: "5. Vận động tinh & Khéo léo bàn tay",
        category: "VAN_DONG_TINH_KHEO_LEO",
        categoryLabel: "Vận động Tinh & Khéo léo",
        guideline: "Quan sát tư thế cầm bút, độ linh hoạt của các ngón tay khi tô màu, gấp giấy hoặc cầm nắm học cụ.",
        suggestedQuestions: [
          "Con cầm bút vẽ thử một nét thẳng và một vòng tròn giúp cô xem nào?",
          "Con có thích các trò chơi xâu hạt, ghép lego hay gấp giấy không?",
          "Ở nhà con có thường xuyên tự cầm thìa, kéo đồ chơi hay cài cúc áo không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k1_c6",
        name: "6. Hợp tác & Tương tác bạn bè",
        category: "HOP_TAC_BAN_BE",
        categoryLabel: "Hợp tác & Tương tác Bạn bè",
        guideline: "Đánh giá tinh thần chia sẻ đồ chơi, sự thân thiện và cách ứng xử khi chơi cùng các bạn mới.",
        suggestedQuestions: [
          "Nếu có bạn muốn mượn hộp màu hoặc đồ chơi của con, con sẽ làm thế nào?",
          "Khi vào lớp học mới có nhiều bạn lạ, con có vui vẻ chơi chung không?",
          "Con thích chơi trò chơi một mình hay chơi cùng một nhóm bạn hơn?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k1_c7",
        name: "7. Cảm xúc & Khả năng thích nghi",
        category: "CAM_XUC_THICH_NGHI",
        categoryLabel: "Cảm xúc & Khả năng Thích nghi",
        guideline: "Nhận diện phản ứng tâm lý khi tách khỏi phụ huynh, khả năng bộc lộ và điều hòa cảm xúc ban đầu.",
        suggestedQuestions: [
          "Khi xa ba mẹ vào phòng học mới, con cảm thấy thế nào?",
          "Nếu có điều gì làm con lo lắng hoặc buồn, con sẽ nói với ai?",
          "Hôm nay đến trường Sky-Line con thấy vui nhất ở điểm nào?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k1_c8",
        name: "8. Tâm thế & Kỳ vọng vào Lớp 1",
        category: "TAM_THE_LOP_1",
        categoryLabel: "Tâm thế & Kỳ vọng Lớp 1",
        guideline: "Đánh giá mức độ hào hứng, sẵn sàng tâm lý bước vào môi trường tiểu học chính khóa tại Sky-Line.",
        suggestedQuestions: [
          "Con có mong muốn được mang ba lô mới và mặc đồng phục đẹp đi học lớp 1 không?",
          "Con muốn học được điều gì mới nhất khi vào lớp 1 (đọc truyện, làm toán, nói tiếng Anh)?",
          "Ai ở nhà hay động viên và khen ngợi con khi con làm được việc tốt?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 1 (Chuyển tiếp mầm non & Làm quen lớp 1)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: [
          "Gia đình kỳ vọng con phát triển những kỹ năng, phẩm chất nào nhất khi vào lớp 1 (sự tự tin, tính tự lập, khả năng ngôn ngữ hay tư duy sáng tạo)?",
          "Kỳ vọng của bố mẹ về sự đồng hành và phương pháp giáo dục của Sky-Line dành cho con?"
        ],
        placeholder: "Ví dụ: Mong muốn con rèn tính tự lập, tự tin giao tiếp, yêu thích việc đến trường, tiếp cận tiếng Anh tự nhiên..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, sở thích và thói quen của học sinh",
        hints: [
          "Ở nhà con có sở thích gì (vẽ tranh, xếp lego, vận động, nghe kể chuyện)?",
          "Thói quen sinh hoạt, nề nếp ăn ngủ và cách con biểu đạt cảm xúc khi gặp điều mới lạ hoặc người lạ?"
        ],
        placeholder: "Ví dụ: Con thích xếp hình và vẽ tranh; tính cách nhanh nhẹn, hòa đồng, đôi lúc còn rụt rè trước đám đông..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ và đề xuất từ PHHS",
        hints: [
          "Gia đình có đề xuất gì để nhà trường hỗ trợ con thích nghi tốt nhất trong tuần đầu (động viên khi xa bố mẹ, kết nối bạn bè)?",
          "Các nhu cầu dịch vụ học đường (xe đưa đón, chăm sóc bán trú, câu lạc bộ sau giờ học)?"
        ],
        placeholder: "Ví dụ: Đề xuất cô giáo quan sát động viên con trong tuần đầu; đăng ký tuyến xe đưa đón tại nhà..."
      },
      group4_cooperation: {
        title: "4. Nội dung phối hợp giáo dục giữa gia đình và nhà trường",
        hints: [
          "Thời gian gia đình có thể cùng con đọc sách hoặc trò chuyện mỗi tối?",
          "Cam kết cùng GVCN rèn luyện thói quen tự phục vụ tại nhà và theo dõi thông tin học tập qua kênh liên lạc của trường."
        ],
        placeholder: "Ví dụ: Bố mẹ dành 30 phút mỗi tối đồng hành cùng con; cam kết phối hợp chặt chẽ với GVCN để rèn nếp tự lập..."
      }
    }
  },

  // 2. KHỐI 2–5 (8 CÂU HỎI CHUẨN)
  KHOI_2_5: {
    key: "KHOI_2_5",
    label: "Khối 2–5",
    subLabel: "Tiểu học: Nề nếp Tự học & Phát triển Toàn diện (8 Câu hỏi chuẩn)",
    gradeList: ["2", "3", "4", "5", "Khối 2", "Khối 3", "Khối 4", "Khối 5"],
    criteria: [
      {
        id: "k25_c1",
        name: "1. Giao tiếp & Thể hiện bản thân",
        category: "GIAO_TIEP_THE_HIEN",
        categoryLabel: "Giao tiếp & Thể hiện bản thân",
        guideline: "Đánh giá kỹ năng diễn đạt lưu loát, tự tin, mạch lạc, phong thái tự nhiên khi chia sẻ quan điểm.",
        suggestedQuestions: [
          "Con hãy giới thiệu ngắn về bản thân và điều con tự hào nhất về mình nhé?",
          "Ở lớp học trước đây, con có hay giơ tay phát biểu ý kiến xây dựng bài không?",
          "Khi cần chia sẻ một câu chuyện vui hoặc kỷ niệm đáng nhớ, con thường kể về điều gì?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k25_c2",
        name: "2. Thói quen & Ý thức tự học",
        category: "THOI_QUEN_Y_THUC",
        categoryLabel: "Thói quen & Ý thức Tự học",
        guideline: "Đánh giá tính tự giác, nề nếp ngồi học ở nhà, sự chủ động hoàn thành bài tập mà không cần nhắc nhở.",
        suggestedQuestions: [
          "Mỗi tối con tự giác ngồi vào bàn học hay cần ba mẹ nhắc nhở?",
          "Con thường dành bao nhiêu thời gian cho việc tự học và ôn bài mỗi ngày?",
          "Con có thói quen đọc sách hàng ngày không? Con thích đọc loại sách nào nhất?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k25_c3",
        name: "3. Hứng thú học tập & Môn học yêu thích",
        category: "HUNG_THU_MON_HOC",
        categoryLabel: "Hứng thú & Môn học yêu thích",
        guideline: "Nhận diện môn học học sinh say mê, động lực tiếp thu kiến thức và thái độ đối với các môn học thuật.",
        suggestedQuestions: [
          "Con say mê môn học nào nhất (Toán, Tiếng Việt, Tiếng Anh, Khoa học...) và vì sao con thích?",
          "Có môn học nào con cảm thấy hơi khó hoặc muốn được thầy cô giúp đỡ nhiều hơn không?",
          "Con thấy việc học tiếng Anh với giáo viên nước ngoài có thú vị không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k25_c4",
        name: "4. Tư duy & Giải quyết vấn đề",
        category: "TU_DUY_GIAI_QUYET_VD",
        categoryLabel: "Tư duy & Giải quyết Vấn đề",
        guideline: "Quan sát phản xạ tư duy logic, sự kiên trì khi đối diện thử thách học thuật khó và tính tìm tòi.",
        suggestedQuestions: [
          "Khi gặp một bài toán hoặc câu hỏi khó, con thường suy nghĩ tìm cách giải hay nhờ trợ giúp ngay?",
          "Nếu con thử một cách làm mà chưa đúng, con sẽ làm gì tiếp theo?",
          "Con thích tự mình khám phá ra câu trả lời hay muốn được chỉ bảo từng bước?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k25_c5",
        name: "5. Hợp tác & Kỹ năng làm việc nhóm",
        category: "HOP_TAC_NHOM",
        categoryLabel: "Hợp tác & Làm việc nhóm",
        guideline: "Đánh giá tinh thần chia sẻ, kỹ năng lắng nghe bạn bè, thái độ hòa đồng và cách giải quyết bất đồng.",
        suggestedQuestions: [
          "Ở lớp cũ con có nhiều bạn thân không? Giờ ra chơi con hay chơi trò gì cùng các bạn?",
          "Khi có bạn mượn đồ hoặc xảy ra tranh luận, con thường trao đổi với bạn thế nào?",
          "Con đã từng làm việc nhóm chưa? Con thấy làm việc chung với các bạn có vui không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k25_c6",
        name: "6. Sở thích, Năng khiếu & Thể chất",
        category: "SO_THICH_NANG_KHIEU",
        categoryLabel: "Sở thích, Năng khiếu & Thể chất",
        guideline: "Nhận diện năng khiếu tiềm năng (thể thao, hội họa, âm nhạc, cờ vua, lập trình...) để định hướng bồi dưỡng.",
        suggestedQuestions: [
          "Ngoài giờ học, con có đam mê môn thể thao, nghệ thuật, âm nhạc hay vẽ tranh nào không?",
          "Con có từng tham gia cuộc thi hay biểu diễn văn nghệ, thể thao nào chưa?",
          "Con có mong muốn tham gia câu lạc bộ nào tại Sky-Line không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k25_c7",
        name: "7. Tự quản lý & Nề nếp sinh hoạt",
        category: "TU_QUAN_LY_NE_NEP",
        categoryLabel: "Tự quản lý & Nề nếp",
        guideline: "Đánh giá mức độ tự lập trong sắp xếp cặp sách, giữ gìn đồ dùng học tập và quản lý thời gian sinh hoạt cá nhân.",
        suggestedQuestions: [
          "Con tự chuẩn bị sách vở, cặp sách và đồ dùng cá nhân mỗi tối như thế nào?",
          "Con có thói quen cất dọn bàn học gọn gàng sau khi học xong không?",
          "Con quản lý thời gian xem tivi hoặc sử dụng thiết bị điện tử ở nhà ra sao?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k25_c8",
        name: "8. Cảm xúc, Thích nghi & Mục tiêu mới",
        category: "CAM_XUC_MUC_TIEU",
        categoryLabel: "Cảm xúc, Thích nghi & Mục tiêu",
        guideline: "Nhận diện tâm lý khi chuyển trường, khả năng hòa nhập môi trường mới và mục tiêu học tập tại Sky-Line.",
        suggestedQuestions: [
          "Khi chuyển sang học tại Sky-Line, con cảm thấy hào hứng hay băn khoăn điều gì nhất?",
          "Khi gặp chuyện buồn hoặc không như ý, con thường tâm sự với ai?",
          "Mục tiêu lớn nhất con muốn đạt được trong năm học này là gì?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 2–5 (Tiểu học: Nề nếp tự học & Phát triển toàn diện)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: [
          "Mục tiêu trọng tâm gia đình hướng đến cho con trong cấp Tiểu học (song ngữ, năng khiếu, kỹ năng tự chủ, phương pháp học tập)?",
          "Kỳ vọng của bố mẹ về sự tiến bộ học tập và sự tự tin của con?"
        ],
        placeholder: "Ví dụ: Gia đình kỳ vọng con phát triển tốt năng lực tiếng Anh, có phương pháp tự học chủ động và kỹ năng làm việc nhóm..."
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, sở thích và thói quen của học sinh",
        hints: [
          "Thói quen tự học và hoàn thành bài tập của con tại nhà?",
          "Các năng khiếu, môn học hoặc hoạt động con đặc biệt say mê (thể thao, âm nhạc, khoa học, đọc sách)?"
        ],
        placeholder: "Ví dụ: Con có thói quen đọc sách mỗi tối, yêu thích môn Toán và bơi lội; khả năng tự giác hoàn thành bài tập tốt..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ và đề xuất từ PHHS",
        hints: [
          "Gia đình mong muốn nhà trường hỗ trợ con phát triển thêm năng lực nào (bồi dưỡng năng khiếu, rèn sự tập trung, kỹ năng thuyết trình)?",
          "Đề xuất về chế độ rèn luyện, câu lạc bộ ngoại khóa hoặc chăm sóc học đường?"
        ],
        placeholder: "Ví dụ: Mong muốn nhà trường tạo điều kiện cho con tham gia CLB bóng rổ và đội tuyển tiếng Anh; hỗ trợ rèn thêm sự tập trung..."
      },
      group4_cooperation: {
        title: "4. Nội dung phối hợp giáo dục giữa gia đình và nhà trường",
        hints: [
          "Sự phối hợp theo dõi sổ liên lạc điện tử / ứng dụng Sky-Line và phản hồi định kỳ với GVCN.",
          "Cân bằng thời gian sinh hoạt, rèn luyện thể chất và quản lý sử dụng thiết bị điện tử tại nhà."
        ],
        placeholder: "Ví dụ: Gia đình duy trì thói quen trò chuyện với con sau giờ học; thống nhất thời gian biểu và cam kết hạn chế thiết bị điện tử..."
      }
    }
  },

  // 3. KHỐI 6 (8 CÂU HỎI CHUẨN)
  KHOI_6: {
    key: "KHOI_6",
    label: "Khối 6",
    subLabel: "Chuyển tiếp THCS: Hòa nhập Môi trường Mới & Tự học (8 Câu hỏi chuẩn)",
    gradeList: ["6", "Khối 6", "Lớp 6", "K6"],
    criteria: [
      {
        id: "k6_c1",
        name: "1. Giao tiếp & Hòa nhập môi trường mới",
        category: "HOA_NHAP_MOI_TRUONG",
        categoryLabel: "Giao tiếp & Hòa nhập Môi trường mới",
        guideline: "Quan sát sự cởi mở, kỹ năng kết nối xã hội và khả năng chủ động hòa nhập lứa tuổi chuyển cấp Tiểu học lên THCS.",
        suggestedQuestions: [
          "Bước vào lớp 6 với nhiều môn học và thầy cô bộ môn mới, con cảm thấy hào hứng hay lo lắng điều gì nhất?",
          "Con thường bắt đầu làm quen với bạn bè mới như thế nào trong những ngày đầu nhập học?",
          "Con có sẵn sàng tham gia các hoạt động ngoại khóa để mở rộng vòng kết nối bạn bè không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k6_c2",
        name: "2. Phương pháp tự học & Quản lý thời gian",
        category: "TU_HOC_THOI_GIAN",
        categoryLabel: "Tự học & Quản lý Thời gian",
        guideline: "Đánh giá kỹ năng lập kế hoạch học tập cá nhân, nhận thức về việc tăng khối lượng học tập và tính độc lập tự học.",
        suggestedQuestions: [
          "Lên lớp 6 số môn học và bài tập sẽ tăng lên, con dự định sắp xếp thời gian tự học ở nhà và chuẩn bị bài thế nào?",
          "Con đã biết cách sử dụng thời khóa biểu, sổ tay ghi chú để quản lý công việc học tập chưa?",
          "Khi có nhiều hạn nộp bài tập cùng lúc, con xử lý ưu tiên như thế nào?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k6_c3",
        name: "3. Nhận thức chuyển cấp THCS",
        category: "NHAN_THUC_CHUYEN_CAP",
        categoryLabel: "Nhận thức Chuyển cấp",
        guideline: "Nhận diện mức độ trưởng thành về tâm lý, ý thức trách nhiệm đối với cấp học mới và sự sẵn sàng cho thử thách.",
        suggestedQuestions: [
          "Theo con, học sinh lớp 6 THCS khác học sinh Tiểu học ở những điểm quan trọng nào?",
          "Con mong muốn bản thân thay đổi hoặc tiến bộ hơn ở điểm nào khi bước vào cấp học mới?",
          "Mục tiêu năm học đầu tiên tại THCS Sky-Line của con là gì?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k6_c4",
        name: "4. Thích ứng phương pháp học đa môn",
        category: "THICH_UNG_DA_MON",
        categoryLabel: "Thích ứng Học tập Đa môn",
        guideline: "Đánh giá khả năng thích ứng với việc mỗi môn có một giáo viên khác nhau, phương pháp ghi chép và tiếp nhận bài giảng.",
        suggestedQuestions: [
          "Ở THCS mỗi môn sẽ có một thầy cô bộ môn riêng, con dự định thích ứng với các cách dạy khác nhau ra sao?",
          "Con ghi chép bài vở và ôn tập kiến thức các môn Khoa học tự nhiên hay Lịch sử - Địa lý thế nào?",
          "Nếu có bài giảng con chưa hiểu ngay trên lớp, con sẽ làm gì để nắm chắc kiến thức?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k6_c5",
        name: "5. Hợp tác & Xử lý bất đồng bạn bè",
        category: "HOP_TAC_XU_LY_BAT_DONG",
        categoryLabel: "Hợp tác & Xử lý Bất đồng",
        guideline: "Đánh giá kỹ năng làm việc nhóm, cách ứng xử văn minh và khả năng giải quyết mâu thuẫn lứa tuổi đầu cấp 2.",
        suggestedQuestions: [
          "Khi làm việc nhóm mà có bạn không hoàn thành phần việc, con sẽ trao đổi với bạn thế nào?",
          "Nếu có xích mích hoặc hiểu lầm với bạn bè trong lớp, con thường giải quyết ra sao?",
          "Làm thế nào để xây dựng một tập thể lớp đoàn kết và tôn trọng lẫn nhau theo suy nghĩ của con?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k6_c6",
        name: "6. Sở thích, Hoạt động ngoại khóa & CLB",
        category: "SO_THICH_CLB_TRAI_NGHIEM",
        categoryLabel: "Sở thích & Hoạt động Ngoại khóa",
        guideline: "Khám phá đam mê ngoại khóa, thể thao, nghệ thuật và nhu cầu phát triển toàn diện bản thân tại Sky-Line.",
        suggestedQuestions: [
          "Con yêu thích môn thể thao, nghệ thuật hoặc hoạt động khoa học nào nhất?",
          "Con có mong muốn tham gia câu lạc bộ nào tại Sky-Line (Tranh biện, STEM, Thể thao, Tình nguyện)?",
          "Con đã từng tham gia chuyến đi trải nghiệm thực tế nào đáng nhớ nhất chưa?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k6_c7",
        name: "7. Cảm xúc & Cơ chế tìm kiếm hỗ trợ",
        category: "CAM_XUC_HO_TRO",
        categoryLabel: "Cảm xúc & Cơ chế Tìm kiếm Hỗ trợ",
        guideline: "Nắm bắt sức khỏe cảm xúc, khả năng bộc lộ nhu cầu trợ giúp để thiết lập mạng lưới hỗ trợ sớm từ GVCN và Cố vấn.",
        suggestedQuestions: [
          "Khi gặp khó khăn về bài vở hoặc cảm xúc không vui, con thường chia sẻ với ai trước tiên?",
          "Con mong muốn thầy cô Sky-Line đồng hành và hỗ trợ con điều gì nhất trong học kỳ đầu tiên?",
          "Nếu có những điều chưa rõ về nội quy trường mới, con có thoải mái hỏi thầy cô không?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k6_c8",
        name: "8. Mục tiêu & Kỳ vọng tại Sky-Line",
        category: "MUC_TIEU_SKYLINE_THCS",
        categoryLabel: "Mục tiêu & Kỳ vọng tại Sky-Line",
        guideline: "Đánh giá sự tự giác, động lực học tập và các mục tiêu cụ thể mà học sinh muốn chinh phục ở cấp THCS.",
        suggestedQuestions: [
          "Mục tiêu lớn nhất con đặt ra cho mình trong năm học lớp 6 này là gì?",
          "Con muốn nâng cao năng lực nào nhất (tiếng Anh, kỹ năng thuyết trình, kết quả thi đua)?",
          "Điều gì ở trường Sky-Line làm con cảm thấy ấn tượng và hào hứng nhất?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 6 (Chuyển cấp THCS & Thích nghi môi trường mới)",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS khi con chuyển cấp lên Lớp 6 THCS",
        hints: [
          "Kỳ vọng của gia đình về sự chuyển tiếp từ Tiểu học lên THCS (phương pháp tự học, khả năng thích ứng nhiều môn, ngoại ngữ)?",
          "Mục tiêu giáo dục trọng tâm mà gia đình mong muốn nhà trường đồng hành cùng con?"
        ],
        placeholder: "Ví dụ: Mong muốn con thích nghi nhanh với phương pháp học THCS, tự chủ thời gian, phát triển tốt tiếng Anh học thuật..."
      },
      group2_personality: {
        title: "2. Đặc điểm tâm sinh lý, sở thích và thói quen bước vào tuổi dậy thì",
        hints: [
          "Những thay đổi tâm lý hoặc tính cách gần đây của con mà gia đình nhận thấy?",
          "Thói quen sử dụng điện thoại/máy tính và sự tương tác giữa con với các thành viên trong gia đình?"
        ],
        placeholder: "Ví dụ: Con bắt đầu muốn có không gian riêng, cá tính độc lập hơn, thích tìm hiểu công nghệ và chơi thể thao..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ chuyển cấp từ phía Nhà trường",
        hints: [
          "Gia đình đề xuất thầy cô hỗ trợ con hòa nhập như thế nào trong tháng đầu tiên?",
          "Có những lưu ý đặc biệt nào về phương pháp tiếp cận hoặc tâm lý của con không?"
        ],
        placeholder: "Ví dụ: Đề nghị GVCN và Ban Cố vấn theo dõi sát giai đoạn đầu để con không bị bỡ ngỡ với các môn học mới..."
      },
      group4_cooperation: {
        title: "4. Phối hợp giữa Gia đình & Nhà trường trong quản lý học tập THCS",
        hints: [
          "Hình thức và tần suất phối hợp trao đổi thông tin với GVCN mà gia đình mong muốn?",
          "Sự đồng hành của phụ huynh trong việc rèn luyện tính tự giác và kiểm soát thiết bị số tại nhà."
        ],
        placeholder: "Ví dụ: Gia đình cam kết theo dõi sát sao tiến độ học tập qua cổng SSM, phối hợp cùng nhà trường hướng dẫn con sử dụng internet an toàn..."
      }
    }
  },

  // 4. KHỐI 7–9 (8 CÂU HỎI CHUẨN)
  KHOI_7_9: {
    key: "KHOI_7_9",
    label: "Khối 7–9",
    subLabel: "THCS: Tự học, Trách nhiệm & Định hướng Phát triển (8 Câu hỏi chuẩn)",
    gradeList: ["7", "8", "9", "Khối 7", "Khối 8", "Khối 9"],
    criteria: [
      {
        id: "k79_c1",
        name: "1. Giao tiếp, Lắng nghe & Tranh luận",
        category: "GIAO_TIEP_TRANH_LUAN",
        categoryLabel: "Giao tiếp, Lắng nghe & Tranh luận",
        guideline: "Đánh giá kỹ năng diễn đạt logic, lắng nghe tích cực, phong thái giao tiếp học thuật và sự tôn trọng người khác.",
        suggestedQuestions: [
          "Khi trình bày một quan điểm cá nhân trước đám đông hoặc lớp học, con cảm thấy tự tin ở mức nào?",
          "Làm thế nào để con thể hiện sự lắng nghe và tôn trọng ý kiến khác biệt của bạn bè trong thảo luận?",
          "Con đã từng tham gia một buổi tranh biện hoặc thuyết trình chuyên đề nào chưa?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k79_c2",
        name: "2. Tính tự chủ & Kỷ luật tự học",
        category: "TU_CHU_KY_LUAT",
        categoryLabel: "Tính tự chủ & Kỷ luật Tự học",
        guideline: "Đánh giá khả năng tự nghiên cứu, kiểm soát việc sử dụng điện thoại/máy tính, không để phân tâm khi học tập.",
        suggestedQuestions: [
          "Con quản lý việc sử dụng thiết bị điện tử (máy tính, điện thoại) và tự học thế nào để không bị phân tâm?",
          "Khi kết quả học tập chưa như kỳ vọng, con nhìn nhận trách nhiệm của mình ra sao và tìm cách cải thiện thế nào?",
          "Con đã từng tự mình nghiên cứu một chủ đề học tập mà không cần ai giao bài chưa?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k79_c3",
        name: "3. Phương pháp tư duy & Sức bật thử thách",
        category: "TU_DUY_SUC_BAT",
        categoryLabel: "Tư duy & Sức bật trước Thử thách",
        guideline: "Đánh giá khả năng phân tích logic, sự kiên trì, bản lĩnh vượt khó và thái độ học hỏi từ sai lầm (growth mindset).",
        suggestedQuestions: [
          "Khi gặp một đề bài hoặc thử thách học thuật phức tạp, con tiếp cận và bẻ nhỏ vấn đề ra sao?",
          "Áp lực học tập lớn nhất con từng trải qua là gì, và con đã nỗ lực vượt qua như thế nào?",
          "Con nhìn nhận những lời phê bình hoặc điểm số chưa tốt từ thầy cô như một cơ hội hay một gánh nặng?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k79_c4",
        name: "4. Hợp tác, Dự án & Năng lực dẫn dắt",
        category: "HOP_TAC_DAN_DAT",
        categoryLabel: "Hợp tác & Năng lực Dẫn dắt",
        guideline: "Đánh giá tinh thần đồng đội, vai trò điều phối trong các dự án học tập và tinh thần trách nhiệm tập thể.",
        suggestedQuestions: [
          "Trong các dự án học tập hoặc làm việc nhóm, con thường đảm nhận vai trò gì (trưởng nhóm, tìm tài liệu, thuyết trình)?",
          "Khi nhóm xảy ra bất đồng quan điểm, con thường làm gì để cùng nhau hoàn thành nhiệm vụ?",
          "Làm thế nào để con hỗ trợ một thành viên trong nhóm đang gặp khó khăn?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k79_c5",
        name: "5. Sở trường học thuật & Năng khiếu",
        category: "SO_TRUONG_HOC_THUAT",
        categoryLabel: "Sở trường Học thuật & Năng khiếu",
        guideline: "Nhận diện năng lực chuyên biệt (KHTN, KHXH, Tiếng Anh/IELTS, Công nghệ, Nghệ thuật...) để định hướng bồi dưỡng.",
        suggestedQuestions: [
          "Con thấy mình có thế mạnh nổi bật nhất ở lĩnh vực nào (Khoa học tự nhiên, Ngôn ngữ/Tiếng Anh, Nghệ thuật, Tranh biện)?",
          "Con đã đặt mục tiêu gì cho việc học ngoại ngữ và các chứng chỉ quốc tế (như IELTS hay Cambridge)?",
          "Con dự định tham gia CLB hoặc dự án ngoại khóa nào của Sky-Line để phát huy sở trường?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k79_c6",
        name: "6. Cân bằng học tập, Thể chất & Đời sống số",
        category: "CAN_BANG_DOI_SONG_SO",
        categoryLabel: "Cân bằng Thể chất & Đời sống số",
        guideline: "Đánh giá thói quen rèn luyện thể thao, hoạt động giải trí lành mạnh và kỹ năng sử dụng mạng xã hội văn minh.",
        suggestedQuestions: [
          "Mỗi tuần con dành bao nhiêu thời gian cho việc tập luyện thể thao và các hoạt động ngoài trời?",
          "Con có quy tắc riêng nào cho bản thân khi sử dụng mạng xã hội hoặc chơi game không?",
          "Cách con tái tạo năng lượng tích cực sau những giờ học căng thẳng là gì?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k79_c7",
        name: "7. Trí tuệ cảm xúc (EQ) & Mối quan hệ xã hội",
        category: "EQ_QUAN_HE_XA_HOI",
        categoryLabel: "Trí tuệ Cảm xúc & Quan hệ Xã hội",
        guideline: "Đánh giá trí tuệ cảm xúc, sức bật tâm lý và sự ứng xử văn minh trước áp lực đồng trang lứa (peer pressure).",
        suggestedQuestions: [
          "Khi cảm thấy mệt mỏi hoặc có mâu thuẫn với bạn bè, thói quen tích cực nào giúp con lấy lại cân bằng?",
          "Khi bạn bè có những rủ rê hoặc hành vi chưa đúng đắn, con từ chối và giữ lập trường thế nào?",
          "Điều gì giúp con luôn giữ được thái độ lạc quan trước những thử thách mới?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k79_c8",
        name: "8. Định hướng học thuật & Mục tiêu Lớp 10",
        category: "DINH_HUONG_MUC_TIEU_10",
        categoryLabel: "Định hướng Học thuật & Mục tiêu Lớp 10",
        guideline: "Đánh giá mức độ nhận thức về lộ trình thi vào lớp 10, định hướng môn chuyên sâu và mục tiêu cá nhân tại Sky-Line.",
        suggestedQuestions: [
          "Con đã từng nghĩ đến định hướng khối học hoặc tổ hợp môn mà con muốn học chuyên sâu ở cấp THPT chưa?",
          "Mục tiêu GPA và các thành tích học thuật con muốn chinh phục trong năm học này là gì?",
          "Con mong muốn thầy cô và nhà trường Sky-Line hỗ trợ con chuẩn bị hành trang gì tốt nhất cho tương lai?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 7–9 (THCS: Phát triển năng lực & Sở trường)",
      group1_expectations: {
        title: "1. Nguyện vọng & Định hướng học thuật của Gia đình cho giai đoạn THCS",
        hints: [
          "Định hướng trọng tâm cho con (nâng cao GPA, đội tuyển học sinh giỏi, chứng chỉ Tiếng Anh IELTS, chuẩn bị thi vào lớp 10)?",
          "Kỳ vọng của gia đình đối với sự trưởng thành về nhân cách và kỹ năng sống của con?"
        ],
        placeholder: "Ví dụ: Gia đình định hướng con tập trung bồi dưỡng tiếng Anh đạt IELTS 6.0+, rèn luyện tư duy phản biện và khả năng thuyết trình..."
      },
      group2_personality: {
        title: "2. Đặc điểm tâm lý tuổi dậy thì, sở thích & thói quen sinh hoạt",
        hints: [
          "Mức độ cởi mở của con khi trò chuyện với cha mẹ về trường lớp và bạn bè?",
          "Các mối quan tâm đặc biệt, thói quen sử dụng mạng xã hội và khả năng tự kiểm soát của con?"
        ],
        placeholder: "Ví dụ: Con có cá tính mạnh mẽ, ham học hỏi nhưng đôi lúc dễ nóng tính; thích chơi thể thao và tham gia các hoạt động thiện nguyện..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ học thuật & tâm lý từ Nhà trường",
        hints: [
          "Mong muốn nhà trường hỗ trợ con phát triển thêm năng lực nào (lãnh đạo, CLB, tư vấn tâm lý học đường)?",
          "Những điều lưu ý để thầy cô tạo động lực tốt nhất cho con?"
        ],
        placeholder: "Ví dụ: Mong muốn thầy cô khích lệ con tự tin phát biểu, tạo cơ hội tham gia ban tổ chức sự kiện hoặc CLB Tranh biện..."
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp giáo dục giữa Gia đình & Nhà trường",
        hints: [
          "Sự thống nhất giữa gia đình và nhà trường trong việc định hướng giá trị sống và quản lý hành vi.",
          "Cam kết đồng hành cùng nhà trường trong các chương trình trải nghiệm và hướng nghiệp sớm."
        ],
        placeholder: "Ví dụ: Gia đình luôn sẵn sàng lắng nghe và phối hợp cùng GVCN; cam kết tạo môi trường gia đình ấm áp, văn minh để con phát triển..."
      }
    }
  },

  // 5. KHỐI 10–12 (8 CÂU HỎI CHUẨN)
  KHOI_10_12: {
    key: "KHOI_10_12",
    label: "Khối 10–12",
    subLabel: "THPT: Tư duy Phản biện & Định hướng Môn học - Nghề nghiệp (8 Câu hỏi chuẩn)",
    gradeList: ["10", "11", "12", "Khối 10", "Khối 11", "Khối 12"],
    criteria: [
      {
        id: "k1012_c1",
        name: "1. Giao tiếp học thuật & Tư duy phản biện",
        category: "GIAO_TIEP_PHAN_BIEN",
        categoryLabel: "Giao tiếp & Tư duy Phản biện",
        guideline: "Đánh giá năng lực tư duy phản biện, logic lập luận và phong thái giao tiếp học thuật tự tin, văn minh.",
        suggestedQuestions: [
          "Khi đối diện với một vấn đề xã hội hoặc một quan điểm trái ngược với suy nghĩ của con, con tiếp cận và đánh giá như thế nào?",
          "Con trình bày và bảo vệ quan điểm của mình ra sao trên tinh thần tôn trọng sự khác biệt?",
          "Con đã từng tham gia tranh biện hoặc viết bài luận thể hiện quan điểm cá nhân chưa?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 1
      },
      {
        id: "k1012_c2",
        name: "2. Tự chủ học tập & Quản trị mục tiêu SMART",
        category: "TU_HOC_MUC_TIEU_SMART",
        categoryLabel: "Tự học & Quản trị Mục tiêu SMART",
        guideline: "Đánh giá kỹ năng quản trị mục tiêu cá nhân theo chuẩn SMART, phương pháp tự nghiên cứu và tính kiên định.",
        suggestedQuestions: [
          "Mục tiêu học thuật trọng tâm của con trong 3 năm THPT là gì (GPA, IELTS/SAT, nghiên cứu khoa học, học bổng)?",
          "Con xây dựng lộ trình và tự kỷ luật bản thân thế nào để hiện thực hóa mục tiêu đã đặt ra?",
          "Khi kế hoạch cá nhân bị chậm trễ, con khắc phục và lấy lại nhịp độ thế nào?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 2
      },
      {
        id: "k1012_c3",
        name: "3. Định hướng tổ hợp môn học & Khối ngành",
        category: "TO_HOP_MON_KHOI_NGANH",
        categoryLabel: "Định hướng Tổ hợp Môn & Khối ngành",
        guideline: "Đánh giá sự am hiểu về chương trình GDPT mới, mức độ chín chắn trong việc chọn tổ hợp môn và định hướng tương lai.",
        suggestedQuestions: [
          "Con lựa chọn tổ hợp môn học nào (KHTN hay KHXH) và vì sao con chọn định hướng đó?",
          "Con thấy năng lực bản thân phù hợp nhất với nhóm ngành nghề nào trong tương lai?",
          "Con đã tìm hiểu về các phương thức xét tuyển đại học của ngành nghề con quan tâm chưa?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 3
      },
      {
        id: "k1012_c4",
        name: "4. Kế hoạch Đại học, Nghề nghiệp & Du học",
        category: "DAI_HOC_NGHE_NGHIEP_DU_HOC",
        categoryLabel: "Kế hoạch Đại học & Du học",
        guideline: "Khám phá mục tiêu sau tốt nghiệp THPT: Đại học trong nước (Top đầu), Du học học bổng hay Chương trình quốc tế.",
        suggestedQuestions: [
          "Kế hoạch sau khi tốt nghiệp THPT của con là gì (học đại học trong nước, du học hay tham gia chương trình liên kết quốc tế)?",
          "Con đã chuẩn bị những gì cho bộ hồ sơ tuyển sinh đại học / học bổng du học của mình (chứng chỉ, bài luận, hoạt động ngoại khóa)?",
          "Con mong muốn Sky-Line mang đến cho con những cơ hội hướng nghiệp hoặc dự án thực tế nào?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 4
      },
      {
        id: "k1012_c5",
        name: "5. Làm việc dự án, Đổi mới & Kỹ năng lãnh đạo",
        category: "DU_AN_LANH_DAO",
        categoryLabel: "Làm việc Dự án & Lãnh đạo",
        guideline: "Đánh giá kinh nghiệm tổ chức sự kiện, điều phối dự án, tư duy đổi mới sáng tạo và tinh thần trách nhiệm thủ lĩnh.",
        suggestedQuestions: [
          "Con đã từng tham gia tổ chức sự kiện, dự án cộng đồng hay làm trưởng nhóm học tập chưa?",
          "Khi các thành viên trong nhóm gặp khó khăn hoặc thiếu động lực, con giải quyết ra sao?",
          "Theo con, tố chất quan trọng nhất của một người lãnh đạo trẻ là gì?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 5
      },
      {
        id: "k1012_c6",
        name: "6. Ngoại ngữ học thuật & Ứng dụng công nghệ/AI",
        category: "NGOAI_NGU_CONG_NGHE_AI",
        categoryLabel: "Ngoại ngữ & Ứng dụng Công nghệ/AI",
        guideline: "Đánh giá năng lực tiếng Anh học thuật (IELTS/SAT), kỹ năng số và nhận thức sử dụng công nghệ, AI có trách nhiệm.",
        suggestedQuestions: [
          "Trình độ tiếng Anh hiện tại của con ra sao và con sử dụng tiếng Anh như thế nào trong học tập và nghiên cứu?",
          "Con sử dụng các công cụ công nghệ và trí tuệ nhân tạo (AI) như thế nào để phục vụ việc học tập?",
          "Con nhìn nhận thế nào về đạo đức học thuật và tính trung thực khi sử dụng công nghệ số?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 6
      },
      {
        id: "k1012_c7",
        name: "7. Quản trị căng thẳng & Bản lĩnh tâm lý",
        category: "QUAN_TRI_CANG_THANG",
        categoryLabel: "Quản trị Căng thẳng & Bản lĩnh",
        guideline: "Đánh giá khả năng quản lý áp lực học tập THPT, sức bật tâm lý và sự lành mạnh trong các mối quan hệ xã hội.",
        suggestedQuestions: [
          "Trước áp lực học tập và các kỳ thi quan trọng ở bậc THPT, con có phương pháp giải tỏa căng thẳng thế nào?",
          "Khi đứng trước một quyết định khó khăn, con thường dựa vào đâu để đưa ra lựa chọn?",
          "Ai là người con tin tưởng nhất để chia sẻ khi đối diện với những biến cố trong cuộc sống?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 7
      },
      {
        id: "k1012_c8",
        name: "8. Động lực nội tại & Trách nhiệm cộng đồng",
        category: "DONG_LUC_CONG_DONG",
        categoryLabel: "Động lực Nội tại & Trách nhiệm Cộng đồng",
        guideline: "Nhận diện giá trị sống cốt lõi, động lực học tập suốt đời và tinh thần đóng góp, phụng sự cộng đồng của học sinh.",
        suggestedQuestions: [
          "Động lực nội tại lớn nhất thúc đẩy con nỗ lực và học hỏi mỗi ngày là gì?",
          "Giá trị sống hoặc phẩm chất nào mà con trân trọng nhất và muốn trau dồi trong những năm tháng tại Sky-Line?",
          "Con mong muốn tạo ra những tác động tích cực nào cho tập thể và cộng đồng xung quanh con?"
        ],
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: 8
      }
    ],
    parentPrompts: {
      groupLabel: "Khối 10–12 (THPT: Định hướng nghề nghiệp & Du học)",
      group1_expectations: {
        title: "1. Nguyện vọng & Định hướng Tương lai của Gia đình cho học sinh",
        hints: [
          "Định hướng sau tốt nghiệp THPT: Đại học trong nước (Top đầu), Du học học bổng hay Chương trình Quốc tế?",
          "Kỳ vọng về chứng chỉ quốc tế (IELTS, SAT, AP) và định hướng ngành nghề cụ thể?"
        ],
        placeholder: "Ví dụ: Gia đình định hướng con theo ngành Công nghệ Thông tin, đặt mục tiêu đạt IELTS 7.0+ và xin học bổng du học..."
      },
      group2_personality: {
        title: "2. Năng lực tự lập, sở trường và đam mê của học sinh",
        hints: [
          "Mức độ tự chủ trong học tập và sinh hoạt cá nhân của con?",
          "Lĩnh vực chuyên môn, năng khiếu hoặc hoạt động xã hội con đặc biệt đam mê và dành nhiều thời gian?"
        ],
        placeholder: "Ví dụ: Con có tính tự lập cao, có tư duy phản biện tốt, yêu thích nghiên cứu khoa học và tham gia các dự án cộng đồng..."
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ chuyên sâu & Hướng nghiệp từ Nhà trường",
        hints: [
          "Gia đình đề xuất nhà trường tư vấn lộ trình học thuật, chọn môn thi, chuẩn bị hồ sơ du học như thế nào?",
          "Nhu cầu tham gia các chương trình thực tập hướng nghiệp, ngày hội du học hoặc kết nối chuyên gia?"
        ],
        placeholder: "Ví dụ: Mong muốn Ban Cố vấn hỗ trợ tư vấn chọn tổ hợp môn thi đại học từ lớp 10, kết nối các hội thảo du học và hướng dẫn viết luận..."
      },
      group4_cooperation: {
        title: "4. Cơ chế đồng hành chiến lược giữa Gia đình & Nhà trường",
        hints: [
          "Sự đồng thuận giữa gia đình và học sinh về định hướng tương lai.",
          "Cam kết đồng hành cùng nhà trường trong việc tạo điều kiện cho con tham gia các kỳ thi quốc tế và hoạt động ngoại khóa."
        ],
        placeholder: "Ví dụ: Gia đình tôn trọng và đồng hành cùng nguyện vọng nghề nghiệp của con; cam kết phối hợp chặt chẽ với nhà trường..."
      }
    }
  }
};

/**
 * Lấy cấu hình nhóm khối dựa trên khối lớp (grade) của học sinh
 */
export function getGradeGroupKey(grade?: string | number | null): GradeGroupKey {
  if (!grade) return "KHOI_1";
  const str = String(grade).trim().toLowerCase();

  // Khối 1
  if (str === "1" || str.includes("khối 1") || str.includes("lớp 1") || str === "k1") {
    return "KHOI_1";
  }

  // Khối 2 - 5
  if (
    str === "2" || str === "3" || str === "4" || str === "5" ||
    str.includes("khối 2") || str.includes("khối 3") || str.includes("khối 4") || str.includes("khối 5") ||
    str.includes("lớp 2") || str.includes("lớp 3") || str.includes("lớp 4") || str.includes("lớp 5") ||
    str === "k2" || str === "k3" || str === "k4" || str === "k5"
  ) {
    return "KHOI_2_5";
  }

  // Khối 6
  if (str === "6" || str.includes("khối 6") || str.includes("lớp 6") || str === "k6") {
    return "KHOI_6";
  }

  // Khối 7, 8, 9
  if (str.includes("7") || str.includes("8") || str.includes("9")) {
    return "KHOI_7_9";
  }

  // Khối 10, 11, 12
  if (str.includes("10") || str.includes("11") || str.includes("12")) {
    return "KHOI_10_12";
  }

  return "KHOI_1";
}

/**
 * Trả về toàn bộ cấu hình nhóm khối của học sinh
 */
export function getOrientationGradeGroupConfig(grade?: string | number | null): OrientationGradeGroupConfig {
  const key = getGradeGroupKey(grade);
  return ORIENTATION_GRADE_GROUPS[key] || ORIENTATION_GRADE_GROUPS.KHOI_1;
}

/**
 * Bảng 04 mức đánh giá chuẩn hóa cho phiếu định hướng
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
    label: "Tự tin / Tích cực",
    subText: "Thể hiện vượt trội, chủ động",
    colorClass: "teal",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
    bgClass: "bg-teal-50/70",
    borderClass: "border-teal-400",
    textClass: "text-teal-800"
  },
  NORMAL: {
    code: "NORMAL",
    label: "Bình thường / Ổn định",
    subText: "Đạt chuẩn phát triển lứa tuổi",
    colorClass: "blue",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    bgClass: "bg-blue-50/70",
    borderClass: "border-blue-400",
    textClass: "text-blue-800"
  },
  NEED_SUPPORT: {
    code: "NEED_SUPPORT",
    label: "Cần hỗ trợ ban đầu",
    subText: "Cần GVCN/Bộ môn đồng hành",
    colorClass: "amber",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    bgClass: "bg-amber-50/70",
    borderClass: "border-amber-400",
    textClass: "text-amber-800"
  },
  SPECIAL_ATTENTION: {
    code: "SPECIAL_ATTENTION",
    label: "Lưu ý thêm",
    subText: "Cần theo dõi sâu / xác minh thêm",
    colorClass: "rose",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
    bgClass: "bg-rose-50/70",
    borderClass: "border-rose-400",
    textClass: "text-rose-800"
  }
};

/**
 * Kiểm tra xem mức đánh giá này có bắt buộc nhập nhận xét không
 */
export function isCommentMandatory(rating: RatingCode): boolean {
  return rating === "NEED_SUPPORT" || rating === "SPECIAL_ATTENTION";
}
