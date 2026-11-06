import {
  TC02SZoneDefinition,
  TC02SStageDefinition,
  TC02S_ZONES,
  TC02S_STAGES,
  OfficialCriterionDef,
  StageInteractiveConfig
} from "./tc02s-catalog";

export interface GradeCurriculumBundle {
  grade: string;
  curriculumCode: string;
  curriculumTitle: string;
  versionCode: string;
  zones: TC02SZoneDefinition[];
  stages: TC02SStageDefinition[];
}

/**
 * Helper builders to create rich, pedagogically accurate interactive mechanics
 * tailored to each lesson of Grades 1, 3, 4, and 5 while keeping 100% compatibility
 * with StageGamePlayer and validateStageSubmission.
 */
function buildBackpackInteractive(params: {
  evaluationMode?: "AUTO_OBJECTIVE" | "HYBRID_TEACHER";
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  mode?: "NEED_VS_WANT" | "MONEY_VS_NO_MONEY";
  context1Title: string;
  context1Subtitle: string;
  groupAName: string;
  groupBName: string;
  items1: Array<{
    id: string;
    name: string;
    emoji: string;
    correctGroup: "GROUP_A" | "GROUP_B";
    contextReason: string;
  }>;
  context2Title?: string;
  context2Subtitle?: string;
  items2?: Array<{
    id: string;
    name: string;
    emoji: string;
    correctGroup: "GROUP_A" | "GROUP_B";
    contextReason: string;
  }>;
  questionPrompt: string;
  correctOptionText: string;
  correctFeedback: string;
  wrongOptionText: string;
  wrongFeedback: string;
}): StageInteractiveConfig {
  const contexts: NonNullable<StageInteractiveConfig["backpackConfig"]>["contexts"] = [
    {
      id: "ctx_main",
      title: params.context1Title,
      subtitle: params.context1Subtitle,
      badge: "Bối cảnh 1",
      targetGroupAName: params.groupAName,
      targetGroupBName: params.groupBName,
      items: params.items1
    }
  ];

  if (params.context2Title && params.items2 && params.items2.length > 0) {
    contexts.push({
      id: "ctx_second",
      title: params.context2Title,
      subtitle: params.context2Subtitle || "Phân tích và sắp xếp hợp lý theo tình huống",
      badge: "Bối cảnh 2",
      targetGroupAName: params.groupAName,
      targetGroupBName: params.groupBName,
      items: params.items2
    });
  }

  return {
    mechanic: "BACKPACK_BUILDER",
    evaluationMode: params.evaluationMode || "AUTO_OBJECTIVE",
    storyBrief: params.storyBrief,
    worldLocationName: params.worldLocationName,
    mascotGuideTip: params.mascotGuideTip,
    practicalPrompt: params.practicalPrompt,
    parentCompanionTip: params.parentCompanionTip,
    backpackConfig: {
      mode: params.mode || "NEED_VS_WANT",
      contexts,
      reasonQuestion: {
        prompt: params.questionPrompt,
        options: [
          {
            id: "opt_optimal",
            text: params.correctOptionText,
            isOptimal: true,
            feedback: params.correctFeedback
          },
          {
            id: "opt_suboptimal",
            text: params.wrongOptionText,
            isOptimal: false,
            feedback: params.wrongFeedback
          }
        ]
      }
    }
  };
}

function buildShopInteractive(params: {
  evaluationMode?: "AUTO_OBJECTIVE" | "HYBRID_TEACHER";
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  shopName: string;
  walletBudget: number;
  minRequiredItems: number;
  requiredNeedTags: string[];
  requireQualityCheck?: boolean;
  items: NonNullable<StageInteractiveConfig["shopConfig"]>["items"];
  changePrompt: string;
  itemTotalExample: number;
  coinGivenExample: number;
  correctChange: number;
  shopkeeperGivenChange: number;
  politeCorrectText: string;
  politeCorrectFeedback: string;
  politeWrongText: string;
  politeWrongFeedback: string;
}): StageInteractiveConfig {
  return {
    mechanic: "BIRD_SHOP",
    evaluationMode: params.evaluationMode || "AUTO_OBJECTIVE",
    storyBrief: params.storyBrief,
    worldLocationName: params.worldLocationName,
    mascotGuideTip: params.mascotGuideTip,
    practicalPrompt: params.practicalPrompt,
    parentCompanionTip: params.parentCompanionTip,
    shopConfig: {
      shopName: params.shopName,
      walletBudget: params.walletBudget,
      minRequiredItems: params.minRequiredItems,
      requiredNeedTags: params.requiredNeedTags,
      requireQualityCheck: params.requireQualityCheck,
      items: params.items,
      changeScenario: {
        prompt: params.changePrompt,
        itemTotalExample: params.itemTotalExample,
        coinGivenExample: params.coinGivenExample,
        correctChange: params.correctChange,
        shopkeeperGivenChange: params.shopkeeperGivenChange,
        politeResponses: [
          {
            id: "polite_right",
            text: params.politeCorrectText,
            isCorrect: true,
            feedback: params.politeCorrectFeedback
          },
          {
            id: "polite_wrong",
            text: params.politeWrongText,
            isCorrect: false,
            feedback: params.politeWrongFeedback
          }
        ]
      }
    }
  };
}

function buildNestInteractive(params: {
  evaluationMode?: "AUTO_OBJECTIVE" | "HYBRID_TEACHER";
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  mode: "ALLOCATE_JARS" | "SAVINGS_PIGGY_PLAN" | "HAPPY_SHARING";
  totalCoins: number;
  jars: NonNullable<StageInteractiveConfig["nestConfig"]>["jars"];
  goals?: NonNullable<StageInteractiveConfig["nestConfig"]>["goals"];
  twistPrompt: string;
  twistCorrectText: string;
  twistCorrectFeedback: string;
  twistWrongText: string;
  twistWrongFeedback: string;
}): StageInteractiveConfig {
  return {
    mechanic: "DREAM_NEST",
    evaluationMode: params.evaluationMode || "AUTO_OBJECTIVE",
    storyBrief: params.storyBrief,
    worldLocationName: params.worldLocationName,
    mascotGuideTip: params.mascotGuideTip,
    practicalPrompt: params.practicalPrompt,
    parentCompanionTip: params.parentCompanionTip,
    nestConfig: {
      mode: params.mode,
      totalCoins: params.totalCoins,
      jars: params.jars,
      goals: params.goals,
      unexpectedTwist: {
        prompt: params.twistPrompt,
        options: [
          {
            id: "twist_right",
            text: params.twistCorrectText,
            isCorrect: true,
            feedback: params.twistCorrectFeedback
          },
          {
            id: "twist_wrong",
            text: params.twistWrongText,
            isCorrect: false,
            feedback: params.twistWrongFeedback
          }
        ]
      }
    }
  };
}

function buildVillageInteractive(params: {
  evaluationMode?: "AUTO_OBJECTIVE" | "HYBRID_TEACHER";
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  villageTheme: "ENERGY_WATER_SAVER" | "CAREER_VALUE_TOWN" | "ECO_REUSE_WORKSHOP";
  hotspots: NonNullable<StageInteractiveConfig["villageConfig"]>["hotspots"];
  reflectionPrompt: string;
  reflectionCorrectText: string;
  reflectionCorrectFeedback: string;
  reflectionWrongText: string;
  reflectionWrongFeedback: string;
}): StageInteractiveConfig {
  return {
    mechanic: "VILLAGE_RESCUE",
    evaluationMode: params.evaluationMode || "AUTO_OBJECTIVE",
    storyBrief: params.storyBrief,
    worldLocationName: params.worldLocationName,
    mascotGuideTip: params.mascotGuideTip,
    practicalPrompt: params.practicalPrompt,
    parentCompanionTip: params.parentCompanionTip,
    villageConfig: {
      villageTheme: params.villageTheme,
      hotspots: params.hotspots,
      reflectionQuestion: {
        prompt: params.reflectionPrompt,
        options: [
          {
            id: "ref_right",
            text: params.reflectionCorrectText,
            isCorrect: true,
            feedback: params.reflectionCorrectFeedback
          },
          {
            id: "ref_wrong",
            text: params.reflectionWrongText,
            isCorrect: false,
            feedback: params.reflectionWrongFeedback
          }
        ]
      }
    }
  };
}

function buildDiaryAdInteractive(params: {
  evaluationMode?: "AUTO_OBJECTIVE" | "HYBRID_TEACHER";
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  mode: "COIN_DIARY" | "AD_DETECTIVE" | "MASTER_FINANCE_CAPSTONE";
  startingCoins: number;
  diaryEntries?: NonNullable<StageInteractiveConfig["diaryAdConfig"]>["diaryEntries"];
  adBillboards?: NonNullable<StageInteractiveConfig["diaryAdConfig"]>["adBillboards"];
  capstoneChallenge?: NonNullable<StageInteractiveConfig["diaryAdConfig"]>["capstoneChallenge"];
}): StageInteractiveConfig {
  return {
    mechanic: "COIN_DIARY_AD_STREET",
    evaluationMode: params.evaluationMode || "AUTO_OBJECTIVE",
    storyBrief: params.storyBrief,
    worldLocationName: params.worldLocationName,
    mascotGuideTip: params.mascotGuideTip,
    practicalPrompt: params.practicalPrompt,
    parentCompanionTip: params.parentCompanionTip,
    diaryAdConfig: {
      mode: params.mode,
      startingCoins: params.startingCoins,
      diaryEntries: params.diaryEntries,
      adBillboards: params.adBillboards,
      capstoneChallenge: params.capstoneChallenge
    }
  };
}

// ============================================================================
// KHỐI 3 – HỆ S (MÃ TC03S): 5 CHỦ ĐỀ / VÙNG, 15 CHẶNG, 45 TIÊU CHUẨN
// ============================================================================
export const TC03S_ZONES: TC02SZoneDefinition[] = [
  {
    zoneIndex: 1,
    topicId: "top_fin_g3_1",
    topicCode: "TC03S.01",
    officialTopicName: "Chủ đề 1. Em làm quen với tiền",
    creativeZoneName: "Vùng 1: Bến Cảng Đồng Tiền Việt",
    themeColor: "#0284C7",
    accentColor: "#38BDF8",
    landscapeDescription: "Bến cảng tấp nập nơi chim Sky-Line khám phá vai trò của đồng tiền, các mệnh giá VNĐ và giá trị sức lao động.",
    badgeCode: "BADGE_TC03S_Z1",
    badgeName: "Thuyền Trưởng Mệnh Giá Khối 3",
    stagePeriods: [1, 2, 3]
  },
  {
    zoneIndex: 2,
    topicId: "top_fin_g3_2",
    topicCode: "TC03S.02",
    officialTopicName: "Chủ đề 2: Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Thị Trấn Chi Tiêu Thông Minh",
    themeColor: "#0D9488",
    accentColor: "#2DD4BF",
    landscapeDescription: "Thị trấn nhộn nhịp với các thử thách phân biệt nhu cầu – mong muốn, so sánh giá cả và lập kế hoạch chi tiêu nhỏ.",
    badgeCode: "BADGE_TC03S_Z2",
    badgeName: "Chuyên Gia Kế Hoạch Chi Tiêu Nhỏ",
    stagePeriods: [4, 5, 6]
  },
  {
    zoneIndex: 3,
    topicId: "top_fin_g3_3",
    topicCode: "TC03S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm hôm nay – Tương lai ngày mai",
    creativeZoneName: "Vùng 3: Đồi Gió Tương Lai Xanh",
    themeColor: "#16A34A",
    accentColor: "#4ADE80",
    landscapeDescription: "Ngọn đồi xanh mát nơi học sinh xây dựng mục tiêu tiết kiệm, rèn thói quen tiết kiệm điện, nước, đồ dùng và tiền bạc.",
    badgeCode: "BADGE_TC03S_Z3",
    badgeName: "Kiến Trúc Sư Tiết Kiệm Khối 3",
    stagePeriods: [7, 8, 9]
  },
  {
    zoneIndex: 4,
    topicId: "top_fin_g3_4",
    topicCode: "TC03S.04",
    officialTopicName: "Chủ đề 4. Quản lý tiền của em",
    creativeZoneName: "Vùng 4: Trạm Sổ Tay Quản Lý",
    themeColor: "#7C3AED",
    accentColor: "#A78BFA",
    landscapeDescription: "Trạm quan sát nơi các nhà thám hiểm ghi chép sổ thu – chi, quản lý tiền tiêu vặt và giải quyết tình huống tài chính.",
    badgeCode: "BADGE_TC03S_Z4",
    badgeName: "Thủ Quỹ Nhí Thông Thái Khối 3",
    stagePeriods: [10, 11, 12]
  },
  {
    zoneIndex: 5,
    topicId: "top_fin_g3_5",
    topicCode: "TC03S.05",
    officialTopicName: "Chủ đề 5. Sử dụng tiền có trách nhiệm",
    creativeZoneName: "Vùng 5: Ngọn Hải Đăng Trách Nhiệm",
    themeColor: "#EA580C",
    accentColor: "#FB923C",
    landscapeDescription: "Ngọn hải đăng tỏa sáng lòng nhân ái, bảo quản tài sản cá nhân an toàn và tổng kết dự án Nhà quản lý tài chính nhỏ tuổi.",
    badgeCode: "BADGE_TC03S_Z5",
    badgeName: "Nhà Quản Lý Tài Chính Nhỏ Tuổi Khối 3",
    stagePeriods: [13, 14, 15]
  }
];

export const TC03S_STAGES: TC02SStageDefinition[] = [
  {
    periodIndex: 1,
    lessonId: "les_fin_g3_p01",
    lessonCode: "TC03S.01.0001",
    lessonName: "Tiền dùng để làm gì?",
    topicId: "top_fin_g3_1",
    topicCode: "TC03S.01",
    officialTopicName: "Chủ đề 1. Em làm quen với tiền",
    creativeZoneName: "Vùng 1: Bến Cảng Đồng Tiền Việt",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 10, y: 75 },
    criteria: [
      { code: "TC03S.01.0001.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được vai trò của tiền trong cuộc sống hằng ngày." },
      { code: "TC03S.01.0001.02", level: "Mức 1", competencyGroup: "Hiểu", description: "Kể được một số việc cần dùng tiền và không cần dùng tiền." },
      { code: "TC03S.01.0001.03", level: "Mức 2", competencyGroup: "Vận dụng", description: "Hình thành thái độ trân trọng giá trị của đồng tiền." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Chào mừng em đến Bến Cảng Đồng Tiền Việt! Hãy cùng chim Sky-Line phân loại các hoạt động hằng ngày xem việc nào cần dùng tiền và việc nào trao gửi yêu thương không cần dùng tiền nhé!",
      worldLocationName: "Cầu Cảng Trao Đổi",
      mascotGuideTip: "Những món hàng ở hiệu sách, siêu thị cần trả tiền; còn nụ cười, lời cảm ơn và giúp đỡ ông bà là món quà vô giá không cần dùng tiền!",
      parentCompanionTip: "Trò chuyện cùng con về những niềm vui giản dị trong gia đình không cần mua bằng tiền.",
      mode: "MONEY_VS_NO_MONEY",
      context1Title: "Hoạt động cuối tuần của em",
      context1Subtitle: "Phân loại các hoạt động Cần dùng tiền và Không cần dùng tiền",
      groupAName: "Hoạt động Cần dùng tiền 🪙",
      groupBName: "Hoạt động Không cần dùng tiền 💚",
      items1: [
        { id: "g3_s1_1", name: "Mua sách giáo khoa và hộp bút màu", emoji: "📚", correctGroup: "GROUP_A", contextReason: "Mua đồ dùng học tập tại nhà sách cần thanh toán bằng tiền." },
        { id: "g3_s1_2", name: "Mua vé xe buýt cùng bố mẹ đi bảo tàng", emoji: "🚌", correctGroup: "GROUP_A", contextReason: "Sử dụng dịch vụ giao thông công cộng cần mua vé bằng tiền." },
        { id: "g3_s1_3", name: "Đấm lưng và kể chuyện vui cho ông bà", emoji: "👵", correctGroup: "GROUP_B", contextReason: "Tình cảm yêu thương gia đình không cần dùng tiền mua." },
        { id: "g3_s1_4", name: "Tự giác gấp chăn màn và dọn góc học tập", emoji: "🛏️", correctGroup: "GROUP_B", contextReason: "Sự chăm chỉ, tự giác của em không tốn tiền mà mang lại niềm vui lớn." }
      ],
      questionPrompt: "Vì sao chúng ta cần trân trọng đồng tiền nhưng cũng hiểu rằng tiền không mua được tất cả mọi thứ?",
      correctOptionText: "Vì tiền giúp trao đổi hàng hóa, dịch vụ thiết yếu, nhưng tình yêu thương, sự tử tế và lòng biết ơn chỉ có được từ trái tim chân thành.",
      correctFeedback: "Chính xác! Em đã hiểu rất sâu sắc vai trò của đồng tiền trong cuộc sống.",
      wrongOptionText: "Vì có nhiều tiền thì không cần giúp đỡ hay nói lời cảm ơn ai nữa.",
      wrongFeedback: "Hãy nhớ rằng tình bạn và lòng hiếu thảo là điều quý giá không tiền nào mua được nhé!"
    })
  },
  {
    periodIndex: 2,
    lessonId: "les_fin_g3_p02",
    lessonCode: "TC03S.01.0002",
    lessonName: "Nhận biết các mệnh giá tiền Việt Nam",
    topicId: "top_fin_g3_1",
    topicCode: "TC03S.01",
    officialTopicName: "Chủ đề 1. Em làm quen với tiền",
    creativeZoneName: "Vùng 1: Bến Cảng Đồng Tiền Việt",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 18, y: 65 },
    criteria: [
      { code: "TC03S.01.0001.04", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được một số mệnh giá tiền Việt Nam thông dụng." },
      { code: "TC03S.01.0001.05", level: "Mức 2", competencyGroup: "Vận dụng", description: "Phân biệt được giá trị của các tờ tiền." },
      { code: "TC03S.01.0001.06", level: "Mức 3", competencyGroup: "Vận dụng", description: "Sử dụng tiền phù hợp trong các tình huống mua bán đơn giản." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Tại Quầy Văn Phòng Phẩm Bến Cảng, các mặt hàng được niêm yết theo đơn vị nghìn đồng (VNĐ). Em hãy chọn mua đồ dùng học tập phù hợp với tờ tiền 50 nghìn đồng trong ví và kiểm tra tiền thừa nhé!",
      worldLocationName: "Quầy Văn Phòng Phẩm Mệnh Giá Việt",
      mascotGuideTip: "Đơn vị tính trong quầy là nghìn đồng (ví dụ: 15 tương ứng 15.000 đồng). Em hãy tính tổng tiền và tiền trả lại thật chuẩn nhé!",
      parentCompanionTip: "Cho con quan sát màu sắc và con số trên các tờ tiền polymer 10.000đ, 20.000đ, 50.000đ khi đi siêu thị.",
      shopName: "Quầy Học Tập Bến Cảng (Đơn vị: nghìn đồng)",
      walletBudget: 50,
      minRequiredItems: 2,
      requiredNeedTags: ["STUDY"],
      items: [
        { id: "g3_s2_notebook", name: "Quyển vở ô li dày (15 nghìn)", icon: "📓", price: 15, needTag: "STUDY", qualityLabel: "Giấy chống lóa", isHighQuality: true, description: "Cần thiết cho năm học lớp 3" },
        { id: "g3_s2_ruler", name: "Bộ thước kẻ & ê-ke (20 nghìn)", icon: "📐", price: 20, needTag: "STUDY", qualityLabel: "Nhựa dẻo bền", isHighQuality: true, description: "Phục vụ môn Toán lớp 3" },
        { id: "g3_s2_eraser", name: "Cục tẩy bút chì (5 nghìn)", icon: "🧼", price: 5, needTag: "STUDY", qualityLabel: "Tẩy sạch", isHighQuality: true, description: "Đồ dùng học tập cơ bản" },
        { id: "g3_s2_toy", name: "Mô hình siêu xe đắt tiền (45 nghìn)", icon: "🏎️", price: 45, needTag: "TOY_WANT", qualityLabel: "Đồ chơi giải trí", isHighQuality: false, description: "Chưa cần thiết khi đang mua đồ học tập" }
      ],
      changePrompt: "Tình huống kiểm tra mệnh giá: Nếu em mua đơn hàng hết 35 (tức 35.000đ) và đưa tờ 50 (50.000đ), cô thu ngân đưa nhầm cho em tờ 10 (10.000đ). Em ứng xử thế nào?",
      itemTotalExample: 35,
      coinGivenExample: 50,
      correctChange: 15,
      shopkeeperGivenChange: 10,
      politeCorrectText: "Lễ phép thưa: 'Thưa cô, đơn hàng 35.000đ em đưa tờ 50.000đ nên tiền thừa là 15.000đ ạ, cô kiểm tra giúp em thêm tờ 5.000đ nữa ạ!'",
      politeCorrectFeedback: "Tuyệt vời! Em vừa tính đúng mệnh giá tiền Việt Nam (50 - 35 = 15) vừa giao tiếp rất lễ phép!",
      politeWrongText: "Cầm luôn tờ 10.000đ đi về vì ngại không dám nói.",
      politeWrongFeedback: "Em hãy tự tin và lịch sự nhờ cô thu ngân kiểm tra lại tiền trả lại ngay tại quầy nhé!"
    })
  },
  {
    periodIndex: 3,
    lessonId: "les_fin_g3_p03",
    lessonCode: "TC03S.01.0003",
    lessonName: "Đồng tiền từ đâu mà có?",
    topicId: "top_fin_g3_1",
    topicCode: "TC03S.01",
    officialTopicName: "Chủ đề 1. Em làm quen với tiền",
    creativeZoneName: "Vùng 1: Bến Cảng Đồng Tiền Việt",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 25, y: 74 },
    criteria: [
      { code: "TC03S.01.0001.07", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết tiền là thành quả của lao động." },
      { code: "TC03S.01.0001.08", level: "Mức 2", competencyGroup: "Biết", description: "Nhận thức được sự vất vả của người lao động khi kiếm tiền." },
      { code: "TC03S.01.0001.09", level: "Mức 2", competencyGroup: "Biết", description: "Hình thành ý thức quý trọng tiền và tránh lãng phí." }
    ],
    interactive: buildVillageInteractive({
      storyBrief: "Hãy cùng chim Sky-Line ghé thăm Làng Nghề Lao Động Chăm Chỉ để tìm hiểu vì sao mỗi đồng tiền đều thấm đượm mồ hôi, công sức và trí tuệ của người lao động nhé!",
      worldLocationName: "Làng Nghề Lao Động Chăm Chỉ",
      mascotGuideTip: "Khi thấu hiểu sự vất vả của bố mẹ và người lao động, chúng mình sẽ biết giữ gìn đồ dùng và không đòi mua những thứ lãng phí!",
      parentCompanionTip: "Chia sẻ với con về công việc hằng ngày của bố mẹ và niềm vui khi tạo ra giá trị có ích cho xã hội.",
      villageTheme: "CAREER_VALUE_TOWN",
      hotspots: [
        {
          id: "g3_s3_h1",
          title: "Cánh đồng lúa của bác nông dân",
          icon: "🌾",
          problemState: "Một số bạn nhỏ bỏ thừa cơm trong khay ăn trưa ở trường.",
          restoredState: "Các bạn lấy lượng cơm vừa đủ và ăn hết suất vì trân trọng công sức bác nông dân và tiền của bố mẹ.",
          correctActionId: "act_respect_food",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_respect_food", label: "Lấy thức ăn vừa đủ và ăn hết suất, không bỏ mứa lãng phí", isCorrect: true, feedback: "Đúng rồi! Trân trọng hạt gạo và bữa ăn chính là trân trọng sức lao động và đồng tiền của gia đình." },
            { id: "act_waste_food", label: "Lấy thật nhiều rồi bỏ đi vì nghĩ bố mẹ đã đóng tiền rồi", isCorrect: false, feedback: "Bỏ thừa thức ăn vừa gây lãng phí tiền bạc vừa phụ công sức người làm ra hạt gạo." }
          ]
        },
        {
          id: "g3_s3_h2",
          title: "Xưởng thiết kế & văn phòng của bố mẹ",
          icon: "💼",
          problemState: "Bạn nhỏ đòi mua đồ chơi mới dù đồ chơi ở nhà vẫn còn rất tốt.",
          restoredState: "Bạn nhỏ giữ gìn đồ chơi hiện có và chỉ đề xuất mua món thực sự cần thiết cho việc học.",
          correctActionId: "act_value_labor",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_value_labor", label: "Giữ gìn đồ dùng cẩn thận để bố mẹ đỡ vất vả chi tiêu", isCorrect: true, feedback: "Tuyệt vời! Đó là cách thể hiện lòng hiếu thảo thiết thực nhất." },
            { id: "act_demand_toy", label: "Khóc nhè bắt bố mẹ mua bằng được", isCorrect: false, feedback: "Hãy thông cảm với sự vất vả lao động của bố mẹ nhé!" }
          ]
        },
        {
          id: "g3_s3_h3",
          title: "Góc việc làm vừa sức của học sinh lớp 3",
          icon: "🧹",
          problemState: "Chưa biết làm thế nào để phụ giúp gia đình tiết kiệm chi phí.",
          restoredState: "Tự giác quét nhà, gấp quần áo và bọc sách vở sạch đẹp để dùng bền lâu.",
          correctActionId: "act_help_home",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_help_home", label: "Tự giác làm việc nhà vừa sức và bảo quản sách vở, quần áo bền đẹp", isCorrect: true, feedback: "Chính xác! Việc làm vừa sức của em tạo nên giá trị lớn cho gia đình." },
            { id: "act_do_nothing", label: "Đợi lớn hẳn mới làm việc giúp bố mẹ", isCorrect: false, feedback: "Ngay từ lớp 3 em đã có thể phụ giúp nhiều việc vừa sức rồi!" }
          ]
        }
      ],
      reflectionPrompt: "Đồng tiền chân chính được tạo ra từ đâu?",
      reflectionCorrectText: "Từ sức lao động, trí tuệ và sự cống hiến tạo ra sản phẩm, dịch vụ có ích cho mọi người.",
      reflectionCorrectFeedback: "Hoàn toàn chính xác! Thấu hiểu điều này giúp em luôn quý trọng từng đồng tiền.",
      reflectionWrongText: "Tự nhiên có sẵn trong máy rút tiền mà không cần ai làm việc.",
      reflectionWrongFeedback: "Tiền trong tài khoản hay máy ATM đều do bố mẹ làm việc chăm chỉ tích lũy mà có đấy!"
    })
  },
  {
    periodIndex: 4,
    lessonId: "les_fin_g3_p04",
    lessonCode: "TC03S.02.0001",
    lessonName: "Nhu cầu và mong muốn",
    topicId: "top_fin_g3_2",
    topicCode: "TC03S.02",
    officialTopicName: "Chủ đề 2: Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Thị Trấn Chi Tiêu Thông Minh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 34, y: 60 },
    criteria: [
      { code: "TC03S.01.0001.10", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được nhu cầu thiết yếu và mong muốn cá nhân." },
      { code: "TC03S.01.0001.11", level: "Mức 2", competencyGroup: "Biết", description: "Biết ưu tiên những khoản chi cần thiết." },
      { code: "TC03S.01.0001.12", level: "Mức 2", competencyGroup: "Biết", description: "Hình thành thói quen suy nghĩ trước khi chi tiêu." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Trước khi vào Thị Trấn Chi Tiêu Thông Minh, em hãy giúp chim Sky-Line phân loại các khoản chi trong tuần thành Nhu cầu thiết yếu (ưu tiên trước) và Mong muốn cá nhân (cân nhắc sau) nhé!",
      worldLocationName: "Trạm Phân Loại Ưu Tiên",
      mascotGuideTip: "Nhu cầu thiết yếu phục vụ trực tiếp cho sức khỏe, học tập và an toàn; mong muốn là sở thích có thể trì hoãn khi ngân sách có hạn.",
      parentCompanionTip: "Hướng dẫn con tự đặt câu hỏi 'Mình cần món này hay chỉ đang thích nó?' trước khi bỏ hàng vào xe đẩy.",
      mode: "NEED_VS_WANT",
      context1Title: "Chuẩn bị cho tuần học mới & giờ học Thể dục",
      context1Subtitle: "Xếp các món đồ vào đúng nhóm Nhu cầu thiết yếu hoặc Mong muốn",
      groupAName: "Nhu cầu thiết yếu (CẦN) 🎯",
      groupBName: "Mong muốn cá nhân (MUỐN) 🎈",
      items1: [
        { id: "g3_s4_shoes", name: "Đôi giày thể thao vừa chân thay đôi cũ đã chật", emoji: "👟", correctGroup: "GROUP_A", contextReason: "Cần thiết để bảo vệ bàn chân và học giờ Thể dục an toàn." },
        { id: "g3_s4_milk", name: "Sữa tươi và bữa sáng dinh dưỡng", emoji: "🥛", correctGroup: "GROUP_A", contextReason: "Cung cấp năng lượng thiết yếu cho cơ thể và trí não." },
        { id: "g3_s4_stickers", name: "Bộ 50 hình dán lấp lánh trang trí", emoji: "✨", correctGroup: "GROUP_B", contextReason: "Chỉ là sở thích trang trí thêm, không bắt buộc phải mua ngay." },
        { id: "g3_s4_keychain", name: "Móc khóa thú bông phát nhạc", emoji: "🧸", correctGroup: "GROUP_B", contextReason: "Là mong muốn giải trí cá nhân." }
      ],
      questionPrompt: "Khi số tiền hiện có chỉ đủ mua một nửa danh sách, nguyên tắc chi tiêu thông minh là gì?",
      correctOptionText: "Ưu tiên chi cho các nhu cầu thiết yếu trước; những mong muốn cá nhân có thể gác lại hoặc tiết kiệm dần.",
      correctFeedback: "Xuất sắc! Biết sắp xếp thứ tự ưu tiên là chìa khóa của người tiêu dùng thông minh.",
      wrongOptionText: "Mua hết các món đồ chơi mình thích trước, đồ dùng học tập tính sau.",
      wrongFeedback: "Nếu mua đồ chơi hết tiền, em sẽ thiếu đồ dùng thiết yếu cho việc học và sức khỏe!"
    })
  },
  {
    periodIndex: 5,
    lessonId: "les_fin_g3_p05",
    lessonCode: "TC03S.02.0002",
    lessonName: "Em là người mua hàng thông minh",
    topicId: "top_fin_g3_2",
    topicCode: "TC03S.02",
    officialTopicName: "Chủ đề 2: Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Thị Trấn Chi Tiêu Thông Minh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 42, y: 50 },
    criteria: [
      { code: "TC03S.01.0001.13", level: "Mức 2", competencyGroup: "Biết", description: "Biết lựa chọn sản phẩm phù hợp với nhu cầu và số tiền hiện có." },
      { code: "TC03S.01.0001.14", level: "Mức 2", competencyGroup: "Biết", description: "So sánh được giá cả của một số mặt hàng quen thuộc." },
      { code: "TC03S.01.0001.15", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thực hiện mua sắm hợp lý trong các tình huống giả định." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Tại Siêu Thị Thông Thái Khối 3, có những sản phẩm cùng loại nhưng khác mức giá và chất lượng. Với ngân sách 40 nghìn đồng, em hãy so sánh giá cả, chất lượng để mua đủ đồ học tập và bữa phụ lành mạnh nhé!",
      worldLocationName: "Siêu Thị So Sánh Giá",
      mascotGuideTip: "Đừng chỉ nhìn bao bì bắt mắt! Hãy chọn sản phẩm có chất lượng tốt (rõ nguồn gốc) và giá hợp lý trong phạm vi 40 nghìn đồng.",
      parentCompanionTip: "Cùng con so sánh giá và hạn sử dụng của 2 sản phẩm cùng loại trên kệ siêu thị.",
      shopName: "Siêu Thị Thông Thái Khối 3 (Ngân sách: 40 nghìn đồng)",
      walletBudget: 40,
      minRequiredItems: 2,
      requiredNeedTags: ["STUDY", "FOOD_HEALTHY"],
      requireQualityCheck: true,
      items: [
        { id: "g3_s5_pen_good", name: "Hộp bút bi xanh Thiên Long (15 nghìn)", icon: "🖊️", price: 15, needTag: "STUDY", qualityLabel: "Chính hãng, mực đều", isHighQuality: true, description: "Chất lượng tốt, giá hợp lý" },
        { id: "g3_s5_pen_bad", name: "Bút gắn đèn nhấp nháy không nhãn mác (25 nghìn)", icon: "🪄", price: 25, needTag: "STUDY", qualityLabel: "Nhanh tắc mực, không rõ nguồn gốc", isHighQuality: false, description: "Giá đắt nhưng chất lượng kém" },
        { id: "g3_s5_yogurt", name: "Lốc sữa chua trái cây có hạn sử dụng mới (20 nghìn)", icon: "🍨", price: 20, needTag: "FOOD_HEALTHY", qualityLabel: "Đạt chuẩn an toàn thực phẩm", isHighQuality: true, description: "Tốt cho tiêu hóa" },
        { id: "g3_s5_candy", name: "Kẹo phẩm màu sặc sỡ vỉa hè (15 nghìn)", icon: "🍭", price: 15, needTag: "TOY_WANT", qualityLabel: "Không nhãn mác", isHighQuality: false, description: "Không đảm bảo vệ sinh" }
      ],
      changePrompt: "Em chọn Hộp bút chính hãng (15) và Lốc sữa chua (20), tổng cộng 35 nghìn đồng. Đưa tờ 40 nghìn (2 tờ 20 nghìn), tiền thừa nhận lại là 5 nghìn đồng.",
      itemTotalExample: 35,
      coinGivenExample: 40,
      correctChange: 5,
      shopkeeperGivenChange: 5,
      politeCorrectText: "Em kiểm tra lại hóa đơn 35.000đ, nhận 5.000đ tiền thừa và nói lời cảm ơn cô thu ngân!",
      politeCorrectFeedback: "Chuẩn xác! Em đã biết so sánh giá cả, chất lượng và kiểm tra hóa đơn cẩn thận.",
      politeWrongText: "Chọn đại món đắt nhất mà không cần xem hạn sử dụng hay nhãn mác.",
      politeWrongFeedback: "Người mua hàng thông minh luôn kiểm tra chất lượng, hạn sử dụng và so sánh giá trước khi mua!"
    })
  },
  {
    periodIndex: 6,
    lessonId: "les_fin_g3_p06",
    lessonCode: "TC03S.02.0003",
    lessonName: "Lập kế hoạch chi tiêu nhỏ",
    topicId: "top_fin_g3_2",
    topicCode: "TC03S.02",
    officialTopicName: "Chủ đề 2: Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Thị Trấn Chi Tiêu Thông Minh",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 50, y: 62 },
    criteria: [
      { code: "TC03S.01.0001.16", level: "Mức 2", competencyGroup: "Biết", description: "Biết lập kế hoạch sử dụng một khoản tiền nhỏ." },
      { code: "TC03S.01.0001.17", level: "Mức 2", competencyGroup: "Biết", description: "Phân chia tiền cho các mục đích khác nhau." },
      { code: "TC03S.01.0001.18", level: "Mức 2", competencyGroup: "Biết", description: "Có ý thức chi tiêu hợp lý và tránh mua sắm theo cảm tính." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Em được thưởng 30 Xu cho tuần học tốt! Hãy cùng chim Sky-Line lập kế hoạch phân chia khoản tiền nhỏ này vào 3 mục đích hợp lý để không chi tiêu theo cảm tính nhé!",
      worldLocationName: "Bàn Kế Hoạch Ba Chiếc Hũ",
      mascotGuideTip: "Hãy phân bổ đủ 30 Xu vào 3 hũ: Chi tiêu thiết yếu, Tiết kiệm tích lũy và Quỹ dự phòng/sẻ chia!",
      parentCompanionTip: "Khuyến khích con viết ra giấy kế hoạch sử dụng tiền thưởng trước khi đi nhà sách.",
      mode: "ALLOCATE_JARS",
      totalCoins: 30,
      jars: [
        { id: "g3_jar_need", name: "Hũ Chi tiêu học tập & cần thiết", emoji: "📚", minCoins: 10, maxCoins: 18, description: "Mua đồ dùng học tập cần thiết trong tuần" },
        { id: "g3_jar_save", name: "Hũ Tiết kiệm mục tiêu", emoji: "🐷", minCoins: 8, maxCoins: 15, description: "Tích lũy cho mục tiêu lớn hơn" },
        { id: "g3_jar_share", name: "Hũ Sẻ chia & Dự phòng", emoji: "💝", minCoins: 3, maxCoins: 10, description: "Giúp đỡ bạn bè hoặc dự phòng khi cần" }
      ],
      twistPrompt: "Trên đường đến nhà sách, em thấy một quầy trò chơi bốc thăm trúng thưởng rủ rê dùng hết 30 Xu để bốc thăm. Em làm gì?",
      twistCorrectText: "Từ chối trò chơi may rủi và bám sát kế hoạch 3 hũ đã lập để mua đúng đồ học tập và giữ phần tiết kiệm.",
      twistCorrectFeedback: "Rất bản lĩnh! Lập kế hoạch giúp em làm chủ đồng tiền và không bị cuốn theo cảm tính.",
      twistWrongText: "Lấy hết 30 Xu chơi thử vận may.",
      twistWrongFeedback: "Tiêu tiền theo cảm tính sẽ làm vỡ kế hoạch chi tiêu của em đấy!"
    })
  },
  {
    periodIndex: 7,
    lessonId: "les_fin_g3_p07",
    lessonCode: "TC03S.03.0001",
    lessonName: "Vì sao cần tiết kiệm?",
    topicId: "top_fin_g3_3",
    topicCode: "TC03S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm hôm nay – Tương lai ngày mai",
    creativeZoneName: "Vùng 3: Đồi Gió Tương Lai Xanh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 56, y: 45 },
    criteria: [
      { code: "TC03S.01.0001.19", level: "Mức 2", competencyGroup: "Biết", description: "Hiểu được ý nghĩa của tiết kiệm." },
      { code: "TC03S.01.0001.20", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được một số việc làm thể hiện sự tiết kiệm." },
      { code: "TC03S.01.0001.21", level: "Mức 2", competencyGroup: "Biết", description: "Hình thành thói quen tiết kiệm trong sinh hoạt hằng ngày." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Tại Đồi Gió Tương Lai Xanh, chim Sky-Line muốn cùng em phân biệt những thói quen gây lãng phí và những việc làm thể hiện sự tiết kiệm mỗi ngày!",
      worldLocationName: "Vườn Ươm Thói Quen Tốt",
      mascotGuideTip: "Tiết kiệm không phải là keo kiệt, mà là sử dụng tiền bạc, thời gian và đồ dùng một cách hợp lý, tránh lãng phí!",
      parentCompanionTip: "Khen ngợi con mỗi khi con chủ động tắt quạt, giữ gìn sách vở hoặc cất tiền mừng tuổi vào ống heo.",
      mode: "NEED_VS_WANT",
      context1Title: "Thói quen sinh hoạt & sử dụng tiền hằng ngày",
      context1Subtitle: "Chọn những việc làm Tiết kiệm (Nhóm A) và những hành vi Lãng phí cần tránh (Nhóm B)",
      groupAName: "Việc làm Tiết kiệm thông thái 🌱",
      groupBName: "Hành vi Lãng phí cần tránh ⚠️",
      items1: [
        { id: "g3_s7_1", name: "Dùng lại bìa bọc sách còn mới cho năm học tiếp theo", emoji: "📘", correctGroup: "GROUP_A", contextReason: "Giúp tiết kiệm chi phí và bảo vệ môi trường." },
        { id: "g3_s7_2", name: "Dành dụm một phần tiền thưởng vào ống heo mỗi tuần", emoji: "🐖", correctGroup: "GROUP_A", contextReason: "Tích tiểu thành đại để chuẩn bị cho tương lai." },
        { id: "g3_s7_3", name: "Bật điều hòa và mở toang cửa sổ cả buổi", emoji: "❄️", correctGroup: "GROUP_B", contextReason: "Gây thất thoát điện năng và tốn nhiều tiền điện." },
        { id: "g3_s7_4", name: "Mua nhiều đồ ăn vặt rồi bỏ quên đến hết hạn", emoji: "🍔", correctGroup: "GROUP_B", contextReason: "Lãng phí tiền bạc và thực phẩm." }
      ],
      questionPrompt: "Ý nghĩa lớn nhất của việc rèn luyện thói quen tiết kiệm từ hôm nay là gì?",
      correctOptionText: "Giúp chúng ta chủ động thực hiện được các mục tiêu tương lai, có khoản dự phòng khi cần và trân trọng nguồn lực của gia đình, xã hội.",
      correctFeedback: "Tuyệt vời! Tiết kiệm hôm nay chính là xây dựng tương lai vững vàng cho ngày mai.",
      wrongOptionText: "Tiết kiệm nghĩa là nhịn ăn sáng và không bao giờ giúp đỡ ai.",
      wrongFeedback: "Nhịn ăn sáng sẽ hại sức khỏe! Tiết kiệm đúng cách là cắt giảm những khoản lãng phí không cần thiết."
    })
  },
  {
    periodIndex: 8,
    lessonId: "les_fin_g3_p08",
    lessonCode: "TC03S.03.0002",
    lessonName: "Mục tiêu tiết kiệm của em",
    topicId: "top_fin_g3_3",
    topicCode: "TC03S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm hôm nay – Tương lai ngày mai",
    creativeZoneName: "Vùng 3: Đồi Gió Tương Lai Xanh",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 63, y: 36 },
    criteria: [
      { code: "TC03S.01.0001.22", level: "Mức 1", competencyGroup: "Hiểu", description: "Xác định được một mục tiêu tiết kiệm phù hợp." },
      { code: "TC03S.01.0001.23", level: "Mức 2", competencyGroup: "Biết", description: "Biết lập kế hoạch tiết kiệm đơn giản." },
      { code: "TC03S.01.0001.24", level: "Mức 2", competencyGroup: "Biết", description: "Có động lực thực hiện mục tiêu đã đặt ra." }
    ],
    interactive: buildNestInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Em hãy chọn một mục tiêu tiết kiệm vừa sức với học sinh lớp 3 và lập kế hoạch tích lũy từng tuần để xây Chiếc Tổ Ước Mơ nhé!",
      worldLocationName: "Đài Quan Sát Mục Tiêu",
      mascotGuideTip: "Mục tiêu tiết kiệm tốt là mục tiêu cụ thể, hữu ích và phù hợp với số tiền em có thể dành dụm mỗi tuần!",
      practicalPrompt: "Em hãy viết mục tiêu tiết kiệm của riêng em (ví dụ: mua bộ sách khoa học hoặc món quà tặng mẹ) và số tiền em dự định tiết kiệm mỗi tuần nhé!",
      parentCompanionTip: "Cùng con dán một tờ giấy nhỏ ghi mục tiêu lên ống heo để tạo động lực mỗi tuần.",
      mode: "SAVINGS_PIGGY_PLAN",
      totalCoins: 40,
      jars: [
        { id: "g3_w1", name: "Tuần 1 tích lũy", emoji: "1️⃣", minCoins: 8, maxCoins: 15, description: "Tiết kiệm từ tiền thưởng tuần 1" },
        { id: "g3_w2", name: "Tuần 2 tích lũy", emoji: "2️⃣", minCoins: 8, maxCoins: 15, description: "Tiết kiệm từ việc hạn chế mua quà vặt" },
        { id: "g3_w3", name: "Tuần 3 & 4 hoàn thành mục tiêu", emoji: "🏁", minCoins: 14, maxCoins: 24, description: "Đủ 40 Xu chạm đích mục tiêu!" }
      ],
      goals: [
        { id: "goal_science_book", name: "Bộ Từ điển Khoa học có hình (40 Xu)", emoji: "🔬", targetCoins: 40, weeksSuggested: 4, ageAppropriate: true, feedback: "Mục tiêu rất thiết thực, vừa sức và giúp ích cho việc học tập!" },
        { id: "goal_badminton", name: "Bộ vợt cầu lông rèn luyện sức khỏe (40 Xu)", emoji: "🏸", targetCoins: 40, weeksSuggested: 4, ageAppropriate: true, feedback: "Mục tiêu rèn luyện thể chất tuyệt vời!" },
        { id: "goal_luxury_phone", name: "Điện thoại thông minh đắt tiền (5.000 Xu)", emoji: "📱", targetCoins: 5000, weeksSuggested: 100, ageAppropriate: false, feedback: "Mục tiêu này quá lớn so với học sinh lớp 3, em hãy chọn mục tiêu vừa sức nhé!" }
      ],
      twistPrompt: "Đi được nửa chặng đường tiết kiệm (đã có 20 Xu), em thấy hơi nản vì muốn mua truyện tranh ngay. Em làm thế nào để giữ động lực?",
      twistCorrectText: "Nhìn lại bảng theo dõi tiến độ trên ống heo, nhớ về niềm vui khi đạt được Bộ Từ điển Khoa học và kiên trì thêm 2 tuần nữa!",
      twistCorrectFeedback: "Rất kiên trì! Theo dõi tiến độ từng tuần sẽ tiếp thêm động lực để em về đích.",
      twistWrongText: "Đập heo lấy tiền tiêu hết ngay lập tức.",
      twistWrongFeedback: "Nếu bỏ cuộc giữa chừng, em sẽ không bao giờ chạm tới mục tiêu mơ ước!"
    })
  },
  {
    periodIndex: 9,
    lessonId: "les_fin_g3_p09",
    lessonCode: "TC03S.03.0003",
    lessonName: "Thực hành tiết kiệm",
    topicId: "top_fin_g3_3",
    topicCode: "TC03S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm hôm nay – Tương lai ngày mai",
    creativeZoneName: "Vùng 3: Đồi Gió Tương Lai Xanh",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 70, y: 48 },
    criteria: [
      { code: "TC03S.01.0001.25", level: "Mức 2", competencyGroup: "Biết", description: "Biết thực hiện tiết kiệm tiền, điện, nước và đồ dùng học tập." },
      { code: "TC03S.01.0001.26", level: "Mức 2", competencyGroup: "Biết", description: "Theo dõi được việc tiết kiệm của bản thân." },
      { code: "TC03S.01.0001.27", level: "Mức 3", competencyGroup: "Vận dụng", description: "Hình thành tinh thần trách nhiệm đối với gia đình và môi trường." }
    ],
    interactive: buildVillageInteractive({
      storyBrief: "Khu phố Đồi Gió đang phát động chiến dịch Thực hành Tiết kiệm Xanh! Em hãy tương tác với từng địa điểm để tiết kiệm điện, nước, đồ dùng học tập và đảm bảo an toàn nhé!",
      worldLocationName: "Khu Phố Thực Hành Xanh",
      mascotGuideTip: "Hãy chú ý phân biệt việc em tự làm được (tắt công tắc đèn, khóa vòi nước, giữ gìn đồ dùng) và việc nguy hiểm phải nhờ người lớn!",
      parentCompanionTip: "Giao cho con nhiệm vụ 'Đội trưởng Tiết kiệm Xanh' kiểm tra đèn và quạt trước khi cả nhà ra ngoài.",
      villageTheme: "ENERGY_WATER_SAVER",
      hotspots: [
        {
          id: "g3_s9_h1",
          title: "Phòng học sáng nắng nhưng vẫn bật hết đèn điện",
          icon: "💡",
          problemState: "Trời nắng sáng rõ nhưng 4 bóng đèn và quạt ở góc không người ngồi vẫn bật.",
          restoredState: "Tắt bớt đèn không cần thiết, mở rèm đón ánh sáng tự nhiên giúp lớp học mát lành.",
          correctActionId: "act_lights_off",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_lights_off", label: "Tự tay bấm công tắc tắt đèn/quạt khi không sử dụng", isCorrect: true, feedback: "Tuyệt vời! Hành động nhỏ mỗi ngày giúp tiết kiệm điện và bảo vệ môi trường." },
            { id: "act_lights_ignore", label: "Cứ để nguyên vì điện của trường không phải của nhà mình", isCorrect: false, feedback: "Tiết kiệm điện ở trường hay ở nhà đều là trách nhiệm chung với môi trường!" }
          ]
        },
        {
          id: "g3_s9_h2",
          title: "Góc đồ dùng học tập của em",
          icon: "✏️",
          problemState: "Bút chì mới dùng ngắn một chút đã định vứt đi, vở còn nhiều trang trắng.",
          restoredState: "Dùng nắp nối bút chì để viết tiếp và tận dụng các trang giấy trắng làm sổ nháp.",
          correctActionId: "act_save_supplies",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_save_supplies", label: "Tận dụng trang vở trắng làm giấy nháp và giữ gìn bút, thước cẩn thận", isCorrect: true, feedback: "Chính xác! Tiết kiệm đồ dùng học tập cũng chính là tiết kiệm tiền cho bố mẹ." },
            { id: "act_throw_away", label: "Vứt hết mua bộ mới cho đẹp", isCorrect: false, feedback: "Như vậy vừa tốn tiền vừa xả thêm rác ra môi trường!" }
          ]
        },
        {
          id: "g3_s9_h3",
          title: "Ổ cắm quạt tường bị lỏng và đánh tia lửa",
          icon: "🔌",
          problemState: "Phích cắm điện bị lỏng và có mùi khét.",
          restoredState: "Báo ngay cho thầy cô hoặc bố mẹ để ngắt cầu dao và sửa chữa an toàn.",
          correctActionId: "act_ask_adult",
          safetyType: "ASK_ADULT",
          actions: [
            { id: "act_ask_adult", label: "Tuyệt đối không tự chạm tay vào ổ điện hỏng, báo ngay cho người lớn", isCorrect: true, feedback: "Rất thông minh và an toàn! Học sinh không bao giờ tự sửa ổ điện." },
            { id: "act_touch_socket", label: "Tự lấy thước sắt chọc vào ổ điện để sửa", isCorrect: false, feedback: "Cực kỳ nguy hiểm! Việc liên quan đến ổ điện hỏng bắt buộc phải nhờ người lớn." }
          ]
        }
      ],
      reflectionPrompt: "Vì sao tiết kiệm điện, nước và đồ dùng học tập lại gắn liền với trách nhiệm đối với gia đình và môi trường?",
      reflectionCorrectText: "Vì mọi đồ dùng, điện, nước đều tiêu tốn tài nguyên thiên nhiên và tiền bạc của gia đình; tiết kiệm giúp giảm chi phí và giữ Trái Đất xanh.",
      reflectionCorrectFeedback: "Xuất sắc! Em là công dân nhí rất có trách nhiệm với gia đình và môi trường.",
      reflectionWrongText: "Vì tiết kiệm điện nước chỉ để thi đua lấy điểm chứ không giúp ích gì.",
      reflectionWrongFeedback: "Tiết kiệm điện, nước giúp bảo vệ nguồn tài nguyên quý giá cho tất cả chúng ta đấy!"
    })
  },
  {
    periodIndex: 10,
    lessonId: "les_fin_g3_p10",
    lessonCode: "TC03S.04.0001",
    lessonName: "Ghi chép thu – chi đơn giản",
    topicId: "top_fin_g3_4",
    topicCode: "TC03S.04",
    officialTopicName: "Chủ đề 4. Quản lý tiền của em",
    creativeZoneName: "Vùng 4: Trạm Sổ Tay Quản Lý",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 75, y: 65 },
    criteria: [
      { code: "TC03S.01.0001.28", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được các khoản tiền nhận và tiền đã chi." },
      { code: "TC03S.01.0001.29", level: "Mức 2", competencyGroup: "Biết", description: "Biết ghi chép thu – chi bằng bảng đơn giản." },
      { code: "TC03S.01.0001.30", level: "Mức 2", competencyGroup: "Biết", description: "Hình thành thói quen theo dõi việc sử dụng tiền." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Tại Trạm Sổ Tay Quản Lý, em có tổng khoản thu trong tuần là 50 nghìn đồng (tiền thưởng học tốt và phụ việc nhà). Hãy đối chiếu bảng ghi chép các khoản chi, tính tổng chi, số dư còn lại và đánh dấu khoản chi nào hợp lý nhé!",
      worldLocationName: "Trạm Sổ Tay Thu – Chi",
      mascotGuideTip: "Hãy cộng tất cả các khoản đã chi (15 + 10 + 10 = 35), lấy 50 trừ đi tổng chi để tìm số tiền còn lại (15), và phân loại từng khoản chi!",
      parentCompanionTip: "Tặng con một cuốn sổ nhỏ để con tập ghi các khoản tiền nhận được và đã chi vào mỗi tối Chủ nhật.",
      mode: "COIN_DIARY",
      startingCoins: 50,
      diaryEntries: [
        { id: "g3_d1", itemName: "Mua quyển truyện lịch sử Việt Nam", emoji: "📖", cost: 15, isNecessary: true, note: "Phục vụ đọc sách mở rộng kiến thức" },
        { id: "g3_d2", itemName: "Mua hộp sữa hạt buổi chiều", emoji: "🥛", cost: 10, isNecessary: true, note: "Bổ sung dinh dưỡng sau giờ học" },
        { id: "g3_d3", itemName: "Mua kẹo nổ theo lời rủ của bạn dù không thích ăn", emoji: "🍬", cost: 10, isNecessary: false, note: "Khoản chi theo cảm hứng, chưa cần thiết" }
      ]
    })
  },
  {
    periodIndex: 11,
    lessonId: "les_fin_g3_p11",
    lessonCode: "TC03S.04.0002",
    lessonName: "Em quản lý tiền tiêu vặt",
    topicId: "top_fin_g3_4",
    topicCode: "TC03S.04",
    officialTopicName: "Chủ đề 4. Quản lý tiền của em",
    creativeZoneName: "Vùng 4: Trạm Sổ Tay Quản Lý",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 80, y: 52 },
    criteria: [
      { code: "TC03S.01.0001.31", level: "Mức 2", competencyGroup: "Biết", description: "Biết sử dụng tiền tiêu vặt hợp lý." },
      { code: "TC03S.01.0001.32", level: "Mức 2", competencyGroup: "Biết", description: "Biết cân nhắc trước khi đưa ra quyết định chi tiêu." },
      { code: "TC03S.01.0001.33", level: "Mức 3", competencyGroup: "Vận dụng", description: "Có ý thức chịu trách nhiệm đối với việc sử dụng tiền của bản thân." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Tuần này em có 40 nghìn đồng tiền tiêu vặt. Hãy phân bổ khoản tiền này thật khéo léo và chịu trách nhiệm với quyết định của mình trước các lời mời gọi hấp dẫn nhé!",
      worldLocationName: "Phòng Điều Hành Tiền Tiêu Vặt",
      mascotGuideTip: "Người quản lý tiền tiêu vặt giỏi luôn chia tiền rõ ràng và không tiêu lẹm vào phần tiết kiệm!",
      parentCompanionTip: "Thay vì cho tiền lặt vặt mỗi ngày, có thể giao khoản nhỏ theo tuần để con tập tự phân bổ dưới sự đồng hành của bố mẹ.",
      mode: "ALLOCATE_JARS",
      totalCoins: 40,
      jars: [
        { id: "g3_p11_need", name: "Chi tiêu cần thiết trong tuần", emoji: "🥪", minCoins: 15, maxCoins: 25, description: "Mua thêm bút, thước hoặc bữa phụ lành mạnh" },
        { id: "g3_p11_save", name: "Tiết kiệm cố định", emoji: "🐷", minCoins: 10, maxCoins: 20, description: "Cất vào heo đất ngay khi nhận tiền" },
        { id: "g3_p11_fun", name: "Giải trí lành mạnh / Sẻ chia", emoji: "🎨", minCoins: 5, maxCoins: 12, description: "Mua nhãn vở đẹp hoặc ủng hộ quỹ lớp" }
      ],
      twistPrompt: "Mới đến thứ Tư, bạn cùng bàn rủ em dùng hết tiền của cả tuần để mua bộ bài trò chơi mới. Nếu mua, thứ Sáu em sẽ không còn tiền mua bút viết. Em quyết định thế nào?",
      twistCorrectText: "Tự chịu trách nhiệm với ngân sách tuần của mình: từ chối mua bộ bài để giữ tiền mua bút viết và bảo toàn khoản tiết kiệm.",
      twistCorrectFeedback: "Quyết định rất chín chắn! Em đã biết cân nhắc hệ quả và chịu trách nhiệm với tiền tiêu vặt của mình.",
      twistWrongText: "Cứ mua bộ bài rồi thứ Sáu xin thêm bố mẹ.",
      twistWrongFeedback: "Quản lý tiền tiêu vặt có trách nhiệm là biết gói gọn trong ngân sách đã thống nhất!"
    })
  },
  {
    periodIndex: 12,
    lessonId: "les_fin_g3_p12",
    lessonCode: "TC03S.04.0003",
    lessonName: "Giải quyết tình huống tài chính",
    topicId: "top_fin_g3_4",
    topicCode: "TC03S.04",
    officialTopicName: "Chủ đề 4. Quản lý tiền của em",
    creativeZoneName: "Vùng 4: Trạm Sổ Tay Quản Lý",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 84, y: 38 },
    criteria: [
      { code: "TC03S.01.0001.34", level: "Mức 2", competencyGroup: "Biết", description: "Biết lựa chọn phương án phù hợp trong một số tình huống tài chính đơn giản." },
      { code: "TC03S.01.0001.35", level: "Mức 2", competencyGroup: "Biết", description: "Biết trao đổi và bảo vệ ý kiến của mình." },
      { code: "TC03S.01.0001.36", level: "Mức 3", competencyGroup: "Vận dụng", description: "Phát triển năng lực ra quyết định và giải quyết vấn đề." }
    ],
    interactive: buildDiaryAdInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Trên Phố Tình Huống Tài Chính, em gặp 3 lời mời mua sắm và tình huống bất ngờ. Hãy phân tích từng bảng thông tin, đưa ra quyết định đúng đắn và bảo vệ ý kiến của mình nhé!",
      worldLocationName: "Ngã Tư Tình Huống Tài Chính",
      mascotGuideTip: "Khi gặp tình huống khó, hãy đối chiếu: (1) Mình có thực sự cần không? (2) Ngân sách có đủ không? (3) Chất lượng có đảm bảo không?",
      practicalPrompt: "Em hãy nêu lý do bảo vệ quyết định của em khi từ chối một món đồ quảng cáo hấp dẫn nhưng vượt quá số tiền hiện có nhé!",
      parentCompanionTip: "Lắng nghe con giải thích lý do khi con đưa ra một quyết định mua sắm hoặc tiết kiệm.",
      mode: "AD_DETECTIVE",
      startingCoins: 35,
      adBillboards: [
        {
          id: "g3_ad1",
          productName: "Bộ compa & thước đo độ chuẩn lớp 3 (Giá 20 nghìn)",
          emoji: "🧭",
          price: 20,
          adSlogan: "Dụng cụ học Toán chính xác, bền bỉ suốt năm học!",
          hookType: "GENUINE_QUALITY",
          hookLabel: "Thông tin chất lượng & công dụng thực tế",
          matchesStudentNeed: true,
          fitsWallet: true,
          shouldBuy: true,
          explanation: "Đúng nhu cầu học tập lớp 3, chất lượng tốt và nằm trong ngân sách 35 nghìn."
        },
        {
          id: "g3_ad2",
          productName: "Combo Nước ngọt có ga tặng kèm thẻ bài hiếm (Giá 30 nghìn)",
          emoji: "🥤",
          price: 30,
          adSlogan: "Mua ngay kẻo hết! Sưu tầm thẻ bài siêu hiếm!",
          hookType: "GIFT_BONUS",
          hookLabel: "Quà tặng kèm đánh vào tâm lý thích sưu tầm",
          matchesStudentNeed: false,
          fitsWallet: true,
          shouldBuy: false,
          explanation: "Không thiết yếu, nhiều đường và khiến em không còn đủ tiền mua dụng cụ học tập."
        },
        {
          id: "g3_ad3",
          productName: "Giày trượt patin phát sáng giảm giá sốc (Giá 80 nghìn)",
          emoji: "🛼",
          price: 80,
          adSlogan: "Giảm giá 50% chỉ trong hôm nay!",
          hookType: "BIG_DISCOUNT",
          hookLabel: "Khuyến mãi giảm giá lớn nhưng vượt ngân sách",
          matchesStudentNeed: false,
          fitsWallet: false,
          shouldBuy: false,
          explanation: "Vượt quá số tiền 35 nghìn hiện có và không phải nhu cầu cấp thiết."
        }
      ]
    })
  },
  {
    periodIndex: 13,
    lessonId: "les_fin_g3_p13",
    lessonCode: "TC03S.05.0001",
    lessonName: "Chia sẻ và giúp đỡ người khác",
    topicId: "top_fin_g3_5",
    topicCode: "TC03S.05",
    officialTopicName: "Chủ đề 5. Sử dụng tiền có trách nhiệm",
    creativeZoneName: "Vùng 5: Ngọn Hải Đăng Trách Nhiệm",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 88, y: 26 },
    criteria: [
      { code: "TC03S.01.0001.37", level: "Mức 2", competencyGroup: "Biết", description: "Hiểu được ý nghĩa của việc chia sẻ." },
      { code: "TC03S.01.0001.38", level: "Mức 2", competencyGroup: "Biết", description: "Biết dành một phần tiền hoặc đồ dùng để giúp đỡ người khác." },
      { code: "TC03S.01.0001.39", level: "Mức 3", competencyGroup: "Vận dụng", description: "Hình thành lòng nhân ái và tinh thần tương thân tương ái." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Tại Ngọn Hải Đăng Trách Nhiệm, chim Sky-Line mời em tham gia chương trình 'Góp Nắng Yêu Thương'. Hãy phân bổ 30 Xu để vừa đảm bảo việc học, vừa tiết kiệm, vừa sẻ chia giúp đỡ các bạn vùng khó khăn nhé!",
      worldLocationName: "Vườn Nhân Ái Hải Đăng",
      mascotGuideTip: "Sự sẻ chia chân thành bằng một phần tiền tiết kiệm hoặc sách vở, đồ dùng còn tốt sẽ nhân đôi niềm hạnh phúc!",
      parentCompanionTip: "Cùng con chuẩn bị sách truyện cũ còn mới hoặc một khoản nhỏ từ heo đất để tham gia hội chợ từ thiện của trường.",
      mode: "HAPPY_SHARING",
      totalCoins: 30,
      jars: [
        { id: "g3_p13_need", name: "Hũ Nhu cầu học tập", emoji: "🎒", minCoins: 10, maxCoins: 18, description: "Đảm bảo đồ dùng học tập của bản thân" },
        { id: "g3_p13_save", name: "Hũ Tiết kiệm tương lai", emoji: "🏦", minCoins: 6, maxCoins: 14, description: "Tích lũy cho mục tiêu cá nhân" },
        { id: "g3_p13_share", name: "Hũ Sẻ chia Nhân ái", emoji: "❤️", minCoins: 5, maxCoins: 12, description: "Mua vở trắng tặng bạn học sinh vùng lũ" }
      ],
      twistPrompt: "Ngoài việc ủng hộ bằng tiền từ Hũ Sẻ chia, em còn có thể giúp đỡ người khác bằng cách nào phù hợp với lứa tuổi lớp 3?",
      twistCorrectText: "Quyên góp sách truyện, quần áo sạch đẹp còn dùng tốt và dành thời gian giảng bài, giúp đỡ bạn bè trong lớp.",
      twistCorrectFeedback: "Tuyệt vời! Sẻ chia bằng cả tấm lòng, đồ dùng và hành động tử tế làm cho cuộc sống ấm áp hơn.",
      twistWrongText: "Lấy đồ đã hỏng rách đem đi tặng cho xong chuyện.",
      twistWrongFeedback: "Khi tặng quà hay chia sẻ, chúng ta cần chọn những món đồ còn tốt và gói ghém trân trọng nhé!"
    })
  },
  {
    periodIndex: 14,
    lessonId: "les_fin_g3_p14",
    lessonCode: "TC03S.05.0002",
    lessonName: "Bảo quản tiền và tài sản cá nhân",
    topicId: "top_fin_g3_5",
    topicCode: "TC03S.05",
    officialTopicName: "Chủ đề 5. Sử dụng tiền có trách nhiệm",
    creativeZoneName: "Vùng 5: Ngọn Hải Đăng Trách Nhiệm",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 92, y: 18 },
    criteria: [
      { code: "TC03S.01.0001.40", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết giữ gìn tiền và tài sản cá nhân." },
      { code: "TC03S.01.0001.41", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được một số nguy cơ mất an toàn khi sử dụng tiền." },
      { code: "TC03S.01.0001.42", level: "Mức 2", competencyGroup: "Biết", description: "Hình thành ý thức bảo vệ tài sản của bản thân." }
    ],
    interactive: buildVillageInteractive({
      storyBrief: "Hãy cùng chim Sky-Line kiểm tra các tình huống tại Sân Trường & Bến Xe để nhận diện nguy cơ thất lạc tiền bạc, tài sản cá nhân và chọn cách bảo quản an toàn nhất!",
      worldLocationName: "Trạm Bảo Vệ Tài Sản Cá Nhân",
      mascotGuideTip: "Không khoe tiền nơi đông người, luôn cất tiền trong ví có khóa kéo và ghi tên lên đồ dùng cá nhân!",
      parentCompanionTip: "Hướng dẫn con chuẩn bị một ngăn có khóa kéo trong cặp để cất tiền ăn sáng hoặc thẻ học sinh.",
      villageTheme: "ECO_REUSE_WORKSHOP",
      hotspots: [
        {
          id: "g3_s14_h1",
          title: "Giờ ra chơi trên sân trường",
          icon: "👛",
          problemState: "Bạn nhỏ nhét tờ tiền ăn xế nhàu nát trong túi quần nông dễ rơi khi chạy nhảy.",
          restoredState: "Tiền được vuốt phẳng, cất gọn vào ví nhỏ có khóa kéo đặt trong ngăn cặp an toàn.",
          correctActionId: "act_safe_wallet",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_safe_wallet", label: "Vuốt phẳng tờ tiền và cất vào ví nhỏ trong ngăn cặp có khóa kéo", isCorrect: true, feedback: "Chính xác! Vừa giữ tờ tiền bền đẹp vừa tránh đánh rơi khi vận động." },
            { id: "act_crumple_pocket", label: "Vo tròn nhét túi quần hoặc cầm trên tay vừa chạy vừa khoe", isCorrect: false, feedback: "Rất dễ làm rơi mất hoặc tạo nguy cơ mất an toàn!" }
          ]
        },
        {
          id: "g3_s14_h2",
          title: "Áo khoác đồng phục và bình nước cá nhân",
          icon: "🧥",
          problemState: "Nhiều bạn để quên áo khoác và bình nước ở sân bóng mà không có nhãn tên.",
          restoredState: "Ghi nhãn tên, lớp rõ ràng lên bình nước, áo khoác và kiểm tra đủ đồ trước khi ra về.",
          correctActionId: "act_label_belongings",
          safetyType: "SELF_DO",
          actions: [
            { id: "act_label_belongings", label: "Dán nhãn tên – lớp lên đồ dùng cá nhân và kiểm tra cặp sách trước khi về", isCorrect: true, feedback: "Rất cẩn thận! Bảo vệ tài sản cá nhân giúp tránh thất lạc và lãng phí." },
            { id: "act_leave_anywhere", label: "Để đồ dùng khắp nơi vì mất thì bố mẹ mua cái mới", isCorrect: false, feedback: "Mỗi món đồ đều mua bằng tiền lao động của bố mẹ, em cần có trách nhiệm giữ gìn!" }
          ]
        },
        {
          id: "g3_s14_h3",
          title: "Người lạ ngoài cổng trường hỏi mượn tiền hoặc rủ đi theo",
          icon: "🚨",
          problemState: "Một người lạ tiến lại gần hỏi xem trong cặp em có bao nhiêu tiền.",
          restoredState: "Từ chối khéo, đi ngay vào khu vực có bác bảo vệ/thầy cô và báo cho người lớn.",
          correctActionId: "act_report_guard",
          safetyType: "ASK_ADULT",
          actions: [
            { id: "act_report_guard", label: "Không mở ví trước mặt người lạ, lùi vào trong trường và báo ngay cho bác bảo vệ/thầy cô", isCorrect: true, feedback: "Tuyệt vời! An toàn của bản thân và tài sản luôn đặt lên hàng đầu." },
            { id: "act_show_money", label: "Lấy hết tiền trong cặp ra đếm cho người lạ xem", isCorrect: false, feedback: "Rất mất an toàn! Tuyệt đối không khoe tiền với người lạ." }
          ]
        }
      ],
      reflectionPrompt: "Thói quen nào giúp em bảo quản tiền và tài sản cá nhân an toàn mỗi ngày?",
      reflectionCorrectText: "Không mang nhiều tiền không cần thiết đến trường, cất tiền gọn trong ví kín đáo, không khoe khoang và luôn kiểm tra đồ dùng cá nhân trước khi di chuyển.",
      reflectionCorrectFeedback: "Hoàn toàn chính xác! Em đã nắm vững nguyên tắc an toàn tài sản cá nhân.",
      reflectionWrongText: "Mang toàn bộ tiền tiết kiệm trong heo đất đến lớp để khoe với các bạn.",
      reflectionWrongFeedback: "Mang nhiều tiền đến lớp vừa không cần thiết vừa dễ bị thất lạc!"
    })
  },
  {
    periodIndex: 15,
    lessonId: "les_fin_g3_p15",
    lessonCode: "TC03S.05.0003",
    lessonName: "Em là nhà quản lý tài chính nhỏ tuổi",
    topicId: "top_fin_g3_5",
    topicCode: "TC03S.05",
    officialTopicName: "Chủ đề 5. Sử dụng tiền có trách nhiệm",
    creativeZoneName: "Vùng 5: Ngọn Hải Đăng Trách Nhiệm",
    isProject: true,
    feathersReward: 6,
    badgeCode: "BADGE_TC03S_CHAMPION",
    badgeName: "Nhà Quản Lý Tài Chính Nhỏ Tuổi Khối 3",
    mapCoordinates: { x: 96, y: 10 },
    criteria: [
      { code: "TC03S.01.0001.43", level: "Mức 3", competencyGroup: "Vận dụng", description: "Vận dụng kiến thức đã học để xây dựng kế hoạch quản lý một khoản tiền nhỏ." },
      { code: "TC03S.01.0001.44", level: "Mức 2", competencyGroup: "Biết", description: "Tự đánh giá được thói quen chi tiêu và tiết kiệm của bản thân." },
      { code: "TC03S.01.0001.45", level: "Mức 3", competencyGroup: "Vận dụng", description: "Hình thành phẩm chất tiết kiệm, trách nhiệm và biết đưa ra quyết định tài chính phù hợp." }
    ],
    interactive: buildDiaryAdInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Chặng 15 Tổng kết Đảo Tài Chính 3S! Em hãy vận dụng toàn bộ kiến thức Khối 3 để lập kế hoạch quản lý ngân sách 30 Xu (Chi tiêu thiết yếu – Tiết kiệm – Sẻ chia), xử lý tình huống tổng hợp và tự đánh giá thói quen của mình nhé!",
      worldLocationName: "Đỉnh Hải Đăng Nhà Quản Lý Tài Chính Khối 3",
      mascotGuideTip: "Hãy phân bổ tổng 30 Xu sao cho Tiết kiệm tối thiểu 8 Xu, Sẻ chia tối thiểu 4 Xu và trả lời tình huống tổng hợp!",
      practicalPrompt: "Dự án tổng kết Khối 3: Em hãy tự nhận xét 1 thói quen tài chính tốt mà em đã rèn được và kế hoạch quản lý tiền tiêu vặt/tiền thưởng của em trong tháng tới!",
      parentCompanionTip: "Chúc mừng con hoàn thành 15 chặng Khối 3! Hãy cùng con nhìn lại cuốn Hộ chiếu Hành trình và khen ngợi sự trưởng thành của con.",
      mode: "MASTER_FINANCE_CAPSTONE",
      startingCoins: 30,
      diaryEntries: [
        { id: "g3_cap_1", itemName: "Chi tiêu thiết yếu (Dụng cụ học tập & sách)", emoji: "📚", cost: 16, isNecessary: true, note: "Ưu tiên nhu cầu học tập" },
        { id: "g3_cap_2", itemName: "Tiết kiệm cho mục tiêu tháng tới", emoji: "🐷", cost: 10, isNecessary: true, note: "Duy trì kỷ luật tiết kiệm" },
        { id: "g3_cap_3", itemName: "Quỹ sẻ chia giúp đỡ bạn khó khăn", emoji: "💝", cost: 4, isNecessary: true, note: "Sử dụng tiền có trách nhiệm" }
      ],
      capstoneChallenge: {
        totalBudget: 30,
        minSaveCoins: 8,
        minShareCoins: 4,
        surpriseQuestion: "Tình huống tổng kết Khối 3: Em đang giữ 30 Xu được phân bổ rõ ràng (Học tập, Tiết kiệm, Sẻ chia). Trên đường về, em nhặt được một chiếc ví có 50.000đ của bạn lớp bên cạnh đánh rơi. Em hành động thế nào?",
        surpriseOptions: [
          {
            id: "g3_master_right",
            text: "Giữ nguyên kế hoạch 30 Xu của mình, đồng thời mang ngay chiếc ví nhặt được nộp cho thầy cô Tổng phụ trách / GVCN để trả lại cho bạn bị mất!",
            isCorrect: true,
            feedback: "XUẤT SẮC! Em vừa là Nhà Quản Lý Tài Chính Nhỏ Tuổi thông thái vừa có phẩm chất trung thực, nhân ái đáng tự hào!"
          },
          {
            id: "g3_master_wrong",
            text: "Lấy tiền trong ví nhặt được đi mua đồ chơi cho mình.",
            isCorrect: false,
            feedback: "Người quản lý tài chính chân chính luôn trung thực và tôn trọng tài sản của người khác!"
          }
        ]
      }
    })
  }
];

// ============================================================================
// KHỐI 4 – HỆ S (MÃ TC04S): 3 CHỦ ĐỀ / VÙNG, 12 CHẶNG, 57 TIÊU CHUẨN
// ============================================================================
export const TC04S_ZONES: TC02SZoneDefinition[] = [
  {
    zoneIndex: 1,
    topicId: "top_fin_g4_1",
    topicCode: "TC04S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Làm chủ lựa chọn",
    creativeZoneName: "Vùng 1: Quảng Trường Ba Câu Hỏi Thông Thái",
    themeColor: "#0284C7",
    accentColor: "#38BDF8",
    landscapeDescription: "Quảng trường sôi động nơi học sinh Khối 4 làm chủ sự khan hiếm nguồn lực, cân nhắc giữa tiêu ngay hay tiết kiệm và áp dụng quy tắc 'Ba câu hỏi trước khi mở ví'.",
    badgeCode: "BADGE_TC04S_Z1",
    badgeName: "Bậc Thầy Lựa Chọn Khối 4",
    stagePeriods: [1, 2, 3, 4]
  },
  {
    zoneIndex: 2,
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    themeColor: "#0D9488",
    accentColor: "#2DD4BF",
    landscapeDescription: "Học viện thực hành quản lý tiền tiêu vặt, vượt qua Thử thách 50.000 đồng, lập kế hoạch tiết kiệm theo tuần và hóa giải những chiếc bẫy mua sắm bốc đồng.",
    badgeCode: "BADGE_TC04S_Z2",
    badgeName: "Chiến Binh Ngân Sách 50K",
    stagePeriods: [5, 6, 7, 8, 9, 10]
  },
  {
    zoneIndex: 3,
    topicId: "top_fin_g4_3",
    topicCode: "TC04S.03",
    officialTopicName: "Chủ đề 3. Đồng tiền có trách nhiệm – Sáng tạo và sẻ chia",
    creativeZoneName: "Vùng 3: Phố Hội Gian Hàng Nhí Sáng Tạo",
    themeColor: "#7C3AED",
    accentColor: "#C084FC",
    landscapeDescription: "Không gian hợp tác nơi học sinh thực hiện kế hoạch 'Việc tốt từ đồng tiền nhỏ' và vận hành Dự án hợp tác 'Gian hàng Nhí' tối ưu chi phí.",
    badgeCode: "BADGE_TC04S_Z3",
    badgeName: "Thủ Lĩnh Gian Hàng Nhí Khối 4",
    stagePeriods: [11, 12]
  }
];

export const TC04S_STAGES: TC02SStageDefinition[] = [
  {
    periodIndex: 1,
    lessonId: "les_fin_g4_p01",
    lessonCode: "TC04S.01.0001",
    lessonName: "Những lựa chọn của em",
    topicId: "top_fin_g4_1",
    topicCode: "TC04S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Làm chủ lựa chọn",
    creativeZoneName: "Vùng 1: Quảng Trường Ba Câu Hỏi Thông Thái",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 10, y: 72 },
    criteria: [
      { code: "TC04S.01.0001.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được số tiền mình có là hữu hạn và không thể đáp ứng tất cả các nhu cầu chi tiêu cùng lúc." },
      { code: "TC04S.01.0001.02", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được nhu cầu cần thiết và mong muốn cá nhân; biết sắp xếp thứ tự ưu tiên khi sử dụng tiền." },
      { code: "TC04S.01.0001.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Nêu được lí do lựa chọn hoặc từ chối một khoản chi trong tình huống cụ thể, phù hợp với số tiền hiện có." },
      { code: "TC04S.01.0001.04", level: "Mức 2", competencyGroup: "Biết", description: "Biết lựa chọn phương án sử dụng tiền hợp lí trong các tình huống gần gũi với cuộc sống hằng ngày." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Ở lớp 4, em nhận ra số tiền luôn hữu hạn trong khi danh sách món đồ muốn mua lại rất dài! Hãy giúp chim Sky-Line sắp xếp thứ tự ưu tiên cho chuyến học tập dã ngoại của lớp nhé!",
      worldLocationName: "Cổng Ưu Tiên Nguồn Lực",
      mascotGuideTip: "Khi ngân sách hữu hạn, chọn một món đồ nghĩa là phải chấp nhận từ bỏ món đồ khác kém ưu tiên hơn (chi phí cơ hội)!",
      parentCompanionTip: "Trao đổi với con vì sao gia đình cần lập thứ tự ưu tiên chi tiêu trong tháng thay vì mua tất cả mọi thứ cùng lúc.",
      mode: "NEED_VS_WANT",
      context1Title: "Ngân sách chuẩn bị cho buổi học ngoại khóa Sinh học",
      context1Subtitle: "Phân loại các khoản chi Ưu tiên cấp thiết (Nhóm A) và Khoản chi có thể từ chối/hoãn lại (Nhóm B)",
      groupAName: "Ưu tiên chọn mua ngay (Cần thiết) ✅",
      groupBName: "Từ chối / Hoãn lại vì ngân sách hữu hạn ⏸️",
      items1: [
        { id: "g4_s1_1", name: "Sổ ghi chép thực địa & kính lúp học tập", emoji: "🔍", correctGroup: "GROUP_A", contextReason: "Phục vụ trực tiếp nhiệm vụ học tập bắt buộc của buổi ngoại khóa." },
        { id: "g4_s1_2", name: "Bình nước uống & mũ rộng vành chống nắng", emoji: "👒", correctGroup: "GROUP_A", contextReason: "Đảm bảo sức khỏe suốt buổi hoạt động ngoài trời." },
        { id: "g4_s1_3", name: "Kính mát thời trang gắn đèn LED", emoji: "🕶️", correctGroup: "GROUP_B", contextReason: "Chỉ mang tính giải trí nhất thời, tốn ngân sách." },
        { id: "g4_s1_4", name: "Bộ tượng nhựa trang trí bàn học", emoji: "🗿", correctGroup: "GROUP_B", contextReason: "Không liên quan đến buổi ngoại khóa và làm vượt ngân sách." }
      ],
      questionPrompt: "Vì sao khi sử dụng tiền, chúng ta luôn phải lựa chọn và sắp xếp thứ tự ưu tiên?",
      correctOptionText: "Vì số tiền hiện có là hữu hạn nên không thể mua tất cả cùng lúc; ưu tiên nhu cầu thiết yếu giúp sử dụng tiền hiệu quả nhất.",
      correctFeedback: "Chính xác! Hiểu được tính hữu hạn của tiền bạc là bước đầu tiên của tư duy quản lý tài nguyên.",
      wrongOptionText: "Vì cứ thích món nào nhìn thấy đầu tiên thì mua món đó.",
      wrongFeedback: "Mua theo ngẫu hứng sẽ khiến em hết tiền khi cần mua món đồ thiết yếu!"
    })
  },
  {
    periodIndex: 2,
    lessonId: "les_fin_g4_p02",
    lessonCode: "TC04S.01.0002",
    lessonName: "Tiêu ngay hay tiết kiệm đây?",
    topicId: "top_fin_g4_1",
    topicCode: "TC04S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Làm chủ lựa chọn",
    creativeZoneName: "Vùng 1: Quảng Trường Ba Câu Hỏi Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 18, y: 60 },
    criteria: [
      { code: "TC04S.01.0002.05", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được mong muốn trước mắt với mục tiêu cần thời gian tích lũy để thực hiện." },
      { code: "TC04S.01.0002.06", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được lợi ích của tiết kiệm, biết rằng chờ đợi có thể giúp đạt được mục tiêu lớn hơn." },
      { code: "TC04S.01.0002.07", level: "Mức 2", competencyGroup: "Biết", description: "Biết cân nhắc, lựa chọn giữa việc sử dụng tiền ngay và dành tiền cho mục tiêu trong tương lai." },
      { code: "TC04S.01.0002.08", level: "Mức 2", competencyGroup: "Biết", description: "Biết hạn chế chi tiêu theo sở thích nhất thời, kiên trì thực hiện kế hoạch tiết kiệm đã đề ra." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Em đang có 50 nghìn đồng tiền thưởng! Trước mắt là những món quà vặt hấp dẫn, nhưng phía trước là mục tiêu mua Bộ lắp ráp Khoa học STEAM giá trị cao hơn. Em sẽ phân bổ thế nào?",
      worldLocationName: "Cầu Cân Bằng Hiện Tại & Tương Lai",
      mascotGuideTip: "Biết kiềm chế sở thích nhất thời và kiên nhẫn tích lũy sẽ giúp em chạm tới mục tiêu lớn hơn rất nhiều!",
      parentCompanionTip: "Kể cho con nghe thí nghiệm 'Kẹo dẻo Marshmallow' về sức mạnh của sự kiên nhẫn chờ đợi mục tiêu lớn.",
      mode: "SAVINGS_PIGGY_PLAN",
      totalCoins: 50,
      jars: [
        { id: "g4_s2_now", name: "Chi tiêu cần thiết hiện tại", emoji: "📒", minCoins: 10, maxCoins: 20, description: "Mua bổ sung ruột bút và nhãn vở cần ngay" },
        { id: "g4_s2_save", name: "Tích lũy cho mục tiêu lớn tương lai", emoji: "🚀", minCoins: 25, maxCoins: 35, description: "Dành phần lớn để sớm đạt Bộ lắp ráp STEAM" },
        { id: "g4_s2_reserve", name: "Quỹ dự phòng nhỏ", emoji: "🛡️", minCoins: 5, maxCoins: 12, description: "Dự phòng tình huống phát sinh" }
      ],
      goals: [
        { id: "g4_goal_steam", name: "Bộ lắp ráp mạch điện STEAM Khối 4 (100 nghìn)", emoji: "⚡", targetCoins: 100, weeksSuggested: 3, ageAppropriate: true, feedback: "Mục tiêu tuyệt vời! Kiên nhẫn tích lũy giúp em sở hữu bộ học tập giá trị lâu dài." },
        { id: "g4_goal_snack", name: "Tiêu hết ngay vào trà sữa và bánh tráng (50 nghìn)", emoji: "🧋", targetCoins: 50, weeksSuggested: 1, ageAppropriate: false, feedback: "Sở thích nhất thời sẽ trôi qua rất nhanh và làm em lỡ mất mục tiêu lớn!" }
      ],
      twistPrompt: "Khi đã tích lũy được 70/100 nghìn cho Bộ lắp ráp STEAM, một người bạn rủ em dùng 40 nghìn đi mua thú nhồi bông đang hot. Em chọn phương án nào?",
      twistCorrectText: "Kiên trì giữ vững 70 nghìn trong quỹ tiết kiệm vì chỉ cần cố gắng thêm một chút nữa là đạt được Bộ lắp ráp STEAM mơ ước!",
      twistCorrectFeedback: "Tuyệt vời! Sự kiên định trước cám dỗ nhất thời giúp em đạt thành quả lớn.",
      twistWrongText: "Rút 40 nghìn mua thú bông ngay vì không muốn chờ đợi.",
      twistWrongFeedback: "Chi tiêu theo sở thích nhất thời sẽ khiến kế hoạch tích lũy của em phải làm lại từ đầu!"
    })
  },
  {
    periodIndex: 3,
    lessonId: "les_fin_g4_p03",
    lessonCode: "TC04S.01.0003",
    lessonName: "Ba câu hỏi trước khi mở ví",
    topicId: "top_fin_g4_1",
    topicCode: "TC04S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Làm chủ lựa chọn",
    creativeZoneName: "Vùng 1: Quảng Trường Ba Câu Hỏi Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 26, y: 48 },
    criteria: [
      { code: "TC04S.01.0003.09", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết vận dụng ba câu hỏi để cân nhắc trước khi quyết định mua một món đồ." },
      { code: "TC04S.01.0003.10", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được những món đồ thực sự cần thiết với những món đồ có thể chưa cần mua." },
      { code: "TC04S.01.0003.11", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết dừng lại, xem xét nhu cầu và cân nhắc trước khi sử dụng tiền." },
      { code: "TC04S.01.0003.12", level: "Mức 2", competencyGroup: "Biết", description: "Lựa chọn được phương án mua hoặc chưa mua phù hợp, đồng thời giải thích được lí do lựa chọn." },
      { code: "TC04S.01.0003.13", level: "Mức 2", competencyGroup: "Biết", description: "Biết sử dụng ba câu hỏi để đánh giá một tình huống mua sắm gần gũi trong cuộc sống." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Bí kíp vàng của nhà thông thái Khối 4 là dừng lại 5 giây và tự hỏi 'Ba câu hỏi trước khi mở ví': (1) Mình có thực sự cần không? (2) Ở nhà đã có món tương tự chưa? (3) Có nằm trong ngân sách không?",
      worldLocationName: "Trạm Kiểm Soát Ba Câu Hỏi",
      mascotGuideTip: "Chỉ mở ví khi món đồ vượt qua cả 3 câu hỏi kiểm tra!",
      parentCompanionTip: "Cùng con nhẩm '3 câu hỏi trước khi mở ví' mỗi khi con đứng trước quầy văn phòng phẩm hoặc đồ chơi.",
      mode: "NEED_VS_WANT",
      context1Title: "Kiểm tra giỏ hàng bằng 'Ba câu hỏi trước khi mở ví'",
      context1Subtitle: "Đưa món đồ Đạt cả 3 câu hỏi vào Giỏ Mua (Nhóm A) và món Chưa đạt vào Khay Để Lại Kệ (Nhóm B)",
      groupAName: "Đạt 3 câu hỏi -> Quyết định Mua 🛒",
      groupBName: "Chưa đạt -> Đặt lại lên kệ 🛑",
      items1: [
        { id: "g4_s3_1", name: "Quyển Tập bản đồ Địa lý lớp 4 (Cần cho môn học, ở nhà chưa có, đúng giá 15K)", emoji: "🗺️", correctGroup: "GROUP_A", contextReason: "Vượt qua cả 3 câu hỏi: Cần thiết, chưa có ở nhà và phù hợp ngân sách." },
        { id: "g4_s3_2", name: "Hộp màu nước mới khi hộp màu ở nhà vẫn còn nguyên 12 màu", emoji: "🎨", correctGroup: "GROUP_B", contextReason: "Không qua câu hỏi số 2: Ở nhà đã có món tương tự còn dùng tốt." },
        { id: "g4_s3_3", name: "Bút xóa kéo chính hãng thay chiếc cũ đã hết băng", emoji: "🖊️", correctGroup: "GROUP_A", contextReason: "Thực sự cần cho việc học, chiếc cũ đã hết và giá vừa túi tiền." },
        { id: "g4_s3_4", name: "Con quay kim loại giá 120K vượt gấp đôi số tiền trong ví", emoji: "🌀", correctGroup: "GROUP_B", contextReason: "Không qua câu hỏi 1 (không thiết yếu) và câu hỏi 3 (vượt ngân sách)." }
      ],
      questionPrompt: "Nội dung đầy đủ của quy tắc 'Ba câu hỏi trước khi mở ví' là gì?",
      correctOptionText: "1. Mình có thực sự cần món đồ này không? 2. Ở nhà mình đã có món đồ nào thay thế được chưa? 3. Giá của nó có phù hợp với số tiền mình đang có không?",
      correctFeedback: "Hoàn hảo! Ghi nhớ 3 câu hỏi này sẽ giúp em không bao giờ lãng phí tiền vào những món đồ dư thừa.",
      wrongOptionText: "1. Món này có đẹp không? 2. Bạn bè có khen không? 3. Có được tặng quà kèm không?",
      wrongFeedback: "Đó là những câu hỏi dễ dẫn đến mua sắm cảm tính đấy!"
    })
  },
  {
    periodIndex: 4,
    lessonId: "les_fin_g4_p04",
    lessonCode: "TC04S.01.0004",
    lessonName: "Thử tài nhà mua sắm thông minh",
    topicId: "top_fin_g4_1",
    topicCode: "TC04S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Làm chủ lựa chọn",
    creativeZoneName: "Vùng 1: Quảng Trường Ba Câu Hỏi Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 35, y: 62 },
    criteria: [
      { code: "TC04S.01.0004.14", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết so sánh các sản phẩm dựa trên giá bán, chất lượng và mức độ phù hợp với nhu cầu." },
      { code: "TC04S.01.0004.15", level: "Mức 2", competencyGroup: "Biết", description: "Lựa chọn được sản phẩm cần mua trong giới hạn ngân sách được giao, không vượt quá số tiền cho phép." },
      { code: "TC04S.01.0004.16", level: "Mức 2", competencyGroup: "Biết", description: "Trình bày được lí do lựa chọn sản phẩm dựa trên giá cả, chất lượng, nhu cầu và ngân sách." },
      { code: "TC04S.01.0004.17", level: "Mức 2", competencyGroup: "Biết", description: "Hoàn thành thử thách mua sắm tại “siêu thị mini”, lựa chọn sản phẩm hợp lí và sử dụng ngân sách hiệu quả." },
      { code: "TC04S.01.0004.18", level: "Mức 3", competencyGroup: "Vận dụng", description: "Biết cân nhắc các phương án, đưa ra quyết định mua sắm có căn cứ và đề xuất được nguyên tắc mua sắm thông minh cho nhóm." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Chào mừng đến Siêu Thị Mini Khối 4! Nhóm của em có ngân sách 60 nghìn đồng để chuẩn bị cho góc học tập và chăm sóc sức khỏe. Hãy so sánh giá bán, chất lượng và chọn giỏ hàng tối ưu nhất nhé!",
      worldLocationName: "Siêu Thị Mini Thông Thái",
      mascotGuideTip: "Hãy chọn ít nhất 2 sản phẩm chất lượng cao đáp ứng đủ nhu cầu Học tập (STUDY) và Dinh dưỡng (FOOD_HEALTHY) trong ngân sách 60 nghìn!",
      parentCompanionTip: "Cho con tự cầm 50.000đ–60.000đ trong siêu thị để chọn mua 2 món đồ học tập và đồ ăn sáng cho ngày hôm sau.",
      shopName: "Siêu Thị Mini Khối 4 (Ngân sách: 60 nghìn đồng)",
      walletBudget: 60,
      minRequiredItems: 2,
      requiredNeedTags: ["STUDY", "FOOD_HEALTHY"],
      requireQualityCheck: true,
      items: [
        { id: "g4_s4_file", name: "Bìa đựng bài kiểm tra 20 lá bền đẹp (25 nghìn)", icon: "📁", price: 25, needTag: "STUDY", qualityLabel: "Nhựa PP dày, dùng cả năm", isHighQuality: true, description: "Giữ bài kiểm tra phẳng phiu" },
        { id: "g4_s4_milk_pack", name: "Lốc sữa tươi ít đường giàu canxi (30 nghìn)", icon: "🥛", price: 30, needTag: "FOOD_HEALTHY", qualityLabel: "Hạn sử dụng mới, giàu dinh dưỡng", isHighQuality: true, description: "Tốt cho chiều cao lớp 4" },
        { id: "g4_s4_cheap_file", name: "Bìa nhựa mỏng rách mép giảm giá (15 nghìn)", icon: "📄", price: 15, needTag: "STUDY", qualityLabel: "Hàng lỗi dễ rách", isHighQuality: false, description: "Rẻ nhưng nhanh hỏng" },
        { id: "g4_s4_slime", name: "Hộp chất nhờn ma quái Slime mùi nồng (35 nghìn)", icon: "🧪", price: 35, needTag: "TOY_WANT", qualityLabel: "Không rõ thành phần hóa học", isHighQuality: false, description: "Không cần thiết và kém an toàn" }
      ],
      changePrompt: "Giỏ hàng chuẩn gồm Bìa đựng bài kiểm tra (25K) + Lốc sữa tươi (30K) = 55K. Đưa 60K, tiền thừa trả lại là 5K.",
      itemTotalExample: 55,
      coinGivenExample: 60,
      correctChange: 5,
      shopkeeperGivenChange: 5,
      politeCorrectText: "Kiểm tra chất lượng sản phẩm, hạn sử dụng, nhận 5.000đ tiền thừa và cảm ơn nhân viên thu ngân!",
      politeCorrectFeedback: "Hoàn hảo! Nhóm em đã vượt qua thử thách Siêu thị mini một cách xuất sắc.",
      politeWrongText: "Chọn hàng lỗi giá rẻ và đồ chơi không rõ nguồn gốc.",
      politeWrongFeedback: "Nhà mua sắm thông minh luôn đặt chất lượng, độ an toàn và nhu cầu thực tế lên hàng đầu!"
    })
  },
  {
    periodIndex: 5,
    lessonId: "les_fin_g4_p05",
    lessonCode: "TC04S.02.0001",
    lessonName: "Em quản lí tiền tiêu vặt",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 44, y: 45 },
    criteria: [
      { code: "TC04S.02.0001.19", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận diện được các khoản thu và chi phổ biến trong cuộc sống hằng ngày của học sinh lớp 4." },
      { code: "TC04S.02.0001.20", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết ghi chép các khoản thu chi đơn giản." },
      { code: "TC04S.02.0001.21", level: "Mức 2", competencyGroup: "Biết", description: "Biết phân loại các khoản chi theo nhóm phù hợp, chẳng hạn: học tập, ăn uống, giải trí và tiết kiệm." },
      { code: "TC04S.02.0001.22", level: "Mức 2", competencyGroup: "Vận dụng", description: "Lập được bảng theo dõi thu, chi cá nhân đơn giản và bước đầu nhận xét được cách sử dụng tiền của bản thân." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Bước vào Học Viện Thử Thách 50.000 Đồng, nhiệm vụ đầu tiên của em là kiểm tra sổ theo dõi tiền tiêu vặt tuần này (Tổng thu: 60 nghìn đồng) và phân loại xem khoản chi nào hợp lý, khoản chi nào cần điều chỉnh nhé!",
      worldLocationName: "Phòng Phân Tích Thu – Chi Cá Nhân",
      mascotGuideTip: "Tổng các khoản đã chi là 20 + 15 + 10 = 45 nghìn đồng; số dư tiết kiệm còn lại là 60 - 45 = 15 nghìn đồng!",
      parentCompanionTip: "Hướng dẫn con chia sổ thu chi thành 4 cột: Học tập, Ăn uống, Giải trí và Tiết kiệm.",
      mode: "COIN_DIARY",
      startingCoins: 60,
      diaryEntries: [
        { id: "g4_d5_1", itemName: "Nhóm Học tập: Mua quyển sổ từ vựng Tiếng Anh", emoji: "📘", cost: 20, isNecessary: true, note: "Khoản chi học tập cần thiết" },
        { id: "g4_d5_2", itemName: "Nhóm Ăn uống: Mua bánh mì & sữa buổi xế trước giờ CLB", emoji: "🥐", cost: 15, isNecessary: true, note: "Khoản chi dinh dưỡng hợp lý" },
        { id: "g4_d5_3", itemName: "Nhóm Giải trí: Mua vòng tay phát sáng dùng 1 lần rồi hỏng", emoji: "💫", cost: 10, isNecessary: false, note: "Khoản chi giải trí lãng phí cần cắt giảm" }
      ]
    })
  },
  {
    periodIndex: 6,
    lessonId: "les_fin_g4_p06",
    lessonCode: "TC04S.02.0002",
    lessonName: "Thử thách 50.000 đồng",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 5,
    mapCoordinates: { x: 52, y: 34 },
    criteria: [
      { code: "TC04S.02.0002.23", level: "Mức 2", competencyGroup: "Biết", description: "Lập được kế hoạch sử dụng khoản tiền cố định 50.000 đồng, xác định các khoản chi và số tiền tương ứng." },
      { code: "TC04S.02.0002.24", level: "Mức 2", competencyGroup: "Biết", description: "Biết sắp xếp thứ tự ưu tiên, dành tiền cho các nhu cầu thiết yếu trước khi chi cho sở thích cá nhân." },
      { code: "TC04S.02.0002.25", level: "Mức 2", competencyGroup: "Biết", description: "Biết điều chỉnh các khoản chi khi ngân sách hoặc nhu cầu thay đổi, đồng thời giải thích được lí do điều chỉnh." },
      { code: "TC04S.02.0002.26", level: "Mức 3", competencyGroup: "Vận dụng", description: "Trao đổi, lắng nghe ý kiến của các thành viên, thống nhất phương án sử dụng tiền và giải thích được quyết định của nhóm." }
    ],
    interactive: buildNestInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Đây là chặng tâm điểm của Khối 4: THỬ THÁCH 50.000 ĐỒNG! Em và nhóm được giao đúng 50 nghìn đồng (50 đơn vị). Hãy phân bổ vào 3 hạng mục và điều chỉnh kế hoạch khi có tình huống bất ngờ xảy ra nhé!",
      worldLocationName: "Đấu Trường Thử Thách 50.000 Đồng",
      mascotGuideTip: "Hãy phân bổ đúng tổng 50 nghìn đồng: ưu tiên Nhu cầu thiết yếu (20–30K), Tiết kiệm (12–20K) và Sở thích/Sẻ chia (5–15K)!",
      practicalPrompt: "Em hãy trình bày ngắn gọn kế hoạch sử dụng 50.000 đồng của em (mua gì, tiết kiệm bao nhiêu) và lý do điều chỉnh khi giá mặt hàng tăng nhẹ nhé!",
      parentCompanionTip: "Cuối tuần, bố mẹ có thể giao cho con 'Thử thách 50.000 đồng' thực tế tại nhà sách hoặc siêu thị.",
      mode: "ALLOCATE_JARS",
      totalCoins: 50,
      jars: [
        { id: "g4_50k_essential", name: "Khoản chi Thiết yếu & Học tập (nghìn đồng)", emoji: "🎒", minCoins: 20, maxCoins: 30, description: "Ưu tiên số 1 cho nhu cầu học tập, dinh dưỡng" },
        { id: "g4_50k_saving", name: "Khoản Tiết kiệm bắt buộc (nghìn đồng)", emoji: "🐷", minCoins: 12, maxCoins: 22, description: "Tích lũy cho mục tiêu yêu thích" },
        { id: "g4_50k_flex", name: "Sở thích nhỏ & Sẻ chia (nghìn đồng)", emoji: "🎨", minCoins: 5, maxCoins: 15, description: "Chi cho sở thích hợp lý hoặc giúp đỡ bạn" }
      ],
      twistPrompt: "Tình huống điều chỉnh: Khi đến hiệu sách, món đồ dùng học tập cần mua tăng giá thêm 5.000 đồng so với dự kiến. Với ngân sách cố định 50.000 đồng, nhóm em điều chỉnh thế nào?",
      twistCorrectText: "Giảm 5.000 đồng ở phần 'Sở thích cá nhân' để bù vào phần 'Thiết yếu & Học tập', đồng thời giữ nguyên kỷ luật khoản Tiết kiệm!",
      twistCorrectFeedback: "Tuyệt vời! Linh hoạt cắt giảm sở thích chưa cần thiết để bảo vệ nhu cầu thiết yếu và mục tiêu tiết kiệm là đỉnh cao của Thử thách 50.000 đồng!",
      twistWrongText: "Bỏ không mua đồ dùng học tập nữa mà lấy toàn bộ 50.000 đồng đi mua đồ chơi.",
      twistWrongFeedback: "Như vậy sẽ làm hỏng mục tiêu học tập quan trọng nhất của nhóm!"
    })
  },
  {
    periodIndex: 7,
    lessonId: "les_fin_g4_p07",
    lessonCode: "TC04S.02.0003",
    lessonName: "Tiết kiệm cho điều em yêu thích",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 60, y: 48 },
    criteria: [
      { code: "TC04S.02.0003.27", level: "Mức 1", competencyGroup: "Hiểu", description: "Xác định được mục tiêu tiết kiệm cụ thể, phù hợp với nhu cầu và khả năng của bản thân." },
      { code: "TC04S.02.0003.28", level: "Mức 2", competencyGroup: "Biết", description: "Tính được số tiền cần tiết kiệm, số tiền dành dụm theo từng ngày hoặc tuần và thời gian dự kiến để đạt mục tiêu." },
      { code: "TC04S.02.0003.29", level: "Mức 2", competencyGroup: "Biết", description: "Lập được kế hoạch tiết kiệm với mức tiền và thời gian phù hợp với điều kiện thực tế." },
      { code: "TC04S.02.0003.30", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được những việc cần làm để duy trì kế hoạch, hạn chế các khoản chi chưa cần thiết." },
      { code: "TC04S.02.0003.31", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thể hiện ý thức tuân thủ kế hoạch, kiên trì tiết kiệm và có trách nhiệm với mục tiêu đã đặt ra." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Em muốn mua một món đồ mình yêu thích trị giá 80 nghìn đồng trong 4 tuần (mỗi tuần tiết kiệm 20 nghìn đồng). Hãy lập lộ trình tích lũy 80 nghìn đồng và giữ vững kỷ luật nhé!",
      worldLocationName: "Tháp Mục Tiêu 4 Tuần",
      mascotGuideTip: "Mục tiêu 80 nghìn đồng chia cho 4 tuần = 20 nghìn đồng/tuần. Hãy phân bổ đều và kiên trì thực hiện!",
      parentCompanionTip: "Hướng dẫn con công thức: Thời gian hoàn thành = Số tiền mục tiêu ÷ Số tiền tiết kiệm mỗi tuần.",
      mode: "SAVINGS_PIGGY_PLAN",
      totalCoins: 80,
      jars: [
        { id: "g4_w1_2", name: "Giai đoạn 1 (Tuần 1 & Tuần 2)", emoji: "🌱", minCoins: 35, maxCoins: 45, description: "Tích lũy 20K/tuần -> đạt khoảng 40K sau 2 tuần" },
        { id: "g4_w3", name: "Giai đoạn 2 (Tuần 3)", emoji: "🌿", minCoins: 15, maxCoins: 25, description: "Tiếp tục tiết kiệm thêm 20K ở tuần thứ 3" },
        { id: "g4_w4", name: "Giai đoạn về đích (Tuần 4)", emoji: "🌳", minCoins: 15, maxCoins: 25, description: "Hoàn thành đủ 80K để rước món đồ yêu thích!" }
      ],
      goals: [
        { id: "g4_fav_globe", name: "Quả địa cầu phát sáng học Địa lý (80 nghìn - 4 tuần)", emoji: "🌍", targetCoins: 80, weeksSuggested: 4, ageAppropriate: true, feedback: "Kế hoạch rất rõ ràng: 80.000đ ÷ 20.000đ/tuần = 4 tuần!" },
        { id: "g4_fav_skate", name: "Ván trượt thể thao an toàn (80 nghìn - 4 tuần)", emoji: "🛹", targetCoins: 80, weeksSuggested: 4, ageAppropriate: true, feedback: "Mục tiêu rèn luyện sức khỏe rất hợp lý!" }
      ],
      twistPrompt: "Ở tuần thứ 3, nếu em lỡ tiêu mất 10 nghìn đồng tiền tiết kiệm vào nước ngọt, điều gì sẽ xảy ra với kế hoạch 80 nghìn đồng?",
      twistCorrectText: "Thời gian đạt mục tiêu sẽ bị kéo dài thêm hoặc tuần thứ 4 em phải cắt giảm chi tiêu khác để bù lại 10 nghìn đồng đã tiêu lẹm.",
      twistCorrectFeedback: "Chính xác! Em đã tính toán rất rõ mối liên hệ giữa mức tiết kiệm mỗi tuần và thời gian hoàn thành mục tiêu.",
      twistWrongText: "Không ảnh hưởng gì cả, tiền trong heo đất tự sinh ra thêm.",
      twistWrongFeedback: "Tiền tiết kiệm chỉ đầy lên khi chúng ta tuân thủ kỷ luật tích lũy mỗi tuần!"
    })
  },
  {
    periodIndex: 8,
    lessonId: "les_fin_g4_p08",
    lessonCode: "TC04S.02.0004",
    lessonName: "Nhật ký chi tiêu thông minh",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 67, y: 60 },
    criteria: [
      { code: "TC04S.02.0004.32", level: "Mức 1", competencyGroup: "Hiểu", description: "Ghi chép đầy đủ các khoản thu và chi trong khoảng thời gian quy định, đảm bảo thông tin rõ ràng, chính xác." },
      { code: "TC04S.02.0004.33", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận xét được cách sử dụng tiền của bản thân dựa trên bảng theo dõi thu, chi." },
      { code: "TC04S.02.0004.34", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được những khoản chi chưa cần thiết hoặc chưa phù hợp với mục tiêu và khả năng tài chính của bản thân." },
      { code: "TC04S.02.0004.35", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đưa ra được các biện pháp cụ thể nhằm điều chỉnh thói quen chi tiêu, tiết kiệm và sử dụng tiền hiệu quả hơn." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Hãy cùng chim Sky-Line rà soát cuốn Nhật Ký Chi Tiêu Thông Minh với ngân sách đầu kỳ là 80 nghìn đồng. Hãy tính tổng số tiền đã chi, số tiền còn lại và chỉ ra các khoản chi chưa hợp lý để điều chỉnh nhé!",
      worldLocationName: "Thư Viện Nhật Ký Tài Chính",
      mascotGuideTip: "Tổng các khoản đã chi là 25 + 15 + 15 + 10 = 65 nghìn đồng. Số tiền còn lại là 80 - 65 = 15 nghìn đồng!",
      parentCompanionTip: "Cuối mỗi tháng, cùng con đọc lại Nhật ký chi tiêu để tìm ra 1 khoản chi có thể tiết kiệm hơn trong tháng sau.",
      mode: "COIN_DIARY",
      startingCoins: 80,
      diaryEntries: [
        { id: "g4_d8_1", itemName: "Mua bộ sách bài tập Toán & Tiếng Việt nâng cao", emoji: "📚", cost: 25, isNecessary: true, note: "Đầu tư thiết thực cho việc học" },
        { id: "g4_d8_2", itemName: "Đóng góp quỹ kế hoạch nhỏ của Liên đội", emoji: "🌱", cost: 15, isNecessary: true, note: "Hoạt động tập thể ý nghĩa" },
        { id: "g4_d8_3", itemName: "Mua sticker dán hình thần tượng trùng với bộ đã có", emoji: "🌟", cost: 15, isNecessary: false, note: "Khoản chi trùng lặp, chưa cần thiết" },
        { id: "g4_d8_4", itemName: "Mua đồ chơi nhựa theo trào lưu rồi bỏ xó", emoji: "🪀", cost: 10, isNecessary: false, note: "Chi tiêu bốc đồng cần cắt giảm" }
      ]
    })
  },
  {
    periodIndex: 9,
    lessonId: "les_fin_g4_p09",
    lessonCode: "TC04S.02.0005",
    lessonName: "Em là người mua hàng thông thái",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 74, y: 44 },
    criteria: [
      { code: "TC04S.02.0005.36", level: "Mức 1", competencyGroup: "Hiểu", description: "Đọc đúng giá bán, biết so sánh giá giữa các sản phẩm cùng loại." },
      { code: "TC04S.02.0005.37", level: "Mức 2", competencyGroup: "Biết", description: "Lựa chọn được sản phẩm đáp ứng nhu cầu sử dụng và phù hợp với khả năng chi trả của bản thân." },
      { code: "TC04S.02.0005.38", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết xem xét giá cả, chất lượng, số lượng và lợi ích sử dụng để đưa ra lựa chọn phù hợp." },
      { code: "TC04S.02.0005.39", level: "Mức 2", competencyGroup: "Biết", description: "Trình bày được lí do lựa chọn sản phẩm dựa trên các tiêu chí đã xác định." },
      { code: "TC04S.02.0005.40", level: "Mức 3", competencyGroup: "Vận dụng", description: "Biết phân tích, cân nhắc trước khi mua và đề xuất được các nguyên tắc mua hàng thông thái." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Tại Trung Tâm Mua Sắm Thông Thái, em có ngân sách 70 nghìn đồng. Hãy đọc kỹ bảng giá, so sánh chất lượng, số lượng và lợi ích sử dụng để chọn được sản phẩm tối ưu nhất nhé!",
      worldLocationName: "Trung Tâm So Sánh Tiêu Dùng",
      mascotGuideTip: "Hãy so sánh cả đơn giá theo số lượng và độ bền: một sản phẩm bền tốt, rõ nguồn gốc luôn tiết kiệm hơn món đồ hào nhoáng nhưng mau hỏng!",
      parentCompanionTip: "Hướng dẫn con cách tính giá trên mỗi đơn vị sản phẩm (ví dụ lốc 4 hộp so với mua lẻ từng hộp).",
      shopName: "Trung Tâm Mua Sắm Khối 4 (Ngân sách: 70 nghìn đồng)",
      walletBudget: 70,
      minRequiredItems: 2,
      requiredNeedTags: ["STUDY", "ESSENTIAL"],
      requireQualityCheck: true,
      items: [
        { id: "g4_s9_notebooks", name: "Combo 5 quyển vở 96 trang định lượng dày (35 nghìn - tính ra 7K/quyển)", icon: "📓", price: 35, needTag: "STUDY", qualityLabel: "Tiết kiệm theo combo, giấy dày", isHighQuality: true, description: "Lợi ích sử dụng cao và tiết kiệm" },
        { id: "g4_s9_bottle", name: "Bình nước nhựa nguyên sinh an toàn BPA-free (30 nghìn)", icon: "🍶", price: 30, needTag: "ESSENTIAL", qualityLabel: "Nhựa an toàn sức khỏe, bền", isHighQuality: true, description: "Dùng hằng ngày ở trường" },
        { id: "g4_s9_single_nb", name: "1 quyển vở bìa kim tuyến mỏng (25 nghìn/1 quyển)", icon: "✨", price: 25, needTag: "STUDY", qualityLabel: "Đắt gấp 3 lần vì vỏ kim tuyến", isHighQuality: false, description: "Ít trang, giá cao" },
        { id: "g4_s9_cheap_cup", name: "Cốc nhựa tái chế có mùi nhựa nồng (20 nghìn)", icon: "🥤", price: 20, needTag: "ESSENTIAL", qualityLabel: "Không có ký hiệu an toàn thực phẩm", isHighQuality: false, description: "Nguy cơ hại sức khỏe" }
      ],
      changePrompt: "Chọn Combo 5 quyển vở (35K) + Bình nước an toàn (30K) = 65K. Đưa 70K, tiền trả lại là 5K.",
      itemTotalExample: 65,
      coinGivenExample: 70,
      correctChange: 5,
      shopkeeperGivenChange: 5,
      politeCorrectText: "Em kiểm tra tem chất lượng BPA-free, nhận lại 5.000đ tiền thừa và cảm ơn cô bán hàng!",
      politeCorrectFeedback: "Tuyệt vời! Em đã biết kết hợp so sánh giá bán, số lượng và tiêu chuẩn an toàn sức khỏe.",
      politeWrongText: "Mua 1 quyển vở kim tuyến đắt đỏ và cốc nhựa có mùi nồng.",
      politeWrongFeedback: "Hãy luôn so sánh số lượng, chất lượng và độ an toàn trước khi quyết định mua!"
    })
  },
  {
    periodIndex: 10,
    lessonId: "les_fin_g4_p10",
    lessonCode: "TC04S.02.0006",
    lessonName: "Những chiếc bẫy mua sắm",
    topicId: "top_fin_g4_2",
    topicCode: "TC04S.02",
    officialTopicName: "Chủ đề 2. Quản lí tiền cá nhân – Xây dựng thói quen tài chính tốt",
    creativeZoneName: "Vùng 2: Học Viện Thử Thách 50.000 Đồng",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 81, y: 32 },
    criteria: [
      { code: "TC04S.02.0006.41", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được ảnh hưởng của quảng cáo, khuyến mãi và xu hướng bạn bè đến lựa chọn mua hàng của bản thân." },
      { code: "TC04S.02.0006.42", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được một số nguyên nhân dẫn đến mua sắm bốc đồng như thích thú nhất thời, bị thu hút bởi quảng cáo hoặc muốn làm theo bạn bè." },
      { code: "TC04S.02.0006.43", level: "Mức 2", competencyGroup: "Biết", description: "Biết cân nhắc và từ chối những món đồ chưa cần thiết, dù được quảng cáo hấp dẫn hoặc bạn bè khuyến khích mua." },
      { code: "TC04S.02.0006.44", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đề xuất được các nguyên tắc mua sắm phù hợp với nhu cầu, ngân sách và mục tiêu tiết kiệm của bản thân." },
      { code: "TC04S.02.0006.45", level: "Mức 3", competencyGroup: "Vận dụng", description: "Biết suy nghĩ trước khi mua, cân nhắc lợi ích và đưa ra quyết định phù hợp trong các tình huống thực tế." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Trên Đại Lộ Quảng Cáo, có rất nhiều 'chiếc bẫy mua sắm' khiến chúng ta dễ mua bốc đồng theo lời quảng cáo, khuyến mãi ảo hoặc hiệu ứng đám đông. Hãy giúp chim Sky-Line nhận diện và vượt qua nhé!",
      worldLocationName: "Đại Lộ Giải Mã Bẫy Mua Sắm",
      mascotGuideTip: "Đừng mua một món đồ chỉ vì nó đang 'giảm giá sốc' hoặc 'ai trong nhóm cũng có' nếu bản thân em không thực sự cần!",
      parentCompanionTip: "Chia sẻ với con về tâm lý FOMO (sợ bị bỏ lỡ) khi thấy biển 'Chỉ còn 1 ngày khuyến mãi'.",
      mode: "AD_DETECTIVE",
      startingCoins: 50,
      adBillboards: [
        {
          id: "g4_ad_1",
          productName: "Móc khóa blind-box (túi mù) theo trào lưu (Giá 45 nghìn/hộp)",
          emoji: "🎁",
          price: 45,
          adSlogan: "Cả trường đang săn lùng! Mở hộp trúng nhân vật bí ẩn ngay!",
          hookType: "FLASHY_IMAGE",
          hookLabel: "Hiệu ứng đám đông & kích thích tò mò may rủi",
          matchesStudentNeed: false,
          fitsWallet: true,
          shouldBuy: false,
          explanation: "Đây là bẫy mua sắm theo trào lưu và cảm xúc nhất thời, dễ làm cạn tiền tiết kiệm."
        },
        {
          id: "g4_ad_2",
          productName: "Combo 3 gói bim bim khổng lồ tặng hình dán (Giá 40 nghìn)",
          emoji: "🍟",
          price: 40,
          adSlogan: "Mua 2 tặng 1, sưu tầm trọn bộ sticker thần tượng!",
          hookType: "GIFT_BONUS",
          hookLabel: "Chiêu khuyến mãi tặng quà kèm để bán nhiều hàng hơn",
          matchesStudentNeed: false,
          fitsWallet: true,
          shouldBuy: false,
          explanation: "Bẫy quà tặng kèm khiến em mua nhiều đồ ăn vặt không tốt cho sức khỏe."
        },
        {
          id: "g4_ad_3",
          productName: "Từ điển Tiếng Anh minh họa lớp 4 (Giá 35 nghìn)",
          emoji: "📙",
          price: 35,
          adSlogan: "Chuẩn chương trình học lớp 4, tra cứu từ vựng nhanh chóng!",
          hookType: "GENUINE_QUALITY",
          hookLabel: "Thông tin công dụng học tập rõ ràng, thiết thực",
          matchesStudentNeed: true,
          fitsWallet: true,
          shouldBuy: true,
          explanation: "Sản phẩm phục vụ đúng nhu cầu học tập, chất lượng tốt và vừa ngân sách."
        }
      ]
    })
  },
  {
    periodIndex: 11,
    lessonId: "les_fin_g4_p11",
    lessonCode: "TC04S.03.0001",
    lessonName: "Đồng tiền biết sẻ chia",
    topicId: "top_fin_g4_3",
    topicCode: "TC04S.03",
    officialTopicName: "Chủ đề 3. Đồng tiền có trách nhiệm – Sáng tạo và sẻ chia",
    creativeZoneName: "Vùng 3: Phố Hội Gian Hàng Nhí Sáng Tạo",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 88, y: 22 },
    criteria: [
      { code: "TC04S.03.0001.46", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được ý nghĩa của việc sử dụng tiền để giúp đỡ người khác và thực hiện những việc làm có ích cho cộng đồng." },
      { code: "TC04S.03.0001.47", level: "Mức 2", competencyGroup: "Biết", description: "Biết phân bổ một khoản tiền nhỏ hợp lí giữa chi tiêu cá nhân, tiết kiệm và hoạt động sẻ chia." },
      { code: "TC04S.03.0001.48", level: "Mức 2", competencyGroup: "Biết", description: "Đề xuất được những việc làm thiết thực, phù hợp với khả năng tài chính và hướng đến việc giúp đỡ người khác." },
      { code: "TC04S.03.0001.49", level: "Mức 3", competencyGroup: "Vận dụng", description: "Xây dựng được kế hoạch “Việc tốt từ đồng tiền nhỏ”, xác định mục đích, số tiền dự kiến, cách thực hiện và đối tượng được giúp đỡ." }
    ],
    interactive: buildNestInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Chào mừng em đến Phố Hội Sáng Tạo & Sẻ Chia! Hãy cùng chim Sky-Line xây dựng kế hoạch 'Việc tốt từ đồng tiền nhỏ' bằng cách phân bổ 50 nghìn đồng cho Chi tiêu cá nhân, Tiết kiệm và Hoạt động sẻ chia cộng đồng nhé!",
      worldLocationName: "Quảng Trường Việc Tốt Từ Đồng Tiền Nhỏ",
      mascotGuideTip: "Đồng tiền trở nên có trách nhiệm và ấm áp nhất khi được sẻ chia đúng cách, phù hợp với khả năng của em!",
      practicalPrompt: "Kế hoạch 'Việc tốt từ đồng tiền nhỏ': Em hãy nêu mục đích, số tiền dự kiến trích từ heo đất, cách thực hiện và đối tượng em muốn giúp đỡ nhé!",
      parentCompanionTip: "Đồng hành cùng con thực hiện kế hoạch 'Việc tốt từ đồng tiền nhỏ' như mua tập vở tặng tủ sách lớp học vùng cao.",
      mode: "HAPPY_SHARING",
      totalCoins: 50,
      jars: [
        { id: "g4_s11_personal", name: "Chi tiêu thiết yếu cá nhân", emoji: "📚", minCoins: 18, maxCoins: 28, description: "Đảm bảo nhu cầu học tập của bản thân" },
        { id: "g4_s11_save", name: "Tiết kiệm mục tiêu cá nhân", emoji: "🐷", minCoins: 12, maxCoins: 20, description: "Tích lũy cho kế hoạch dài hạn" },
        { id: "g4_s11_charity", name: "Quỹ 'Việc tốt từ đồng tiền nhỏ'", emoji: "💝", minCoins: 8, maxCoins: 18, description: "Mua sách vở, dụng cụ học tập tặng bạn khó khăn" }
      ],
      twistPrompt: "Khi thực hiện kế hoạch 'Việc tốt từ đồng tiền nhỏ', cách làm nào dưới đây mang lại giá trị thiết thực và tôn trọng người nhận nhất?",
      twistCorrectText: "Tìm hiểu nhu cầu thực tế của các bạn vùng khó khăn (như vở viết, bút, áo ấm), dùng khoản tiền sẻ chia chuẩn bị món quà chu đáo và trao tặng với thái độ trân trọng.",
      twistCorrectFeedback: "Thật ấm áp và sâu sắc! Cách cho đi trân trọng quý giá không kém món quà trao tặng.",
      twistWrongText: "Ủng hộ vượt quá khả năng rồi nhịn ăn sáng cả tuần.",
      twistWrongFeedback: "Sự sẻ chia bền vững luôn cần phù hợp với khả năng tài chính và sức khỏe của bản thân nhé!"
    })
  },
  {
    periodIndex: 12,
    lessonId: "les_fin_g4_p12",
    lessonCode: "TC04S.03.0002",
    lessonName: "Dự án \"Gian hàng Nhí\"",
    topicId: "top_fin_g4_3",
    topicCode: "TC04S.03",
    officialTopicName: "Chủ đề 3. Đồng tiền có trách nhiệm – Sáng tạo và sẻ chia",
    creativeZoneName: "Vùng 3: Phố Hội Gian Hàng Nhí Sáng Tạo",
    isProject: true,
    feathersReward: 6,
    badgeCode: "BADGE_TC04S_CHAMPION",
    badgeName: "Thủ Lĩnh Dự Án Gian Hàng Nhí Khối 4",
    mapCoordinates: { x: 95, y: 12 },
    criteria: [
      { code: "TC04S.03.0002.50", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được mục tiêu, yêu cầu và sản phẩm cần hoàn thành của dự án." },
      { code: "TC04S.03.0002.51", level: "Mức 2", competencyGroup: "Biết", description: "Lựa chọn được ý tưởng phù hợp với mục tiêu, ngân sách và khả năng thực hiện." },
      { code: "TC04S.03.0002.52", level: "Mức 2", competencyGroup: "Biết", description: "Nhóm xác định được số tiền dự kiến cần sử dụng và mục tiêu tài chính của dự án." },
      { code: "TC04S.03.0002.53", level: "Mức 2", competencyGroup: "Biết", description: "Nhóm lập được bảng dự toán, xác định các khoản thu, khoản chi và tổng số tiền dự kiến." },
      { code: "TC04S.03.0002.54", level: "Mức 2", competencyGroup: "Biết", description: "Biết điều chỉnh số lượng, lựa chọn sản phẩm thay thế hoặc cắt giảm khoản chi chưa cần thiết để tối ưu chi phí." },
      { code: "TC04S.03.0002.55", level: "Mức 2", competencyGroup: "Biết", description: "Nhóm hoàn thiện được kế hoạch tài chính, đảm bảo các khoản thu – chi rõ ràng, hợp lí và phù hợp với ngân sách." },
      { code: "TC04S.03.0002.56", level: "Mức 2", competencyGroup: "Biết", description: "Các thành viên phối hợp thực hiện nhiệm vụ, có trách nhiệm với phần việc được giao và hỗ trợ nhau hoàn thành sản phẩm." },
      { code: "TC04S.03.0002.57", level: "Mức 3", competencyGroup: "Vận dụng", description: "Nhóm thể hiện được sự cân nhắc về chi phí, tính khả thi và hiệu quả sử dụng nguồn lực trong sản phẩm dự án." }
    ],
    interactive: buildDiaryAdInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Chặng 12 Tổng kết Khối 4 – DỰ ÁN 'GIAN HÀNG NHÍ'! Nhóm của em có tổng vốn dự kiến 30 đơn vị (tương ứng 300.000đ) để tổ chức Gian hàng Handmade gây quỹ. Hãy lập dự toán Chi phí nguyên liệu – Dự phòng/Tiết kiệm vốn – Quỹ sẻ chia và tối ưu chi phí nhé!",
      worldLocationName: "Quảng Trường Dự Án Gian Hàng Nhí",
      mascotGuideTip: "Trong bảng tổng kết 30 đơn vị vốn: hãy phân bổ Nguyên liệu thiết yếu (khoảng 15), Dự phòng/Bảo toàn vốn (tối thiểu 8) và Quỹ từ thiện (tối thiểu 5)!",
      practicalPrompt: "Dự án 'Gian hàng Nhí': Em hãy viết tên sản phẩm gian hàng của nhóm, bảng dự toán chi phí nguyên liệu, phân công nhiệm vụ các thành viên và cách nhóm tối ưu chi phí nhé!",
      parentCompanionTip: "Khuyến khích con tận dụng vật liệu tái chế sẵn có ở nhà để trang trí gian hàng giúp tối ưu chi phí dự án.",
      mode: "MASTER_FINANCE_CAPSTONE",
      startingCoins: 30,
      diaryEntries: [
        { id: "g4_cap_1", itemName: "Chi mua nguyên liệu làm bookmark & chậu cây mini", emoji: "🪴", cost: 15, isNecessary: true, note: "Khoản chi cốt lõi tạo ra sản phẩm gian hàng" },
        { id: "g4_cap_2", itemName: "Quỹ bảo toàn vốn & dự phòng phát sinh của nhóm", emoji: "🏦", cost: 10, isNecessary: true, note: "Đảm bảo an toàn tài chính cho dự án" },
        { id: "g4_cap_3", itemName: "Trích quỹ 'Đồng tiền biết sẻ chia' ủng hộ bạn nghèo", emoji: "💝", cost: 5, isNecessary: true, note: "Mục tiêu nhân văn của Gian hàng Nhí" }
      ],
      capstoneChallenge: {
        totalBudget: 30,
        minSaveCoins: 8,
        minShareCoins: 5,
        surpriseQuestion: "Tình huống tối ưu chi phí Dự án 'Gian hàng Nhí': Một bạn trong nhóm đề xuất chi thêm 12 đơn vị tiền vốn để thuê in băng rôn nhựa cỡ lớn dùng 1 lần. Để tối ưu chi phí và bảo vệ môi trường, nhóm nên điều chỉnh thế nào?",
        surpriseOptions: [
          {
            id: "g4_proj_right",
            text: "Cắt giảm khoản thuê in băng rôn nhựa tốn kém; thay bằng việc các thành viên cùng vẽ bảng hiệu sáng tạo trên bìa carton tái chế để tiết kiệm chi phí và tăng lợi nhuận gây quỹ!",
            isCorrect: true,
            feedback: "CHÚC MỪNG THỦ LĨNH GIAN HÀNG NHÍ KHỐI 4! Nhóm em đã biết tối ưu chi phí, hợp tác nhịp nhàng và sử dụng nguồn lực cực kỳ hiệu quả!"
          },
          {
            id: "g4_proj_wrong",
            text: "Tiêu hết tiền nguyên liệu để đi in băng rôn thật to, không còn tiền làm sản phẩm bán.",
            isCorrect: false,
            feedback: "Nếu chi quá nhiều vào trang trí không cần thiết, gian hàng sẽ thiếu vốn làm sản phẩm chính!"
          }
        ]
      }
    })
  }
];

// ============================================================================
// KHỐI 5: ĐẢO TÀI CHÍNH THÔNG THÁI 5S (MÃ TC05S) - 3 VÙNG, 12 CHẶNG, 65 YCCĐ
// ============================================================================

export const TC05S_ZONES: TC02SZoneDefinition[] = [
  {
    zoneOrder: 1,
    topicId: "top_fin_g5_1",
    topicCode: "TC05S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Ra quyết định tài chính",
    creativeZoneName: "Vùng 1: Học Viện Quyết Định Tài Chính Thông Thái",
    themeColor: "#0284c7",
    accentColor: "#38bdf8",
    landscapeSubtitle: "Phân tích nhu cầu, lập cẩm nang tiêu dùng, hóa giải bẫy tài chính và làm chủ nghệ thuật lựa chọn.",
    badgeCode: "BADGE_TC05S_ZONE1",
    badgeName: "Chiến Lược Gia Tiêu Dùng Khối 5"
  },
  {
    zoneOrder: 2,
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    themeColor: "#059669",
    accentColor: "#34d399",
    landscapeSubtitle: "Lập ngân sách, vượt Thử thách 500.000đ, tiết kiệm mục tiêu lớn, thanh toán điện tử và bảo mật tài chính số.",
    badgeCode: "BADGE_TC05S_ZONE2",
    badgeName: "Hiệp Sĩ An Toàn Tài Chính Số Khối 5"
  },
  {
    zoneOrder: 3,
    topicId: "top_fin_g5_3",
    topicCode: "TC05S.03",
    officialTopicName: "Chủ đề 3: Đồng tiền tạo giá trị – Vận dụng qua dự án thực tiễn",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Dự Án Nhà Quản Lí Tài Chính Nhí",
    themeColor: "#d97706",
    accentColor: "#fbbf24",
    landscapeSubtitle: "Lan tỏa giá trị đồng tiền cho cộng đồng và hoàn thành Dự án Nhà quản lí tài chính nhí.",
    badgeCode: "BADGE_TC05S_ZONE3",
    badgeName: "Quán Quân Quản Lí Tài Chính Nhí Khối 5"
  }
];

export const TC05S_STAGES: TC02SStageDefinition[] = [
  {
    periodIndex: 1,
    lessonId: "les_fin_g5_p01",
    lessonCode: "TC05S.01.0001",
    lessonName: "Quyết định mua sắm",
    topicId: "top_fin_g5_1",
    topicCode: "TC05S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Ra quyết định tài chính",
    creativeZoneName: "Vùng 1: Học Viện Quyết Định Tài Chính Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 10, y: 78 },
    criteria: [
      { code: "TC05S.01.0001.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được các yếu tố như nhu cầu thực tế, cảm xúc, quảng cáo hoặc tác động từ bạn bè." },
      { code: "TC05S.01.0001.02", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được sự khác biệt giữa mua vì cần thiết và mua theo sở thích nhất thời." },
      { code: "TC05S.01.0001.03", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được vấn đề và phân tích được các phương án mua sắm trong tình huống cụ thể." },
      { code: "TC05S.01.0001.04", level: "Mức 3", competencyGroup: "Vận dụng", description: "Chọn được phương án đáp ứng nhu cầu và phù hợp với ngân sách." },
      { code: "TC05S.01.0001.05", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được lí do lựa chọn và xây dựng được 5 nguyên tắc trước khi chi tiền." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Chào mừng học sinh Khối 5 đến Học Viện Quyết Định Tài Chính! Hãy phân tích các yếu tố ảnh hưởng đến quyết định mua sắm (nhu cầu thực tế vs cảm xúc, quảng cáo, bạn bè) và xây dựng 5 nguyên tắc trước khi chi tiền nhé!",
      worldLocationName: "Đài Phân Tích Quyết Định Mua Sắm",
      mascotGuideTip: "Một quyết định mua sắm thông minh dựa trên nhu cầu thực tế và ngân sách, không chạy theo cảm xúc nhất thời!",
      parentCompanionTip: "Cùng con xây dựng '5 nguyên tắc vàng trước khi chi tiêu' dán ở góc học tập.",
      mode: "NEED_VS_WANT",
      context1Title: "Bối cảnh 1: Phân tích động cơ mua sắm",
      context1Subtitle: "Xếp các quyết định dựa trên Nhu cầu thực tế & Ngân sách (Nhóm A) và Mua theo cảm xúc/bạn bè/quảng cáo (Nhóm B)",
      groupAName: "Quyết định vì Nhu cầu thực tế & Hợp ngân sách ✅",
      groupBName: "Mua theo Cảm xúc nhất thời / Tác động bên ngoài ⚠️",
      items1: [
        { id: "g5_s1_1", name: "Mua máy tính bỏ túi phục vụ môn Toán đúng trong ngân sách dự kiến", emoji: "🖩", correctGroup: "GROUP_A", contextReason: "Đáp ứng đúng nhu cầu học tập thực tế và phù hợp ngân sách." },
        { id: "g5_s1_2", name: "Mua giày thể thao vừa chân thay đôi cũ đã chật để tập thể dục", emoji: "👟", correctGroup: "GROUP_A", contextReason: "Cần thiết cho sức khỏe và vận động hằng ngày." },
        { id: "g5_s1_3", name: "Mua hộp bút thứ 4 chỉ vì thấy quảng cáo phát sáng bắt mắt", emoji: "✨", correctGroup: "GROUP_B", contextReason: "Bị tác động bởi quảng cáo và cảm xúc nhất thời." },
        { id: "g5_s1_4", name: "Đòi mua mô hình đắt tiền vì thấy nhóm bạn trong lớp đều đang khoe", emoji: "🤖", correctGroup: "GROUP_B", contextReason: "Mua theo hiệu ứng đám đông dù vượt ngân sách." }
      ],
      questionPrompt: "Khi xây dựng '5 nguyên tắc trước khi chi tiền', nguyên tắc cốt lõi nào giúp em ra quyết định mua sắm đúng đắn?",
      correctOptionText: "1. Kiểm tra nhu cầu thực tế; 2. Xem ngân sách hiện có; 3. So sánh giá & chất lượng; 4. Tạm dừng trước quảng cáo/cảm xúc; 5. Ưu tiên mục tiêu tiết kiệm dài hạn.",
      correctFeedback: "Xuất sắc! Em đã nắm vững bộ 5 nguyên tắc vàng trước khi chi tiền của học sinh Khối 5!",
      wrongOptionText: "Thích gì mua nấy ngay lập tức trước khi hết hàng khuyến mãi.",
      wrongFeedback: "Mua vội vàng theo cảm xúc rất dễ làm em vượt ngân sách và mua đồ không dùng đến!"
    })
  },
  {
    periodIndex: 2,
    lessonId: "les_fin_g5_p02",
    lessonCode: "TC05S.01.0002",
    lessonName: "Người tiêu dùng thông thái",
    topicId: "top_fin_g5_1",
    topicCode: "TC05S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Ra quyết định tài chính",
    creativeZoneName: "Vùng 1: Học Viện Quyết Định Tài Chính Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 20, y: 72 },
    criteria: [
      { code: "TC05S.01.0002.06", level: "Mức 1", competencyGroup: "Hiểu", description: "Đọc và so sánh được giá của các sản phẩm." },
      { code: "TC05S.01.0002.07", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được sự khác nhau về chất lượng, công dụng hoặc lợi ích sử dụng của sản phẩm." },
      { code: "TC05S.01.0002.08", level: "Mức 2", competencyGroup: "Biết", description: "Chọn được sản phẩm phù hợp với mục đích sử dụng và ngân sách." },
      { code: "TC05S.01.0002.09", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được lí do lựa chọn dựa trên giá cả, chất lượng và nhu cầu thực tế." },
      { code: "TC05S.01.0002.10", level: "Mức 3", competencyGroup: "Vận dụng", description: "Hoàn thiện được cẩm nang người tiêu dùng thông thái với những nguyên tắc phù hợp." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Hoàn thiện Cẩm nang Người tiêu dùng thông thái! Em có ngân sách 25 Xu để chuẩn bị đồ dùng cho câu lạc bộ Khoa học & Đọc sách. Hãy đọc kỹ giá, so sánh chất lượng, công dụng và chọn ít nhất 2 sản phẩm thiết yếu sao cho tiết kiệm ít nhất 5 Xu!",
      worldLocationName: "Trung Tâm Đối Chiếu Chất Lượng & Giá Cả",
      mascotGuideTip: "Đừng chọn sản phẩm đắt vì thương hiệu phô trương hay quá rẻ nhưng kém bền; hãy chọn sản phẩm bền, đúng công dụng và hợp ngân sách!",
      parentCompanionTip: "Hướng dẫn con đọc thông số kỹ thuật, hạn sử dụng và xuất xứ khi mua đồ dùng học tập.",
      budgetCoins: 25,
      minRequiredEssentialCount: 2,
      minTotalItems: 2,
      maxTotalItems: 3,
      targetChangeCoins: 5,
      products: [
        { id: "g5_s2_1", name: "Kính lúp học tập tiêu chuẩn (Thấu kính rõ nét, bền, giá hợp lý)", emoji: "🔍", price: 10, tag: "ESSENTIAL", qualityNote: "Đúng công dụng thực hành Khoa học, chất lượng tốt" },
        { id: "g5_s2_2", name: "Sổ tay nghiên cứu bìa cứng 120 trang giấy chống lóa", emoji: "📓", price: 8, tag: "ESSENTIAL", qualityNote: "Bền đẹp, dùng được cả năm học" },
        { id: "g5_s2_3", name: "Bút bi gel mực đều (Bộ 2 cây chính hãng)", emoji: "🖊️", price: 2, tag: "ESSENTIAL", qualityNote: "Giá hợp lý, chất lượng ổn định" },
        { id: "g5_s2_4", name: "Kính lúp mạ kim tuyến trang trí (Nặng, dễ trầy, giá đắt)", emoji: "✨", price: 19, tag: "LUXURY", qualityNote: "Giá cao do trang trí nhưng công dụng kém" },
        { id: "g5_s2_5", name: "Đồ chơi con quay phát nhạc ngoài danh mục học tập", emoji: "🪀", price: 9, tag: "IMPULSE", qualityNote: "Không phục vụ mục đích sử dụng" }
      ],
      politePrompt: "Để hoàn thiện 'Cẩm nang Người tiêu dùng thông thái', nguyên tắc nào sau đây cần được ghi vào trang đầu tiên?",
      politeCorrectText: "Luôn đối chiếu 3 yếu tố: Mục đích sử dụng thực tế – Chất lượng/Công dụng bền lâu – Giá bán phù hợp ngân sách.",
      politeCorrectFeedback: "Tuyệt vời! Cẩm nang Người tiêu dùng thông thái của em đã hoàn thiện với tiêu chuẩn rất rõ ràng!",
      politeWrongText: "Chỉ nhìn vào bao bì sặc sỡ mà không cần đọc giá hay công dụng.",
      politeWrongFeedback: "Bao bì bắt mắt không đảm bảo chất lượng hay sự phù hợp với nhu cầu của em!"
    })
  },
  {
    periodIndex: 3,
    lessonId: "les_fin_g5_p03",
    lessonCode: "TC05S.01.0003",
    lessonName: "Bẫy tài chính quanh em",
    topicId: "top_fin_g5_1",
    topicCode: "TC05S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Ra quyết định tài chính",
    creativeZoneName: "Vùng 1: Học Viện Quyết Định Tài Chính Thông Thái",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 30, y: 65 },
    criteria: [
      { code: "TC05S.01.0003.11", level: "Mức 1", competencyGroup: "Hiểu", description: "Xác định được những tình huống có tác động từ quảng cáo, giảm giá hoặc xu hướng đám đông." },
      { code: "TC05S.01.0003.12", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được nguyên nhân khiến người mua quyết định khi chưa cân nhắc đầy đủ." },
      { code: "TC05S.01.0003.13", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được quyết định mua sắm có cân nhắc với quyết định chi tiêu theo cảm xúc." },
      { code: "TC05S.01.0003.14", level: "Mức 2", competencyGroup: "Biết", description: "Đưa ra được cách xử lí phù hợp để hạn chế chi tiêu không cần thiết." },
      { code: "TC05S.01.0003.15", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thiết kế được poster hoặc infographic thể hiện các bí quyết tránh bẫy tài chính." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Cảnh báo các Bẫy tài chính quanh em! Những chiêu trò 'Mua 2 tặng 1 đồ không cần', 'Hộp mù trúng thưởng hiếm' và 'Cơn sốt đám đông' đang giăng bẫy. Hãy nhận diện các mánh khóe và chọn sản phẩm thực chất cho poster Bí quyết tránh bẫy tài chính nhé!",
      worldLocationName: "Trạm Giải Mã Bẫy Tài Chính",
      mascotGuideTip: "Hãy bấm chọn các dấu hiệu bẫy tài chính (giảm giá ảo, tâm lý sợ bỏ lỡ, xu hướng đám đông) và chọn phương án tiêu dùng có cân nhắc!",
      parentCompanionTip: "Giải thích cho con về hiệu ứng 'hộp mù (blind box)' và khuyến mãi mua kèm để con không bị cuốn theo tâm lý may rủi.",
      mode: "AD_DETECTIVE",
      startingCoins: 20,
      adBudgetCoins: 15,
      ads: [
        {
          id: "g5_ad_trap1",
          title: "Bẫy Combo: Mua 3 ly nước ngọt khổng lồ tặng 1 móc khóa nhựa – Chỉ 18 Xu!",
          emoji: "🥤",
          price: 18,
          qualityBadge: "Vượt ngân sách 15 Xu & dư thừa đồ ngọt không tốt cho sức khỏe",
          hypePhrases: ["Chỉ hôm nay kẻo lỡ", "Ai cũng phải săn ngay"],
          isBestChoice: false,
          explanation: "Bẫy mua kèm số lượng lớn khiến em chi vượt ngân sách cho thứ không cần thiết."
        },
        {
          id: "g5_ad_trap2",
          title: "Hộp Mù Siêu Hiếm: Mở hộp 14 Xu săn nhân vật bí ẩn (Tỷ lệ trúng 1%)!",
          emoji: "🎲",
          price: 14,
          qualityBadge: "Đánh vào tâm lý tò mò may rủi, dễ mua lặp lại gây tốn tiền",
          hypePhrases: ["Mở 1 lần đổi đời", "Cả trường đang săn lùng"],
          isBestChoice: false,
          explanation: "Đây là bẫy chi tiêu theo cảm xúc và hiệu ứng đám đông."
        },
        {
          id: "g5_ad_wise",
          title: "Bộ dụng cụ học tập & thước vẽ kỹ thuật chuẩn (Giá niêm yết minh bạch 11 Xu)",
          emoji: "📐",
          price: 11,
          qualityBadge: "Đúng nhu cầu học tập lớp 5, bền bỉ, tiết kiệm được 4 Xu",
          hypePhrases: ["Thông số rõ ràng"],
          isBestChoice: true,
          explanation: "Quyết định mua sắm có cân nhắc kỹ nhu cầu, chất lượng và ngân sách!"
        }
      ]
    })
  },
  {
    periodIndex: 4,
    lessonId: "les_fin_g5_p04",
    lessonCode: "TC05S.01.0004",
    lessonName: "Nghệ thuật lựa chọn",
    topicId: "top_fin_g5_1",
    topicCode: "TC05S.01",
    officialTopicName: "Chủ đề 1. Tiêu dùng thông minh – Ra quyết định tài chính",
    creativeZoneName: "Vùng 1: Học Viện Quyết Định Tài Chính Thông Thái",
    isProject: false,
    feathersReward: 4,
    badgeCode: "BADGE_TC05S_ZONE1",
    badgeName: "Chiến Lược Gia Tiêu Dùng Khối 5",
    mapCoordinates: { x: 40, y: 58 },
    criteria: [
      { code: "TC05S.01.0004.16", level: "Mức 2", competencyGroup: "Biết", description: "Trình bày được các bước cơ bản để cân nhắc trước khi lựa chọn." },
      { code: "TC05S.01.0004.17", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được ưu điểm, hạn chế của các phương án chi tiêu trong tình huống." },
      { code: "TC05S.01.0004.18", level: "Mức 3", competencyGroup: "Vận dụng", description: "Sử dụng được quy trình ra quyết định để giải quyết tình huống thực tế." },
      { code: "TC05S.01.0004.19", level: "Mức 3", competencyGroup: "Vận dụng", description: "Giải thích được lí do lựa chọn bằng các căn cứ phù hợp." },
      { code: "TC05S.01.0004.20", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được bài học hoặc điều cần cân nhắc khi đưa ra quyết định tài chính." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Nghệ thuật lựa chọn nằm ở quy trình ra quyết định! Khi đứng trước nhiều phương án chi tiêu có cả ưu điểm và hạn chế, hãy cùng chim Sky-Line phân tích từng bước để chọn phương án tối ưu nhất nhé!",
      worldLocationName: "Bàn Cân Quy Trình Ra Quyết Định",
      mascotGuideTip: "Mỗi lựa chọn đều có chi phí cơ hội: chọn phương án này đồng nghĩa với việc từ bỏ phương án khác. Hãy cân nhắc ưu – nhược điểm thật kỹ!",
      parentCompanionTip: "Tập cho con thói quen liệt kê Ưu điểm và Hạn chế của 2 phương án trước khi đưa ra lựa chọn cuối cùng.",
      mode: "NEED_VS_WANT",
      context1Title: "Phân tích các bước và phương án trong quy trình ra quyết định tài chính",
      context1Subtitle: "Xếp các bước/phương án Có căn cứ & Tối ưu (Nhóm A) và Quyết định thiếu cân nhắc (Nhóm B)",
      groupAName: "Quy trình lựa chọn có căn cứ & Tối ưu 🎯",
      groupBName: "Quyết định vội vàng, thiếu phân tích ⚠️",
      items1: [
        { id: "g5_s4_1", name: "Bước 1-2: Xác định rõ mục tiêu sử dụng và giới hạn ngân sách hiện có", emoji: "🧭", correctGroup: "GROUP_A", contextReason: "Giúp khoanh vùng các phương án khả thi ngay từ đầu." },
        { id: "g5_s4_2", name: "Bước 3-4: So sánh ưu điểm, hạn chế của từng phương án rồi chọn phương án hiệu quả nhất", emoji: "⚖️", correctGroup: "GROUP_A", contextReason: "Đảm bảo quyết định có căn cứ rõ ràng và tối ưu lợi ích." },
        { id: "g5_s4_3", name: "Chọn đại phương án đầu tiên nhìn thấy mà không xem xét các lựa chọn thay thế", emoji: "🙈", correctGroup: "GROUP_B", contextReason: "Dễ bỏ lỡ phương án tốt hơn hoặc mua vượt ngân sách." },
        { id: "g5_s4_4", name: "Chỉ nhìn vào ưu điểm bề ngoài mà bỏ qua hạn chế về độ bền và chi phí phát sinh", emoji: "💥", correctGroup: "GROUP_B", contextReason: "Thiếu đánh giá toàn diện trước khi ra quyết định." }
      ],
      questionPrompt: "Tình huống thực tế: Em có 150.000đ để mua quà sinh nhật tặng bạn thân và vẫn cần giữ lại 50.000đ cho quỹ tiết kiệm. Phương án nào thể hiện 'Nghệ thuật lựa chọn'?",
      correctOptionText: "Phân tích ưu/nhược điểm các lựa chọn và chọn cuốn sách khoa học bạn yêu thích giá 95.000đ kèm thiệp tự làm (vừa ý nghĩa, đúng sở thích của bạn, vừa giữ nguyên 55.000đ tiết kiệm).",
      correctFeedback: "Quá xuất sắc! Em đã vận dụng hoàn hảo quy trình ra quyết định và meraih Huy hiệu Vùng 1 Khối 5!",
      wrongOptionText: "Mua gấu bông khổng lồ giá 150.000đ khiến quỹ tiết kiệm về 0đ.",
      wrongFeedback: "Phương án này làm em không đạt mục tiêu giữ lại 50.000đ tiết kiệm!"
    })
  },
  {
    periodIndex: 5,
    lessonId: "les_fin_g5_p05",
    lessonCode: "TC05S.02.0001",
    lessonName: "Lập ngân sách cá nhân",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 48, y: 50 },
    criteria: [
      { code: "TC05S.02.0001.21", level: "Mức 3", competencyGroup: "Vận dụng", description: "Giải thích được ý nghĩa của việc lập ngân sách trong quản lí tiền." },
      { code: "TC05S.02.0001.22", level: "Mức 1", competencyGroup: "Hiểu", description: "Liệt kê được những khoản thu và chi thường gặp của học sinh." },
      { code: "TC05S.02.0001.23", level: "Mức 2", competencyGroup: "Biết", description: "Xây dựng được kế hoạch thu – chi theo tuần hoặc tháng." },
      { code: "TC05S.02.0001.24", level: "Mức 2", competencyGroup: "Biết", description: "Phân bổ tiền hợp lí giữa chi tiêu, tiết kiệm và dự phòng." },
      { code: "TC05S.02.0001.25", level: "Mức 2", competencyGroup: "Biết", description: "Biết điều chỉnh kế hoạch để phù hợp với mục tiêu và khả năng tài chính." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Bước vào Vùng 2: Trung Tâm Ngân Sách! Em có tổng thu nhập tháng là 40 Xu (từ tiền thưởng học tập và phụ giúp việc nhà). Hãy lập ngân sách cá nhân phân bổ hợp lý vào 3 quỹ: Chi tiêu thiết yếu, Tiết kiệm mục tiêu và Quỹ dự phòng nhé!",
      worldLocationName: "Trung Tâm Điều Phối Ngân Sách Tháng",
      mascotGuideTip: "Một ngân sách cá nhân vững vàng luôn có đủ 3 trụ cột: Chi tiêu hợp lý (15–22 Xu), Tiết kiệm tích lũy (10–16 Xu) và Quỹ dự phòng (5–12 Xu)!",
      parentCompanionTip: "Hướng dẫn con lập ngân sách theo tháng thay vì chỉ tính từng ngày để rèn tầm nhìn dài hạn.",
      mode: "ALLOCATE_JARS",
      totalCoins: 40,
      jars: [
        { id: "g5_jar_spend", name: "Quỹ Chi tiêu học tập & sinh hoạt tuần/tháng", emoji: "📘", minCoins: 15, maxCoins: 22, description: "Dụng cụ học tập, sách báo và sinh hoạt cần thiết" },
        { id: "g5_jar_save", name: "Quỹ Tiết kiệm mục tiêu dài hạn", emoji: "🏦", minCoins: 10, maxCoins: 16, description: "Tích lũy đều đặn mỗi tháng cho mục tiêu lớn" },
        { id: "g5_jar_reserve", name: "Quỹ Dự phòng & Sẻ chia", emoji: "🛡️", minCoins: 5, maxCoins: 12, description: "Ứng phó tình huống phát sinh và đóng góp cộng đồng" }
      ],
      twistPrompt: "Giữa tháng, chiếc compa của em bị gãy cần mua mới (tốn 4 Xu phát sinh). Em điều chỉnh ngân sách tháng như thế nào?",
      twistCorrectText: "Sử dụng một phần Quỹ dự phòng hoặc giảm nhẹ khoản chi giải trí không thiết yếu trong tháng, giữ nguyên Quỹ tiết kiệm mục tiêu.",
      twistCorrectFeedback: "Tuyệt vời! Đó chính là ý nghĩa lớn nhất của việc lập ngân sách và có quỹ dự phòng!",
      twistWrongText: "Phá vỡ toàn bộ ngân sách tháng và rút hết quỹ tiết kiệm ra tiêu.",
      twistWrongFeedback: "Khi có quỹ dự phòng, em không cần phá bỏ mục tiêu tiết kiệm dài hạn!"
    })
  },
  {
    periodIndex: 6,
    lessonId: "les_fin_g5_p06",
    lessonCode: "TC05S.02.0002",
    lessonName: "Thử thách 500.000 đồng",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 56, y: 44 },
    criteria: [
      { code: "TC05S.02.0002.26", level: "Mức 1", competencyGroup: "Hiểu", description: "Liệt kê được các khoản chi cần thiết và không cần thiết trong tình huống." },
      { code: "TC05S.02.0002.27", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được khoản chi cần ưu tiên trước." },
      { code: "TC05S.02.0002.28", level: "Mức 2", competencyGroup: "Biết", description: "Phân bổ được 500.000 đồng cho các khoản chi theo yêu cầu." },
      { code: "TC05S.02.0002.29", level: "Mức 2", competencyGroup: "Biết", description: "Biết thay đổi kế hoạch khi ngân sách hoặc điều kiện thực tế thay đổi." },
      { code: "TC05S.02.0002.30", level: "Mức 3", competencyGroup: "Vận dụng", description: "Trình bày được lí do phân bổ ngân sách và phối hợp với các thành viên để thống nhất phương án." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "Chào mừng đến THỬ THÁCH 500.000 ĐỒNG (500K)! Nhóm của em được giao ngân sách 500K để chuẩn bị cho buổi Triển lãm Khoa học & Góc học tập của tổ. Hãy ưu tiên chọn ít nhất 3 hạng mục thiết yếu và giữ lại tối thiểu 80K làm quỹ dự phòng của nhóm nhé!",
      worldLocationName: "Đấu Trường Ngân Sách 500.000 Đồng",
      mascotGuideTip: "Tổng ngân sách là 500 (tương ứng 500.000đ). Hãy ưu tiên các khoản thiết yếu trước và để dành ít nhất 80K dự phòng!",
      parentCompanionTip: "Giao cho con thử thách lập kế hoạch chi tiêu 500.000đ cho một buổi liên hoan nhỏ hoặc chuyến dã ngoại của gia đình.",
      budgetCoins: 500,
      minRequiredEssentialCount: 3,
      minTotalItems: 3,
      maxTotalItems: 4,
      targetChangeCoins: 80,
      products: [
        { id: "g5_500k_1", name: "Bộ vật liệu làm mô hình Khoa học của nhóm (180K)", emoji: "🔬", price: 180, tag: "ESSENTIAL", qualityNote: "Hạng mục cốt lõi bắt buộc cho buổi triển lãm" },
        { id: "g5_500k_2", name: "Giấy bìa A0, bút dạ màu và bảng thuyết trình (110K)", emoji: "📋", price: 110, tag: "ESSENTIAL", qualityNote: "Cần thiết để trình bày kết quả nghiên cứu của nhóm" },
        { id: "g5_500k_3", name: "Nước uống đóng chai & bánh nhẹ hợp vệ sinh cho 5 thành viên (100K)", emoji: "🥪", price: 100, tag: "ESSENTIAL", qualityNote: "Đảm bảo năng lượng cho cả nhóm làm việc" },
        { id: "g5_500k_4", name: "Bộ nhãn dán phân loại tài liệu của nhóm (30K)", emoji: "🏷️", price: 30, tag: "USEFUL", qualityNote: "Hữu ích và nằm trong giới hạn ngân sách" },
        { id: "g5_500k_5", name: "Thuê đèn лазер sân khấu đắt đỏ không cần thiết (250K)", emoji: "🎇", price: 250, tag: "LUXURY", qualityNote: "Lãng phí, làm thâm hụt ngân sách thiết yếu" }
      ],
      politePrompt: "Khi điều kiện thực tế thay đổi (bộ vật liệu mô hình tăng giá thêm 20K), các thành viên trong nhóm nên thống nhất điều chỉnh thế nào?",
      politeCorrectText: "Cùng bàn bạc cắt giảm khoản trang trí phụ hoặc trích một phần nhỏ từ quỹ dự phòng 80K, đảm bảo các hạng mục chính vẫn hoàn thành đúng tiến độ.",
      politeCorrectFeedback: "Chính xác! Nhóm em đã vượt qua Thử thách 500.000 đồng với khả năng điều phối ngân sách rất chuyên nghiệp!",
      politeWrongText: "Bỏ luôn mô hình khoa học để lấy tiền mua đồ ăn vặt.",
      politeWrongFeedback: "Mô hình khoa học là mục tiêu ưu tiên số 1 của nhiệm vụ nhóm!"
    })
  },
  {
    periodIndex: 7,
    lessonId: "les_fin_g5_p07",
    lessonCode: "TC05S.02.0003",
    lessonName: "Tiết kiệm cho mục tiêu lớn",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 64, y: 38 },
    criteria: [
      { code: "TC05S.02.0003.31", level: "Mức 2", competencyGroup: "Biết", description: "Đặt được mục tiêu cụ thể, phù hợp với nhu cầu và khả năng của bản thân." },
      { code: "TC05S.02.0003.32", level: "Mức 1", competencyGroup: "Hiểu", description: "Xác định được số tiền cần tích lũy và số tiền cần tiết kiệm theo từng giai đoạn." },
      { code: "TC05S.02.0003.33", level: "Mức 2", competencyGroup: "Biết", description: "Lập được kế hoạch tiết kiệm có thời gian và cách thực hiện rõ ràng." },
      { code: "TC05S.02.0003.34", level: "Mức 2", competencyGroup: "Biết", description: "Biết cân nhắc khả năng thực hiện và điều chỉnh kế hoạch khi cần." },
      { code: "TC05S.02.0003.35", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đưa ra được cam kết hoặc biện pháp duy trì thói quen tiết kiệm." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "Mục tiêu lớn cần kế hoạch chia theo từng giai đoạn! Hãy chọn một mục tiêu tiết kiệm lớn phù hợp với học sinh lớp 5, xác định mức tiết kiệm mỗi tuần và cam kết duy trì thói quen tiết kiệm nhé!",
      worldLocationName: "Tháp Hải Đăng Mục Tiêu Lớn",
      mascotGuideTip: "Khi chia một mục tiêu lớn thành từng giai đoạn nhỏ theo tuần, em sẽ thấy mục tiêu hoàn toàn nằm trong tầm tay!",
      parentCompanionTip: "Cùng con chia mục tiêu tiết kiệm 8–10 tuần thành các cột mốc nhỏ để con dễ theo dõi tiến độ.",
      mode: "DREAM_TARGET",
      totalCoins: 45,
      dreamTargets: [
        { id: "g5_dream_1", name: "Khóa học Kỹ năng Lập trình nhí / Sách Bách khoa toàn thư", emoji: "💻", targetCoins: 40, suggestedWeeklySave: 8, weeksToGoal: 5 },
        { id: "g5_dream_2", name: "Bộ dụng cụ Thể thao cầu lông & balo dã ngoại cấp THCS", emoji: "🏸", targetCoins: 36, suggestedWeeklySave: 6, weeksToGoal: 6 },
        { id: "g5_dream_3", name: "Đàn Ukulele gỗ để tự học âm nhạc mùa hè", emoji: "🎸", targetCoins: 45, suggestedWeeklySave: 9, weeksToGoal: 5 }
      ],
      twistPrompt: "Sau 3 tuần tiết kiệm đều đặn, tuần thứ 4 em có khoản chi mua dụng cụ học tập đột xuất khiến chỉ tiết kiệm được một nửa mức dự kiến. Em điều chỉnh kế hoạch thế nào?",
      twistCorrectText: "Ghi chú rõ lý do vào bảng theo dõi, điều chỉnh kéo dài thời gian thêm 1 tuần hoặc tiết kiệm bù thêm ở tuần kế tiếp và kiên trì đến cùng.",
      twistCorrectFeedback: "Rất thực tế và kiên định! Biết linh hoạt điều chỉnh kế hoạch giúp em không bao giờ bỏ cuộc giữa chừng!",
      twistWrongText: "Thấy lệch kế hoạch 1 tuần nên nản chí tiêu hết số tiền đã tích lũy.",
      twistWrongFeedback: "Mọi kế hoạch lớn đều có thể cần điều chỉnh linh hoạt, đừng bỏ cuộc khi đã đi được hơn nửa chặng đường nhé!"
    })
  },
  {
    periodIndex: 8,
    lessonId: "les_fin_g5_p08",
    lessonCode: "TC05S.02.0004",
    lessonName: "Nhật ký chi tiêu",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 72, y: 32 },
    criteria: [
      { code: "TC05S.02.0004.36", level: "Mức 1", competencyGroup: "Hiểu", description: "Ghi lại được các khoản thu và chi theo thời gian quy định." },
      { code: "TC05S.02.0004.37", level: "Mức 2", competencyGroup: "Biết", description: "Phân loại được các khoản chi theo nhóm phù hợp." },
      { code: "TC05S.02.0004.38", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận xét được cách sử dụng tiền của bản thân dựa trên nhật ký." },
      { code: "TC05S.02.0004.39", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được khoản chi có thể giảm bớt hoặc thay đổi." },
      { code: "TC05S.02.0004.40", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đưa ra được biện pháp điều chỉnh thói quen chi tiêu phù hợp." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "Cùng chim Sky-Line rà soát Nhật ký chi tiêu tháng! Em có 35 Xu đầu tháng. Hãy ghi nhận 4 khoản chi theo nhóm, tính chính xác số dư còn lại và xác định những khoản chi có thể cắt giảm nhé!",
      worldLocationName: "Phòng Phân Tích Nhật Ký Tài Chính",
      mascotGuideTip: "Cộng tổng 4 khoản chi trong nhật ký để tính số tiền còn lại trong 35 Xu, sau đó chỉ ra những khoản chi lãng phí cần giảm bớt!",
      parentCompanionTip: "Hướng dẫn con tổng kết nhật ký chi tiêu vào mỗi tối Chủ nhật để tìm ra ít nhất 1 khoản có thể tiết kiệm hơn.",
      mode: "COIN_DIARY",
      startingCoins: 35,
      diaryEntries: [
        { id: "g5_d8_1", itemName: "Nhóm Học tập: Mua tài liệu ôn tập & vở ghi", emoji: "📚", cost: 9, isNecessary: true, note: "Khoản chi thiết yếu phục vụ học tập" },
        { id: "g5_d8_2", itemName: "Nhóm Giải trí: Mua thẻ bài lấp lánh theo trào lưu", emoji: "🃏", cost: 7, isNecessary: false, note: "Khoản chi theo hứng nhất thời, cần giảm bớt" },
        { id: "g5_d8_3", itemName: "Nhóm Sinh hoạt: Mua sữa tươi bổ sung dinh dưỡng", emoji: "🥛", cost: 6, isNecessary: true, note: "Cần thiết cho sức khỏe" },
        { id: "g5_d8_4", itemName: "Nhóm Ăn vặt: Mua kẹo nổ & nước ngọt có ga liên tục", emoji: "🍬", cost: 5, isNecessary: false, note: "Khoản chi không cần thiết và không tốt cho sức khỏe" }
      ]
    })
  },
  {
    periodIndex: 9,
    lessonId: "les_fin_g5_p09",
    lessonCode: "TC05S.02.0005",
    lessonName: "Tiền mặt và thanh toán điện tử",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 80, y: 26 },
    criteria: [
      { code: "TC05S.02.0005.41", level: "Mức 1", competencyGroup: "Hiểu", description: "Kể tên và nhận diện được các hình thức thanh toán phổ biến." },
      { code: "TC05S.02.0005.42", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được ưu điểm và hạn chế cơ bản của thanh toán bằng tiền mặt và thanh toán điện tử." },
      { code: "TC05S.02.0005.43", level: "Mức 2", competencyGroup: "Biết", description: "Chọn được hình thức thanh toán phù hợp với từng tình huống giả định." },
      { code: "TC05S.02.0005.44", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được những lưu ý cần thiết khi thực hiện thanh toán điện tử." },
      { code: "TC05S.02.0005.45", level: "Mức 3", competencyGroup: "Vận dụng", description: "Hoàn thành được cẩm nang thanh toán an toàn với các lưu ý rõ ràng, phù hợp lứa tuổi." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "Trong xã hội hiện đại, bên cạnh Tiền mặt còn có Thẻ ngân hàng, Mã QR và Ví điện tử! Hãy cùng chim Sky-Line phân tích đặc điểm của Tiền mặt và Thanh toán điện tử, cũng như các nguyên tắc trong Cẩm nang thanh toán an toàn nhé!",
      worldLocationName: "Cổng Giao Dịch Hiện Đại Sky-Pay",
      mascotGuideTip: "Dù thanh toán bằng tiền mặt hay điện tử, số tiền thực tế của chúng ta đều giảm đi tương ứng — vì vậy luôn phải kiểm tra kỹ số tiền trước khi thanh toán!",
      parentCompanionTip: "Khi quét mã QR thanh toán ở siêu thị, hãy cho con quan sát bước kiểm tra tên cửa hàng, số tiền và hóa đơn.",
      mode: "NEED_VS_WANT",
      context1Title: "Bối cảnh 1: So sánh Tiền mặt và Thanh toán điện tử",
      context1Subtitle: "Xếp các tình huống phù hợp dùng Tiền mặt trực tiếp (Nhóm A) và Thanh toán điện tử cùng bố mẹ (Nhóm B)",
      groupAName: "Phù hợp dùng Tiền mặt trực tiếp 💵",
      groupBName: "Phù hợp Thanh toán điện tử (QR / Thẻ) cùng người lớn 📱",
      items1: [
        { id: "g5_s9_1", name: "Mua gói xôi sáng 10.000đ tại quầy hàng nhỏ không có máy quét mã", emoji: "🍙", correctGroup: "GROUP_A", contextReason: "Giao dịch nhỏ lẻ trực tiếp bằng tiền mặt rất nhanh chóng, tiện lợi." },
        { id: "g5_s9_2", name: "Bỏ tiền tiết kiệm trực tiếp vào heo đất ở nhà", emoji: "🐷", correctGroup: "GROUP_A", contextReason: "Sử dụng tiền giấy/tiền xu vật lý trực tiếp." },
        { id: "g5_s9_3", name: "Bố mẹ đóng học phí hoặc mua vé tàu hỏa trực tuyến từ xa", emoji: "🚆", correctGroup: "GROUP_B", contextReason: "Thanh toán điện tử giúp giao dịch từ xa nhanh chóng, không cần mang nhiều tiền mặt." },
        { id: "g5_s9_4", name: "Thanh toán hóa đơn siêu thị lớn bằng quét mã QR có sao kê rõ ràng", emoji: "🧾", correctGroup: "GROUP_B", contextReason: "Chính xác từng đồng lẻ và lưu lại lịch sử giao dịch điện tử." }
      ],
      questionPrompt: "Lưu ý quan trọng nhất cần đưa vào 'Cẩm nang thanh toán an toàn' cho học sinh Tiểu học khi tiếp xúc với thanh toán điện tử là gì?",
      correctOptionText: "Chỉ thực hiện giao dịch điện tử khi có sự đồng ý, giám sát của bố mẹ; luôn kiểm tra kỹ tên người nhận, số tiền và tuyệt đối giữ bí mật mật khẩu/mã OTP.",
      correctFeedback: "Chính xác! Em đã nắm vững ưu nhược điểm và nguyên tắc thanh toán an toàn!",
      wrongOptionText: "Tự ý lấy điện thoại của bố mẹ quét mã mua vật phẩm trong trò chơi trực tuyến.",
      wrongFeedback: "Học sinh tuyệt đối không tự ý giao dịch điện tử khi chưa được phép của bố mẹ!"
    })
  },
  {
    periodIndex: 10,
    lessonId: "les_fin_g5_p10",
    lessonCode: "TC05S.02.0006",
    lessonName: "An toàn tài chính trên môi trường số",
    topicId: "top_fin_g5_2",
    topicCode: "TC05S.02",
    officialTopicName: "Chủ đề 2: Làm chủ tài chính cá nhân – Chi tiêu và thanh toán an toàn",
    creativeZoneName: "Vùng 2: Trung Tâm Ngân Sách & Lá Chắn Tài Chính Số",
    isProject: false,
    feathersReward: 5,
    badgeCode: "BADGE_TC05S_ZONE2",
    badgeName: "Hiệp Sĩ An Toàn Tài Chính Số Khối 5",
    mapCoordinates: { x: 86, y: 20 },
    criteria: [
      { code: "TC05S.02.0006.46", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được một số dấu hiệu đáng ngờ trong tin nhắn, đường link hoặc lời mời giao dịch trực tuyến." },
      { code: "TC05S.02.0006.47", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được thông tin và dữ liệu tài chính không nên chia sẻ tùy tiện." },
      { code: "TC05S.02.0006.48", level: "Mức 2", competencyGroup: "Biết", description: "Biết dừng giao dịch, không cung cấp thông tin và tìm người lớn đáng tin cậy hỗ trợ khi nghi ngờ lừa đảo." },
      { code: "TC05S.02.0006.49", level: "Mức 2", competencyGroup: "Biết", description: "Xây dựng được các nguyên tắc bảo vệ tài khoản và thông tin cá nhân." },
      { code: "TC05S.02.0006.50", level: "Mức 3", competencyGroup: "Vận dụng", description: "Lựa chọn được cách ứng xử an toàn trong các tình huống tài chính số giả định." }
    ],
    interactive: buildVillageInteractive({
      storyBrief: "Cảnh báo an ninh mạng tại Lá Chắn Tài Chính Số! Có nhiều đường link lạ, tin nhắn giả mạo trúng thưởng và yêu cầu cung cấp mã OTP đang tấn công. Hãy phân loại đúng hành động em tự bảo vệ được ngay và tình huống nguy hiểm cần báo ngay cho bố mẹ/thầy cô!",
      worldLocationName: "Pháo Đài Lá Chắn An Toàn Tài Chính Số",
      mascotGuideTip: "Mật khẩu, số thẻ ngân hàng và mã OTP là 'chìa khóa két sắt' — tuyệt đối không bao giờ chia sẻ cho bất kỳ ai trên mạng!",
      parentCompanionTip: "Dặn con quy tắc 'Dừng lại – Không bấm link lạ – Báo ngay cho bố mẹ' khi nhận được bất kỳ tin nhắn trúng thưởng hay đòi tiền nào trên mạng.",
      nodes: [
        {
          id: "g5_v10_1",
          title: "Cài đặt mật khẩu mạnh và đăng xuất tài khoản học tập sau khi dùng máy tính chung",
          emoji: "🔐",
          category: "ENERGY",
          brokenStateText: "Tài khoản đang để mật khẩu '123456' và quên đăng xuất ở phòng máy",
          fixedStateText: "Đã bảo mật tài khoản và đăng xuất an toàn sau khi sử dụng",
          correctActor: "SELF_ACTION",
          explanation: "Em hoàn toàn chủ động tự thực hiện nguyên tắc bảo mật tài khoản cá nhân mỗi ngày."
        },
        {
          id: "g5_v10_2",
          title: "Không đăng ảnh chụp thẻ học sinh, số điện thoại, địa chỉ nhà hay thẻ ngân hàng của bố mẹ lên mạng",
          emoji: "🛡️",
          category: "REUSE",
          brokenStateText: "Đang định chụp ảnh thẻ ngân hàng và thông tin cá nhân đăng lên nhóm chat",
          fixedStateText: "Đã giữ kín toàn bộ dữ liệu cá nhân và thông tin tài chính gia đình",
          correctActor: "SELF_ACTION",
          explanation: "Em tự giác bảo vệ dữ liệu riêng tư, không chia sẻ tùy tiện lên môi trường số."
        },
        {
          id: "g5_v10_3",
          title: "Tin nhắn lạ báo 'Trúng thưởng iPad, hãy nhập số thẻ và mã OTP của bố mẹ vào link này trong 5 phút'",
          emoji: "🚨",
          category: "ENERGY",
          brokenStateText: "Đường link lừa đảo giả mạo đang hối thúc nhập mã OTP ngân hàng!",
          fixedStateText: "Đã dừng ngay lập tức, không bấm link và báo cho bố mẹ kiểm tra, chặn số lừa đảo",
          correctActor: "ADULT_HELP",
          explanation: "Khi gặp dấu hiệu lừa đảo trực tuyến, cần dừng giao dịch và báo ngay cho bố mẹ xử lý!"
        },
        {
          id: "g5_v10_4",
          title: "Tài khoản mạng xã hội giả danh người quen nhắn tin mượn tiền gấp qua mã QR lạ",
          emoji: "🕵️",
          category: "WATER",
          brokenStateText: "Kẻ gian đang giả mạo tài khoản người quen để lừa chuyển tiền!",
          fixedStateText: "Đã báo ngay cho bố mẹ gọi điện thoại xác minh trực tiếp, ngăn chặn lừa đảo",
          correctActor: "ADULT_HELP",
          explanation: "Mọi yêu cầu chuyển tiền đáng ngờ trên mạng đều phải báo người lớn đáng tin cậy xác minh."
        }
      ]
    })
  },
  {
    periodIndex: 11,
    lessonId: "les_fin_g5_p11",
    lessonCode: "TC05S.03.0001",
    lessonName: "Đồng tiền tạo giá trị",
    topicId: "top_fin_g5_3",
    topicCode: "TC05S.03",
    officialTopicName: "Chủ đề 3: Đồng tiền tạo giá trị – Vận dụng qua dự án thực tiễn",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Dự Án Nhà Quản Lí Tài Chính Nhí",
    isProject: false,
    feathersReward: 5,
    mapCoordinates: { x: 90, y: 15 },
    criteria: [
      { code: "TC05S.03.0001.51", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được vai trò của tiền đối với nhu cầu cá nhân và đời sống cộng đồng." },
      { code: "TC05S.03.0001.52", level: "Mức 2", competencyGroup: "Biết", description: "Giải thích được cách sử dụng tiền để giúp đỡ người khác hoặc đóng góp cho cộng đồng." },
      { code: "TC05S.03.0001.53", level: "Mức 2", competencyGroup: "Biết", description: "Biết cân nhắc giữa chi tiêu cá nhân, tiết kiệm và sẻ chia." },
      { code: "TC05S.03.0001.54", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đề xuất được hoạt động có ý nghĩa, phù hợp với nguồn tiền và điều kiện thực tế." },
      { code: "TC05S.03.0001.55", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được hành động cụ thể thể hiện tinh thần sẻ chia và trách nhiệm." }
    ],
    interactive: buildNestInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Đồng tiền tạo ra giá trị lớn nhất khi vừa đáp ứng nhu cầu chính đáng của bản thân, vừa tích lũy cho tương lai và đóng góp thiết thực cho cộng đồng! Hãy phân bổ 45 Xu vào 3 quỹ để tạo giá trị bền vững nhé!",
      worldLocationName: "Quảng Trường Đồng Tiền Tạo Giá Trị",
      mascotGuideTip: "Hãy cân đối 45 Xu giữa Chi tiêu cá nhân có ích, Tiết kiệm tương lai và Quỹ đóng góp cộng đồng!",
      practicalPrompt: "Em hãy đề xuất 1 hoạt động 'Đồng tiền tạo giá trị cho cộng đồng' phù hợp với học sinh lớp 5 (ví dụ: Tủ sách sẻ chia, Góc xanh lớp học, Quyên góp vở trắng...) và nêu cách thực hiện cụ thể nhé!",
      parentCompanionTip: "Đồng hành cùng con tham gia một hoạt động thiện nguyện hoặc dự án môi trường tại địa phương.",
      mode: "ALLOCATE_JARS",
      totalCoins: 45,
      jars: [
        { id: "g5_val_self", name: "Hũ Phát triển bản thân & Học tập", emoji: "🎓", minCoins: 15, maxCoins: 24, description: "Đầu tư cho tri thức, sức khỏe và nhu cầu thiết yếu" },
        { id: "g5_val_save", name: "Hũ Tích lũy tương lai", emoji: "🌱", minCoins: 10, maxCoins: 18, description: "Tiết kiệm cho mục tiêu dài hạn và dự phòng" },
        { id: "g5_val_comm", name: "Hũ Giá trị Cộng đồng & Sẻ chia", emoji: "🌏", minCoins: 8, maxCoins: 15, description: "Đóng góp cho hoạt động thiện nguyện và môi trường" }
      ],
      twistPrompt: "Làm thế nào để một khoản tiền nhỏ của học sinh lớp 5 tạo ra giá trị lớn nhất cho cộng đồng?",
      twistCorrectText: "Kết hợp số tiền đóng góp vừa sức với công sức, sự sáng tạo và tinh thần hợp tác của cả tập thể lớp để thực hiện hoạt động đúng nhu cầu thực tế của người nhận.",
      twistCorrectFeedback: "Tuyệt vời! Khi đồng tiền đi cùng trí tuệ và tấm lòng nhân ái, giá trị tạo ra sẽ nhân lên gấp bội!",
      twistWrongText: "Phải có thật nhiều tiền mới làm được việc có ích cho cộng đồng.",
      twistWrongFeedback: "Những đóng góp nhỏ nhưng thiết thực và chân thành luôn tạo nên giá trị lớn lao!"
    })
  },
  {
    periodIndex: 12,
    lessonId: "les_fin_g5_p12",
    lessonCode: "TC05S.03.0002",
    lessonName: "Dự án: \"Nhà quản lí tài chính nhí\".",
    topicId: "top_fin_g5_3",
    topicCode: "TC05S.03",
    officialTopicName: "Chủ đề 3: Đồng tiền tạo giá trị – Vận dụng qua dự án thực tiễn",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Dự Án Nhà Quản Lí Tài Chính Nhí",
    isProject: true,
    feathersReward: 6,
    badgeCode: "BADGE_TC05S_CHAMPION",
    badgeName: "Quán Quân Quản Lí Tài Chính Nhí Khối 5",
    mapCoordinates: { x: 95, y: 10 },
    criteria: [
      { code: "TC05S.03.0002.56", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được mục tiêu, nhiệm vụ và sản phẩm cần hoàn thành." },
      { code: "TC05S.03.0002.57", level: "Mức 3", competencyGroup: "Vận dụng", description: "Đưa ra được ý tưởng phù hợp với mục tiêu dự án và đối tượng hướng đến." },
      { code: "TC05S.03.0002.58", level: "Mức 1", competencyGroup: "Hiểu", description: "Lựa chọn được ý tưởng phù hợp với nguồn lực và ngân sách dự kiến." },
      { code: "TC05S.03.0002.59", level: "Mức 2", competencyGroup: "Biết", description: "Xác định được nhiệm vụ của các thành viên và thống nhất kế hoạch thực hiện." },
      { code: "TC05S.03.0002.60", level: "Mức 1", competencyGroup: "Hiểu", description: "Tìm kiếm hoặc khảo sát được thông tin về giá sản phẩm và các khoản chi cần thiết." },
      { code: "TC05S.03.0002.61", level: "Mức 2", competencyGroup: "Biết", description: "Xây dựng được bảng dự toán thu – chi rõ ràng, có số liệu cụ thể." },
      { code: "TC05S.03.0002.62", level: "Mức 2", competencyGroup: "Biết", description: "Biết xem xét góp ý và điều chỉnh phương án nhằm giảm chi phí hoặc sử dụng nguồn lực hiệu quả hơn." },
      { code: "TC05S.03.0002.63", level: "Mức 2", competencyGroup: "Biết", description: "Tạo được sản phẩm, poster, slide hoặc mô hình minh họa phù hợp với ý tưởng." },
      { code: "TC05S.03.0002.64", level: "Mức 2", competencyGroup: "Biết", description: "Xây dựng được nội dung trình bày có trình tự, nêu rõ ý tưởng và phương án tài chính." },
      { code: "TC05S.03.0002.65", level: "Mức 3", competencyGroup: "Vận dụng", description: "Nhận xét được kết quả dự án, đánh giá sự phối hợp nhóm và rút ra bài học quản lí tài chính." }
    ],
    interactive: buildDiaryAdInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "CHẶNG TỔNG KẾT CẤP TIỂU HỌC – DỰ ÁN 'NHÀ QUẢN LÍ TÀI CHÍNH NHÍ' (KHỐI 5)! Nhóm của em có tổng ngân sách dự án 40 đơn vị (tương ứng 400.000đ). Hãy xây dựng bảng dự toán thu – chi, phân bổ Chi tiêu dự án – Quỹ tiết kiệm/dự phòng – Quỹ cộng đồng và điều chỉnh phương án tối ưu nguồn lực nhé!",
      worldLocationName: "Đài Vinh Quang Nhà Quản Lí Tài Chính Nhí Khối 5",
      mascotGuideTip: "Với 40 đơn vị ngân sách dự án: hãy phân bổ Chi phí thực hiện sản phẩm hợp lý (khoảng 18), Quỹ tiết kiệm/dự phòng tối thiểu 12 và Quỹ giá trị cộng đồng tối thiểu 6!",
      practicalPrompt: "Báo cáo Dự án 'Nhà quản lí tài chính nhí': Em hãy trình bày tên dự án của nhóm, mục tiêu, bảng dự toán thu – chi cụ thể, cách nhóm điều chỉnh giảm chi phí và bài học quản lí tài chính rút ra nhé!",
      parentCompanionTip: "Chúc mừng con hoàn thành chương trình Giáo dục Tài chính Tiểu học! Hãy lắng nghe con thuyết trình về Dự án Nhà quản lí tài chính nhí của mình.",
      mode: "MASTER_FINANCE_CAPSTONE",
      startingCoins: 40,
      diaryEntries: [
        { id: "g5_cap_1", itemName: "Chi phí khảo sát & nguyên vật liệu làm sản phẩm/mô hình dự án", emoji: "📊", cost: 18, isNecessary: true, note: "Khoản chi trực tiếp tạo ra sản phẩm dự án" },
        { id: "g5_cap_2", itemName: "Quỹ tiết kiệm bảo toàn ngân sách & dự phòng rủi ro", emoji: "🏦", cost: 14, isNecessary: true, note: "Đảm bảo an toàn tài chính và tính khả thi" },
        { id: "g5_cap_3", itemName: "Quỹ lan tỏa giá trị cộng đồng từ kết quả dự án", emoji: "🌟", cost: 8, isNecessary: true, note: "Đóng góp thiết thực cho học sinh và cộng đồng" }
      ],
      capstoneChallenge: {
        totalBudget: 40,
        minSaveCoins: 12,
        minShareCoins: 6,
        surpriseQuestion: "Khi chạy thử nghiệm dự án, thầy cô góp ý nhóm có thể giảm 25% chi phí in ấn bằng cách thiết kế Slide/Infographic số hóa kết hợp vật liệu thân thiện môi trường. Nhóm em quyết định thế nào?",
        surpriseOptions: [
          {
            id: "g5_proj_right",
            text: "Tiếp thu góp ý, điều chỉnh ngay bảng dự toán sang thiết kế Infographic số kết hợp vật liệu tái chế để tối ưu chi phí, nâng cao hiệu quả sử dụng nguồn lực và tăng quỹ đóng góp cộng đồng!",
            isCorrect: true,
            feedback: "CHÚC MỪNG QUÁN QUÂN NHÀ QUẢN LÍ TÀI CHÍNH NHÍ KHỐI 5! Em đã hoàn thành xuất sắc toàn bộ Hành trình Đảo Tài Chính TC05S!"
          },
          {
            id: "g5_proj_wrong",
            text: "Bỏ qua góp ý, cứ chi hết sạch ngân sách và cả quỹ dự phòng cho việc in màu hàng loạt.",
            isCorrect: false,
            feedback: "Nhà quản lí tài chính thông thái luôn biết lắng nghe góp ý để tối ưu chi phí và sử dụng nguồn lực hiệu quả hơn!"
          }
        ]
      }
    })
  }
];

// ============================================================================
// KHỐI 1: ĐẢO HOẠT HÌNH TÀI CHÍNH NHÍ 1S (MÃ TC01S) - 4 CHỦ ĐỀ, 15 BÀI HỌC, 46 TIÊU CHUẨN
// ============================================================================

export const TC01S_ZONES: TC02SZoneDefinition[] = [
  {
    zoneOrder: 1,
    topicId: "spec_top_fin_g1_01",
    topicCode: "TC01S.01",
    officialTopicName: "Chủ đề 1. Làm quen với tiền",
    creativeZoneName: "Vùng 1: Khu Vườn Chim Non & Đồng Xu Lấp Lánh 🐣",
    themeColor: "#0d9488",
    accentColor: "#2dd4bf",
    landscapeSubtitle: "Cùng Chim Non Bồ Câu Sky-Line và Bé Heo Hồng nhận biết tờ tiền Việt Nam, hiểu tiền đến từ lao động của ba mẹ và giữ tiền phẳng phiu.",
    badgeCode: "BADGE_TC01S_ZONE1",
    badgeName: "Bạn Nhỏ Yêu Quý Đồng Tiền"
  },
  {
    zoneOrder: 2,
    topicId: "spec_top_fin_g1_02",
    topicCode: "TC01S.02",
    officialTopicName: "Chủ đề 2. Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Siêu Thị Tí Hon Của Thỏ Trắng Thông Thái 🐰",
    themeColor: "#0284c7",
    accentColor: "#38bdf8",
    landscapeSubtitle: "Cùng Thỏ Trắng Thông Thái phân biệt điều em Cần hay em Muốn, dừng lại nghĩ 3 giây trước khi mua và trải nghiệm Siêu thị tí hon.",
    badgeCode: "BADGE_TC01S_ZONE2",
    badgeName: "Khách Hàng Nhí Thông Thái"
  },
  {
    zoneOrder: 3,
    topicId: "spec_top_fin_g1_03",
    topicCode: "TC01S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm mỗi ngày",
    creativeZoneName: "Vùng 3: Ngôi Làng Ống Heo Hồng & Gấu Mật Xanh 🐷",
    themeColor: "#059669",
    accentColor: "#34d399",
    landscapeSubtitle: "Cùng Bé Heo Hồng và Gấu Mật đánh thức siêu năng lực tiết kiệm, nuôi ước mơ trong ống heo, tiết kiệm điện nước và ghi nhật ký tiết kiệm.",
    badgeCode: "BADGE_TC01S_ZONE3",
    badgeName: "Siêu Anh Hùng Tiết Kiệm Nhí"
  },
  {
    zoneOrder: 4,
    topicId: "spec_top_fin_g1_04",
    topicCode: "TC01S.04",
    officialTopicName: "Chủ đề 4. Em làm chủ đồng tiền",
    creativeZoneName: "Vùng 4: Đồi Ba Chiếc Hũ Của Sóc Nâu Chăm Chỉ 🐿️",
    themeColor: "#d97706",
    accentColor: "#fbbf24",
    landscapeSubtitle: "Cùng Gấu Mật và Sóc Nâu biết chia sẻ yêu thương, lập kế hoạch chi tiêu đầu tiên với 3 chiếc hũ và trở thành Nhà quản lí tài chính nhí!",
    badgeCode: "BADGE_TC01S_ZONE4",
    badgeName: "Nhà Quản Lí Tài Chính Nhí Khối 1"
  }
];

export const TC01S_STAGES: TC02SStageDefinition[] = [
  {
    periodIndex: 1,
    lessonId: "spec_les_fin_g1_p01",
    lessonCode: "TC01S.01.0001",
    lessonName: "1. Tiền quanh em",
    topicId: "spec_top_fin_g1_01",
    topicCode: "TC01S.01",
    officialTopicName: "Chủ đề 1. Làm quen với tiền",
    creativeZoneName: "Vùng 1: Khu Vườn Chim Non & Đồng Xu Lấp Lánh 🐣",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 10, y: 80 },
    criteria: [
      { code: "TC01S.01.0001.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết được tờ tiền Việt Nam qua màu sắc, con số mệnh giá và hình ảnh trên tờ tiền." },
      { code: "TC01S.01.0001.02", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được tiền xuất hiện trong các hoạt động mua bán hằng ngày quanh em." },
      { code: "TC01S.01.0001.03", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được tờ tiền thật với giấy màu, thẻ đồ chơi hoặc lá cây." },
      { code: "TC01S.01.0001.04", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết gọi đúng tên một số mệnh giá tiền quen thuộc khi đi cùng người lớn." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐣 Chim Non Bồ Câu Sky-Line vẫy cánh chào em: 'Cúc cu! Quanh chúng mình có những tờ tiền Việt Nam thật đẹp. Em hãy giúp Chim Non phân biệt đâu là tiền thật dùng trong cuộc sống và đâu chỉ là đồ chơi nhé!'",
      worldLocationName: "Cổng Vườn Hoa Đồng Xu Của Chim Non",
      mascotGuideTip: "🎶 Vè Chim Non: 'Nhìn số, nhìn màu trên tờ tiền – Mua bánh, mua vở khắp mọi miền!'",
      parentCompanionTip: "Cho con quan sát 2–3 tờ tiền mệnh giá nhỏ (1.000đ, 2.000đ, 5.000đ) để con nhận biết con số và màu sắc.",
      mode: "NEED_VS_WANT",
      context1Title: "Làm quen với tiền quanh em",
      context1Subtitle: "Giúp Chim Non 🐣 xếp đúng Tiền thật & hoạt động dùng tiền (Nhóm A) và Đồ chơi không phải tiền (Nhóm B)",
      groupAName: "Tiền thật & Hoạt động quanh em 🪙",
      groupBName: "Đồ chơi / Không phải tiền 🍂",
      items1: [
        { id: "g1_s1_1", name: "Tờ tiền Việt Nam có in con số mệnh giá và Quốc huy", emoji: "💵", correctGroup: "GROUP_A", contextReason: "Đây là đồng tiền Việt Nam hợp pháp dùng trong cuộc sống." },
        { id: "g1_s1_2", name: "Mẹ dùng tiền trả cô bán rau ở chợ buổi sáng", emoji: "🥬", correctGroup: "GROUP_A", contextReason: "Tiền xuất hiện trong hoạt động mua bán hằng ngày quanh em." },
        { id: "g1_s1_3", name: "Lá cây rụng ngoài sân trường", emoji: "🍃", correctGroup: "GROUP_B", contextReason: "Lá cây chỉ dùng khi chơi đồ hàng, không mua hàng thật được." },
        { id: "g1_s1_4", name: "Hình vẽ tờ tiền cắt từ giấy màu thủ công", emoji: "✂️", correctGroup: "GROUP_B", contextReason: "Giấy màu tự cắt chỉ là đồ chơi, không phải tiền thật." }
      ],
      questionPrompt: "🐣 Chim Non đố em: Khi nhìn vào tờ tiền Việt Nam, em thấy những đặc điểm gì giúp nhận biết mệnh giá?",
      correctOptionText: "Trên tờ tiền có in rõ con số mệnh giá, chữ viết, hình ảnh đặc trưng và màu sắc riêng của từng tờ tiền.",
      correctFeedback: "🎉 Hoan hô! Chim Non Bồ Câu vỗ cánh khen em tinh mắt lắm!",
      wrongOptionText: "Tờ tiền nào cũng trắng tinh không có chữ hay số gì cả.",
      wrongFeedback: "Hãy nhìn kỹ nhé: trên mỗi tờ tiền đều có con số mệnh giá và màu sắc rất rõ ràng đấy!"
    })
  },
  {
    periodIndex: 2,
    lessonId: "spec_les_fin_g1_p02",
    lessonCode: "TC01S.01.0002",
    lessonName: "2. Tiền đến từ đâu?",
    topicId: "spec_top_fin_g1_01",
    topicCode: "TC01S.01",
    officialTopicName: "Chủ đề 1. Làm quen với tiền",
    creativeZoneName: "Vùng 1: Khu Vườn Chim Non & Đồng Xu Lấp Lánh 🐣",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 16, y: 75 },
    criteria: [
      { code: "TC01S.01.0002.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Hiểu được tiền không tự nhiên mà có mà do con người lao động, làm việc tạo ra." },
      { code: "TC01S.01.0002.02", level: "Mức 1", competencyGroup: "Hiểu", description: "Kể được công việc hằng ngày của bố mẹ hoặc người thân để kiếm tiền nuôi gia đình." },
      { code: "TC01S.01.0002.03", level: "Mức 2", competencyGroup: "Biết", description: "Thể hiện lòng biết ơn đối với công sức lao động của bố mẹ, người lớn." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐣 Chim Non Bồ Câu dẫn em tới Quảng Trường Nghề Nghiệp Đáng Quý: 'Em có biết tiền trong ví của bố mẹ từ đâu mà có không? Hãy chọn những việc làm chân chính tạo ra đồng tiền nhé!'",
      worldLocationName: "Quảng Trường Nghề Nghiệp Đáng Quý",
      mascotGuideTip: "🎶 Vè Chim Non: 'Đồng tiền từ sức mẹ cha – Đi làm chăm chỉ nuôi nhà ấm êm!'",
      parentCompanionTip: "Kể ngắn gọn cho con nghe công việc hằng ngày của bố mẹ để con hiểu giá trị của lao động.",
      mode: "NEED_VS_WANT",
      context1Title: "Tiền đến từ đâu nhỉ?",
      context1Subtitle: "Xếp nguồn tạo ra tiền đúng đắn (Nhóm A) và điều không có thật (Nhóm B)",
      groupAName: "Nhờ lao động chăm chỉ 💼",
      groupBName: "Không tự nhiên mà có 🚫",
      items1: [
        { id: "g1_s2_1", name: "Bố mẹ đi làm việc chăm chỉ mỗi ngày ở cơ quan, trường học, nhà máy", emoji: "👩‍🏫", correctGroup: "GROUP_A", contextReason: "Bố mẹ lao động tạo ra giá trị và nhận lương, thu nhập." },
        { id: "g1_s2_2", name: "Bác nông dân trồng lúa, trồng rau quả sạch đem bán", emoji: "🌾", correctGroup: "GROUP_A", contextReason: "Công sức lao động vất vả tạo ra sản phẩm và thu nhập." },
        { id: "g1_s2_3", name: "Tiền tự mọc trên cành cây như lá mùa xuân", emoji: "🌳", correctGroup: "GROUP_B", contextReason: "Tiền không bao giờ tự mọc trên cây." },
        { id: "g1_s2_4", name: "Ngồi không ước phép thuật là túi tự đầy tiền", emoji: "🪄", correctGroup: "GROUP_B", contextReason: "Tiền chỉ có được từ lao động chân chính." }
      ],
      questionPrompt: "🐣 Vì tiền có được từ mồ hôi và công sức làm việc của bố mẹ, em nên làm gì?",
      correctOptionText: "Yêu thương, biết ơn bố mẹ, giữ gìn đồ dùng học tập và không đòi mua đồ chơi lãng phí.",
      correctFeedback: "🌟 Tuyệt vời! Chim Non tặng em ngôi sao Biết Ơn vì em rất thương bố mẹ!",
      wrongOptionText: "Khóc nhè đòi mua đồ chơi đắt tiền mỗi ngày.",
      wrongFeedback: "Hãy thương bố mẹ làm việc vất vả và tiêu dùng thật ngoan nhé!"
    })
  },
  {
    periodIndex: 3,
    lessonId: "spec_les_fin_g1_p03",
    lessonCode: "TC01S.01.0003",
    lessonName: "3. Tiền giúp ích gì?",
    topicId: "spec_top_fin_g1_01",
    topicCode: "TC01S.01",
    officialTopicName: "Chủ đề 1. Làm quen với tiền",
    creativeZoneName: "Vùng 1: Khu Vườn Chim Non & Đồng Xu Lấp Lánh 🐣",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 22, y: 70 },
    criteria: [
      { code: "TC01S.01.0003.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nêu được lợi ích của tiền trong sinh hoạt: mua thức ăn, quần áo, sách vở, khám chữa bệnh." },
      { code: "TC01S.01.0003.02", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được những thứ mua được bằng tiền và những niềm vui, tình cảm không cần mua bằng tiền." },
      { code: "TC01S.01.0003.03", level: "Mức 2", competencyGroup: "Biết", description: "Biết dùng tiền vào những mục đích tốt đẹp, có ích cho bản thân và gia đình." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐻 Bạn Gấu Mật Ấm Áp mỉm cười chào em: 'Tiền giúp gia đình mình mua thức ăn, áo ấm, sách vở. Nhưng có những niềm vui ấm áp chẳng tốn đồng xu nào! Hãy cùng Gấu Mật phân loại nhé!'",
      worldLocationName: "Đồi Nắng Ấm Của Gấu Mật",
      mascotGuideTip: "🎶 Vè Gấu Mật: 'Bánh mì, sách vở cần tiền – Nụ cười, cái ôm ấm liền tim ta!'",
      parentCompanionTip: "Cùng con kể 3 niềm vui miễn phí mỗi tối trong gia đình (đọc truyện, ôm chúc ngủ ngon, tập thể dục).",
      mode: "MONEY_VS_NO_MONEY",
      context1Title: "Tiền giúp ích gì và Niềm vui nào không tốn tiền?",
      context1Subtitle: "Cùng Gấu Mật 🐻 xếp vào giỏ phù hợp nhé",
      groupAName: "Cần dùng tiền để mua 🪙",
      groupBName: "Niềm vui miễn phí không tốn tiền 💖",
      items1: [
        { id: "g1_s3_1", name: "Mua hộp sữa tươi và bánh mì ăn sáng", emoji: "🥛", correctGroup: "GROUP_A", contextReason: "Cần trả tiền khi mua lương thực, thực phẩm." },
        { id: "g1_s3_2", name: "Mua sách vở, bút chì và đồng phục đi học", emoji: "🎒", correctGroup: "GROUP_A", contextReason: "Tiền giúp mua đồ dùng học tập và quần áo." },
        { id: "g1_s3_3", name: "Vòng tay ấm áp ôm bố mẹ và chúc ngủ ngon", emoji: "🤗", correctGroup: "GROUP_B", contextReason: "Tình yêu thương gia đình vô giá và hoàn toàn miễn phí!" },
        { id: "g1_s3_4", name: "Cùng ông bà tưới cây, ngắm hoa nở ngoài hiên nhà", emoji: "🌻", correctGroup: "GROUP_B", contextReason: "Niềm vui bên người thân và thiên nhiên không tốn tiền." }
      ],
      questionPrompt: "🐻 Gấu Mật hỏi em: Tiền giúp ích gì cho cuộc sống hằng ngày của gia đình em?",
      correctOptionText: "Tiền giúp trao đổi, mua thức ăn, quần áo, sách vở, đóng học phí và chăm sóc sức khỏe.",
      correctFeedback: "🐻 Gấu Mật vỗ tay khen em! Em hiểu rất rõ lợi ích của đồng tiền!",
      wrongOptionText: "Tiền chỉ dùng để gấp máy bay giấy ném chơi.",
      wrongFeedback: "Không gấp tiền làm đồ chơi đâu nhé, tiền giúp mua những điều thiết yếu cho cuộc sống!"
    })
  },
  {
    periodIndex: 4,
    lessonId: "spec_les_fin_g1_p04",
    lessonCode: "TC01S.01.0004",
    lessonName: "4. Em giữ gìn đồng tiền",
    topicId: "spec_top_fin_g1_01",
    topicCode: "TC01S.01",
    officialTopicName: "Chủ đề 1. Làm quen với tiền",
    creativeZoneName: "Vùng 1: Khu Vườn Chim Non & Đồng Xu Lấp Lánh 🐣",
    isProject: false,
    feathersReward: 3,
    badgeCode: "BADGE_TC01S_ZONE1",
    badgeName: "Bạn Nhỏ Yêu Quý Đồng Tiền",
    mapCoordinates: { x: 28, y: 65 },
    criteria: [
      { code: "TC01S.01.0004.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết vì sao phải giữ gìn đồng tiền sạch đẹp, phẳng phiu." },
      { code: "TC01S.01.0004.02", level: "Mức 2", competencyGroup: "Biết", description: "Nhận biết các hành vi làm hỏng tiền cần tránh (vò nhàu, vẽ bậy, cắt rách, để ướt)." },
      { code: "TC01S.01.0004.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thực hành vuốt phẳng tờ tiền và cất gọn vào ví nhỏ, phong bao hoặc ống heo." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐷 Bé Heo Hồng Ống Đất đội vương miện vàng xuất hiện: 'Ủn ỉn! Tờ tiền sạch đẹp, phẳng phiu mới vui làm sao! Em hãy giúp Bé Heo Hồng chọn cách giữ gìn đồng tiền đúng chuẩn nhé!'",
      worldLocationName: "Ngôi Nhà Ví Nhỏ Của Bé Heo Hồng",
      mascotGuideTip: "🎶 Vè Heo Hồng: 'Tiền phẳng em cất vào bao – Không vò, không vẽ, tự hào bé ngoan!'",
      parentCompanionTip: "Hướng dẫn con thực hành vuốt phẳng tờ tiền lẻ và xếp ngay ngắn theo thứ tự mệnh giá vào ví nhỏ.",
      mode: "NEED_VS_WANT",
      context1Title: "Em giữ gìn đồng tiền như thế nào?",
      context1Subtitle: "Cùng Bé Heo Hồng 🐷 chọn việc nên làm (Nhóm A) và việc làm hỏng tiền cần tránh (Nhóm B)",
      groupAName: "Giữ tiền sạch đẹp, phẳng phiu 👍",
      groupBName: "Làm nhàu, làm bẩn tiền 👎",
      items1: [
        { id: "g1_s4_1", name: "Vuốt phẳng tờ tiền rồi cất ngay ngắn vào ví nhỏ hoặc phong bao", emoji: "👛", correctGroup: "GROUP_A", contextReason: "Giúp tờ tiền luôn phẳng phiu, không bị rơi mất." },
        { id: "g1_s4_2", name: "Đút tiền thưởng nhẹ nhàng vào bụng Bé Heo Đất nơi khô ráo", emoji: "🐷", correctGroup: "GROUP_A", contextReason: "Giữ tiền an toàn và rèn thói quen tiết kiệm." },
        { id: "g1_s4_3", name: "Lấy bút sáp màu vẽ râu, vẽ hình lên tờ tiền", emoji: "🖍️", correctGroup: "GROUP_B", contextReason: "Vẽ bậy làm bẩn tờ tiền Việt Nam." },
        { id: "g1_s4_4", name: "Vò tròn tờ tiền nhét bừa vào túi quần khi giặt đồ", emoji: "👖", correctGroup: "GROUP_B", contextReason: "Làm nhàu nát và ướt hỏng tờ tiền." }
      ],
      questionPrompt: "🐷 Bé Heo Hồng hỏi: Khi ông bà, bố mẹ mừng tuổi hoặc thưởng tiền cho em, em ứng xử thế nào?",
      correctOptionText: "Em nhận bằng hai tay, lễ phép nói lời cảm ơn, rồi vuốt phẳng cất vào ví hoặc ống heo.",
      correctFeedback: "🏅 Xuất sắc! Em đã hoàn thành Chủ đề 1 và nhận Huy hiệu Bạn Nhỏ Yêu Quý Đồng Tiền!",
      wrongOptionText: "Cầm tiền gấp làm tàu thủy thả vào chậu nước.",
      wrongFeedback: "Nhớ giữ đồng tiền luôn khô ráo, sạch đẹp và phẳng phiu nhé!"
    })
  },
  {
    periodIndex: 5,
    lessonId: "spec_les_fin_g1_p05",
    lessonCode: "TC01S.02.0005",
    lessonName: "5. Điều em cần hay em muốn?",
    topicId: "spec_top_fin_g1_02",
    topicCode: "TC01S.02",
    officialTopicName: "Chủ đề 2. Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Siêu Thị Tí Hon Của Thỏ Trắng Thông Thái 🐰",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 34, y: 60 },
    criteria: [
      { code: "TC01S.02.0005.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Hiểu khái niệm đồ vật Cần thiết (cho ăn uống, học tập, sức khỏe) và đồ vật Mong muốn (theo sở thích nhất thời)." },
      { code: "TC01S.02.0005.02", level: "Mức 2", competencyGroup: "Biết", description: "Phân loại được các món đồ quen thuộc của học sinh lớp 1 vào nhóm Cần hoặc Muốn." },
      { code: "TC01S.02.0005.03", level: "Mức 2", competencyGroup: "Biết", description: "Biết ưu tiên chọn đồ Cần thiết trước khi nghĩ đến đồ Muốn." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐰 Thỏ Trắng Thông Thái đeo kính tròn vẫy tai chào em: 'Chào bạn nhỏ Lớp 1! Hôm nay Thỏ Trắng soạn ba lô đi học. Em hãy giúp Thỏ Trắng tách riêng đồ CẦN THIẾT và đồ chỉ là MUỐN THÊM nhé!'",
      worldLocationName: "Trạm Ba Lô Của Thỏ Trắng Thông Thái",
      mascotGuideTip: "🎶 Vè Thỏ Trắng: 'Sách vở, áo ấm là CẦN – Đồ chơi, kẹo ngọt để phần sau nha!'",
      parentCompanionTip: "Khi đi siêu thị cùng con, hãy đố vui: 'Món này thuộc đội CẦN hay đội MUỐN của bạn Thỏ Trắng nhỉ?'",
      mode: "NEED_VS_WANT",
      context1Title: "Đội CẦN THIẾT hay Đội MUỐN THÊM?",
      context1Subtitle: "Cùng Thỏ Trắng 🐰 xếp đồ vào đúng ngăn ba lô nhé",
      groupAName: "Đồ em CẦN THIẾT 🎒",
      groupBName: "Đồ em MUỐN THÊM 🎈",
      items1: [
        { id: "g1_s5_1", name: "Hộp bút chì, thước kẻ và tẩy để viết bài", emoji: "✏️", correctGroup: "GROUP_A", contextReason: "Đồ dùng học tập thiết yếu mỗi ngày đến trường." },
        { id: "g1_s5_2", name: "Bình nước ấm mang theo đi học", emoji: "🍼", correctGroup: "GROUP_A", contextReason: "Cần thiết để bảo vệ sức khỏe của em." },
        { id: "g1_s5_3", name: "Rô-bốt biến hình phát nhạc nhấp nháy", emoji: "🤖", correctGroup: "GROUP_B", contextReason: "Đồ chơi giải trí thuộc nhóm Mong muốn." },
        { id: "g1_s5_4", name: "Kẹo bông gòn bảy sắc cầu vồng", emoji: "🍭", correctGroup: "GROUP_B", contextReason: "Món quà vặt theo sở thích nhất thời." }
      ],
      questionPrompt: "🐰 Thỏ Trắng hỏi: Khi số tiền trong ví có hạn, chúng mình nên chọn mua nhóm nào trước?",
      correctOptionText: "Ưu tiên mua những món đồ CẦN THIẾT cho việc học và sức khỏe trước.",
      correctFeedback: "🐰 Thỏ Trắng nhảy chân sáo khen em! Em phân biệt Cần và Muốn chuẩn xác lắm!",
      wrongOptionText: "Mua hết kẹo và đồ chơi trước, thiếu bút vở tính sau.",
      wrongFeedback: "Nhớ lời Thỏ Trắng nhé: Đồ Cần thiết luôn phải được ưu tiên số 1!"
    })
  },
  {
    periodIndex: 6,
    lessonId: "spec_les_fin_g1_p06",
    lessonCode: "TC01S.02.0006",
    lessonName: "6. Nghĩ trước khi mua",
    topicId: "spec_top_fin_g1_02",
    topicCode: "TC01S.02",
    officialTopicName: "Chủ đề 2. Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Siêu Thị Tí Hon Của Thỏ Trắng Thông Thái 🐰",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 40, y: 55 },
    criteria: [
      { code: "TC01S.02.0006.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết dừng lại đặt câu hỏi trước khi quyết định mua một món đồ." },
      { code: "TC01S.02.0006.02", level: "Mức 2", competencyGroup: "Biết", description: "Kiểm tra xem ở nhà đã có món đồ đó chưa và số tiền hiện có có đủ không." },
      { code: "TC01S.02.0006.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Biết kiềm chế không đòi mua món đồ trùng lặp hoặc vượt quá số tiền cho phép." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐰 Thỏ Trắng giơ chiếc Đồng Hồ 3 Giây lên: 'Bí quyết của Thỏ Trắng là luôn dừng lại 3 giây để NGHĨ TRƯỚC KHI MUA! Em hãy chọn những suy nghĩ thông thái cùng Thỏ Trắng nhé!'",
      worldLocationName: "Trạm Đèn Vàng 3 Giây Suy Nghĩ",
      mascotGuideTip: "🎶 Vè Thỏ Trắng: 'Một giây ngẫm: Cần thật không? Hai giây nhớ: Nhà còn không? Ba giây nhìn giá mới thông thái nè!'",
      parentCompanionTip: "Dạy con quy tắc 'Đếm 1–2–3 cùng Thỏ Trắng' trước khi bỏ bất kỳ món đồ chơi nào vào giỏ hàng.",
      mode: "NEED_VS_WANT",
      context1Title: "3 giây Nghĩ trước khi mua cùng Thỏ Trắng",
      context1Subtitle: "Xếp thói quen Nghĩ kỹ trước khi mua (Nhóm A) và Mua vội vàng (Nhóm B)",
      groupAName: "Nghĩ kỹ trước khi mua 💡",
      groupBName: "Mua vội không suy nghĩ ⚠️",
      items1: [
        { id: "g1_s6_1", name: "Nhớ lại xem ở nhà hộp bút màu 12 cây vẫn còn mới nguyên nên không mua thêm", emoji: "🖍️", correctGroup: "GROUP_A", contextReason: "Tránh mua trùng lặp gây lãng phí." },
        { id: "g1_s6_2", name: "Nhìn bảng giá và đếm số xu trong ví xem có đủ tiền trả không", emoji: "🏷️", correctGroup: "GROUP_A", contextReason: "Mua sắm phù hợp với số tiền mình có." },
        { id: "g1_s6_3", name: "Thấy món đồ dán nhãn lấp lánh là đòi lấy ngay không cần hỏi giá", emoji: "✨", correctGroup: "GROUP_B", contextReason: "Mua theo cảm xúc vội vàng dễ làm hết sạch tiền." }
      ],
      questionPrompt: "🐰 Ở nhà em đã có 2 cục tẩy thơm còn nguyên vẹn. Khi đi nhà sách thấy cục tẩy hình kem ốc quế, em làm gì?",
      correctOptionText: "Dừng lại 3 giây, nhớ rằng ở nhà đã có đủ tẩy nên mỉm cười không mua thêm để tiết kiệm tiền.",
      correctFeedback: "🎉 Hoan hô! Thỏ Trắng tặng em huy hiệu Đồng Hồ Vàng vì biết nghĩ kỹ trước khi mua!",
      wrongOptionText: "Đòi mua thêm 5 cục tẩy nữa về xếp đầy bàn.",
      wrongFeedback: "Mua nhiều tẩy quá dùng không hết sẽ bị khô cứng và lãng phí đấy!"
    })
  },
  {
    periodIndex: 7,
    lessonId: "spec_les_fin_g1_p07",
    lessonCode: "TC01S.02.0007",
    lessonName: "7. Em là người mua sắm thông thái",
    topicId: "spec_top_fin_g1_02",
    topicCode: "TC01S.02",
    officialTopicName: "Chủ đề 2. Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Siêu Thị Tí Hon Của Thỏ Trắng Thông Thái 🐰",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 46, y: 50 },
    criteria: [
      { code: "TC01S.02.0007.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết các bước cơ bản của người mua sắm thông thái: xem tên hàng, xem giá, kiểm tra chất lượng." },
      { code: "TC01S.02.0007.02", level: "Mức 2", competencyGroup: "Biết", description: "Biết xếp hàng trật tự, thanh toán đủ tiền và nói lời cảm ơn lịch sự với người bán hàng." },
      { code: "TC01S.02.0007.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Chọn được món đồ học tập chất lượng, đúng giá trong ngân sách cho trước." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "🐰 Thỏ Trắng đưa em tới Quầy Văn Phòng Phẩm Lớp Một: 'Em có 10 Xu! Hãy giúp Thỏ Trắng chọn ít nhất 2 món đồ dùng học tập cần thiết, bền đẹp và giữ lại ít nhất 2 Xu tiền thừa nhé!'",
      worldLocationName: "Quầy Văn Phòng Phẩm Lớp Một",
      mascotGuideTip: "🎶 Vè Thỏ Trắng: 'Xem giá, chọn đồ bền lâu – Xếp hàng, cảm ơn từng câu dịu dàng!' (Gợi ý: Chọn Vở 4 Xu + Bút chì 3 Xu nhé!)",
      parentCompanionTip: "Cho con tự tay đưa tiền lẻ và nhận tiền thừa tại quầy thu ngân nhà sách dưới sự quan sát của bố mẹ.",
      budgetCoins: 10,
      minRequiredEssentialCount: 2,
      minTotalItems: 2,
      maxTotalItems: 3,
      targetChangeCoins: 2,
      products: [
        { id: "g1_s7_1", name: "Quyển vở ô ly trắng mịn Lớp 1", emoji: "📓", price: 4, tag: "ESSENTIAL", qualityNote: "Giấy dày đẹp, cần thiết để tập viết" },
        { id: "g1_s7_2", name: "Bút chì gỗ 2B bền chắc", emoji: "✏️", price: 3, tag: "ESSENTIAL", qualityNote: "Ngòi êm, vừa tay học sinh lớp 1" },
        { id: "g1_s7_3", name: "Thước kẻ nhựa trong 15cm", emoji: "📏", price: 1, tag: "USEFUL", qualityNote: "Giá hợp lý, kẻ dòng thẳng tắp" },
        { id: "g1_s7_4", name: "Đồ chơi xe đua phát sáng đắt đỏ", emoji: "🏎️", price: 9, tag: "LUXURY", qualityNote: "Tốn gần hết ví, không còn tiền mua vở bút" }
      ],
      politePrompt: "🐰 Khi tới quầy thu ngân đông người và nhận lại tiền thừa từ cô bán hàng, em làm thế nào?",
      politeCorrectText: "Em xếp hàng ngay ngắn tới lượt, nhận hàng cùng tiền thừa bằng hai tay và nói: 'Con cảm ơn cô ạ!'",
      politeCorrectFeedback: "🌟 Thỏ Trắng khen em vừa tính toán giỏi vừa là khách hàng nhí lịch sự số 1!",
      politeWrongText: "Chen ngang lên trước và giật lấy túi đồ chạy đi.",
      politeWrongFeedback: "Người mua sắm thông thái luôn xếp hàng văn minh và lễ phép cảm ơn nhé!"
    })
  },
  {
    periodIndex: 8,
    lessonId: "spec_les_fin_g1_p08",
    lessonCode: "TC01S.02.0008",
    lessonName: "8. Siêu thị tí hon",
    topicId: "spec_top_fin_g1_02",
    topicCode: "TC01S.02",
    officialTopicName: "Chủ đề 2. Chi tiêu thông minh",
    creativeZoneName: "Vùng 2: Siêu Thị Tí Hon Của Thỏ Trắng Thông Thái 🐰",
    isProject: false,
    feathersReward: 4,
    badgeCode: "BADGE_TC01S_ZONE2",
    badgeName: "Khách Hàng Nhí Thông Thái",
    mapCoordinates: { x: 52, y: 45 },
    criteria: [
      { code: "TC01S.02.0008.01", level: "Mức 2", competencyGroup: "Vận dụng", description: "Thực hành đóng vai mua sắm tại Siêu thị tí hon đúng mục tiêu và ngân sách." },
      { code: "TC01S.02.0008.02", level: "Mức 2", competencyGroup: "Vận dụng", description: "Tính nhẩm tổng tiền các món đã chọn và tiền thừa sau khi thanh toán." },
      { code: "TC01S.02.0008.03", level: "Mức 2", competencyGroup: "Vận dụng", description: "Thực hiện giao tiếp văn minh, lịch sự trong hoạt động mua bán tại Siêu thị tí hon." }
    ],
    interactive: buildShopInteractive({
      storyBrief: "🐰🛒 Chào mừng em đến với SIÊU THỊ TÍ HON của Thỏ Trắng! Mẹ giao cho em 12 Xu để mua bữa sáng bổ dưỡng. Hãy chọn ít nhất 2 món thiết yếu và tiết kiệm tối thiểu 2 Xu tiền thừa đút cho Bé Heo Hồng nhé!",
      worldLocationName: "Siêu Thị Tí Hon Vui Vẻ",
      mascotGuideTip: "🎶 Gợi ý của Thỏ Trắng: Chọn Hộp sữa tươi (4 Xu) + Bánh mì trứng (5 Xu) = 9 Xu, còn dư 3 Xu bỏ ống heo!",
      parentCompanionTip: "Bày trò chơi 'Siêu thị tí hon' ở phòng khách với 4–5 món đồ dán giá từ 1 đến 5 Xu để con thực hành.",
      budgetCoins: 12,
      minRequiredEssentialCount: 2,
      minTotalItems: 2,
      maxTotalItems: 3,
      targetChangeCoins: 2,
      products: [
        { id: "g1_s8_1", name: "Hộp sữa tươi tiệt trùng giàu canxi", emoji: "🥛", price: 4, tag: "ESSENTIAL", qualityNote: "Giúp bé cao lớn khỏe mạnh" },
        { id: "g1_s8_2", name: "Bánh mì kẹp trứng dinh dưỡng", emoji: "🥪", price: 5, tag: "ESSENTIAL", qualityNote: "Đủ năng lượng học tập suốt buổi sáng" },
        { id: "g1_s8_3", name: "Quả táo đỏ tươi ngon", emoji: "🍎", price: 1, tag: "USEFUL", qualityNote: "Giàu vitamin, giá chỉ 1 Xu" },
        { id: "g1_s8_4", name: "Hộp kẹo nổ khổng lồ nhiều phẩm màu", emoji: "🍬", price: 9, tag: "IMPULSE", qualityNote: "Không thay thế được bữa sáng và quá đắt" }
      ],
      politePrompt: "🐰 Trong Siêu thị tí hon, làm sao để em biết mình không mua vượt quá 12 Xu?",
      politeCorrectText: "Em xem giá từng món, cộng nhẩm trước khi bỏ vào giỏ và kiểm tra lại tiền thừa khi thanh toán.",
      politeCorrectFeedback: "🏆 Chúc mừng em hoàn thành Chủ đề 2 và nhận Huy hiệu Khách Hàng Nhí Thông Thái của Thỏ Trắng!",
      politeWrongText: "Cứ nhặt thật nhiều đồ vào giỏ không cần nhìn giá.",
      politeWrongFeedback: "Nhớ nhìn giá và cộng nhẩm cùng Thỏ Trắng để chi tiêu đúng ngân sách 12 Xu nhé!"
    })
  },
  {
    periodIndex: 9,
    lessonId: "spec_les_fin_g1_p09",
    lessonCode: "TC01S.03.0009",
    lessonName: "9. Tiết kiệm là siêu năng lực",
    topicId: "spec_top_fin_g1_03",
    topicCode: "TC01S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm mỗi ngày",
    creativeZoneName: "Vùng 3: Ngôi Làng Ống Heo Hồng & Gấu Mật Xanh 🐷",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 58, y: 40 },
    criteria: [
      { code: "TC01S.03.0009.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Hiểu tiết kiệm là để dành tiền bạc, thời gian và đồ dùng cho những việc có ích." },
      { code: "TC01S.03.0009.02", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết ích lợi của thói quen tiết kiệm đối với bản thân và gia đình." },
      { code: "TC01S.03.0009.03", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được hành vi tiết kiệm và hành vi tiêu xài lãng phí." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐷 Bé Heo Hồng khoác áo choàng lấp lánh reo vang: 'Tiết kiệm chính là một SIÊU NĂNG LỰC đấy các bạn Lớp 1 ơi! Mỗi đồng xu nhỏ gom lại sẽ tạo nên điều kỳ diệu! Hãy chọn các hành động mang Siêu năng lực tiết kiệm nhé!'",
      worldLocationName: "Đài Năng Lượng Của Bé Heo Hồng",
      mascotGuideTip: "🎶 Vè Heo Hồng: 'Mỗi ngày tiết kiệm một xu – Gom thành năng lực vi vu ước mơ!'",
      parentCompanionTip: "Gọi mỗi lần con bỏ ống heo là 'nạp siêu năng lực cho Bé Heo Hồng' để con hào hứng.",
      mode: "NEED_VS_WANT",
      context1Title: "Kích hoạt Siêu năng lực Tiết kiệm!",
      context1Subtitle: "Cùng Bé Heo Hồng 🐷 xếp vào nhóm Siêu năng lực Tiết kiệm (Nhóm A) và Lãng phí (Nhóm B)",
      groupAName: "Siêu năng lực Tiết kiệm 🌟",
      groupBName: "Thói quen Lãng phí ⚠️",
      items1: [
        { id: "g1_s9_1", name: "Cất tiền thừa sau khi mua vở vào bụng Bé Heo Đất", emoji: "🐷", correctGroup: "GROUP_A", contextReason: "Tích tiểu thành đại, nuôi lớn quỹ tiết kiệm." },
        { id: "g1_s9_2", name: "Viết hết từng trang vở, không xé giấy trắng gấp máy bay", emoji: "📒", correctGroup: "GROUP_A", contextReason: "Tiết kiệm giấy vở và bảo vệ cây xanh." },
        { id: "g1_s9_3", name: "Lấy thức ăn quá nhiều rồi bỏ thừa mứa trên đĩa", emoji: "🍽️", correctGroup: "GROUP_B", contextReason: "Lãng phí thức ăn và công sức người nấu." },
        { id: "g1_s9_4", name: "Có tiền là mua kẹo ăn hết ngay trong một buổi", emoji: "🍬", correctGroup: "GROUP_B", contextReason: "Không để dành được đồng xu nào cho việc cần thiết." }
      ],
      questionPrompt: "🐷 Bé Heo Hồng hỏi: Vì sao tiết kiệm lại được gọi là 'Siêu năng lực' của học sinh Lớp 1?",
      correctOptionText: "Vì tiết kiệm giúp những đồng xu nhỏ gom lại thành khoản tiền lớn để thực hiện ước mơ và giúp đỡ mọi người.",
      correctFeedback: "⚡ Tuyệt vời! Siêu năng lực tiết kiệm của em và Bé Heo Hồng đã tỏa sáng!",
      wrongOptionText: "Vì tiết kiệm là cất giấu hết đồ dùng không cho ai mượn bao giờ.",
      wrongFeedback: "Tiết kiệm là tránh lãng phí để dùng vào việc có ích và biết sẻ chia đúng lúc nhé!"
    })
  },
  {
    periodIndex: 10,
    lessonId: "spec_les_fin_g1_p10",
    lessonCode: "TC01S.03.0010",
    lessonName: "10. Ước mơ trong ống heo",
    topicId: "spec_top_fin_g1_03",
    topicCode: "TC01S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm mỗi ngày",
    creativeZoneName: "Vùng 3: Ngôi Làng Ống Heo Hồng & Gấu Mật Xanh 🐷",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 64, y: 35 },
    criteria: [
      { code: "TC01S.03.0010.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết đặt ra một mục tiêu tiết kiệm nhỏ, phù hợp với lứa tuổi lớp 1." },
      { code: "TC01S.03.0010.02", level: "Mức 2", competencyGroup: "Biết", description: "Hiểu rằng cần kiên trì bỏ ống heo từng chút một để đạt tới ước mơ." },
      { code: "TC01S.03.0010.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Tính được số tuần cần để dành để nuôi ống heo chạm tới món quà mơ ước." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "🐷 Bé Heo Hồng lắc lư cái bụng tròn: 'Trong bụng tớ đang ấp ủ ước mơ của em đấy! Hãy chọn 1 món quà ước mơ vừa sức và tính xem mỗi tuần đút mấy Xu để Bé Heo Hồng biến ước mơ thành sự thật nhé!'",
      worldLocationName: "Đồi Ống Heo Ước Mơ",
      mascotGuideTip: "🎶 Vè Heo Hồng: 'Ước mơ nho nhỏ trong tim – Mỗi tuần góp nhặt, chẳng tìm đâu xa!'",
      parentCompanionTip: "Cùng con vẽ hoặc dán hình món đồ con mơ ước lên cạnh ống heo ở góc học tập.",
      mode: "DREAM_TARGET",
      totalCoins: 15,
      dreamTargets: [
        { id: "g1_dream_1", name: "Cuốn truyện cổ tích tranh màu (10 Xu)", emoji: "📘", targetCoins: 10, suggestedWeeklySave: 2, weeksToGoal: 5 },
        { id: "g1_dream_2", name: "Hộp bút sáp 12 màu tươi sáng (12 Xu)", emoji: "🖍️", targetCoins: 12, suggestedWeeklySave: 3, weeksToGoal: 4 },
        { id: "g1_dream_3", name: "Chậu cây sen đá nhỏ xinh (9 Xu)", emoji: "🪴", targetCoins: 9, suggestedWeeklySave: 3, weeksToGoal: 3 }
      ],
      twistPrompt: "🐷 Khi Bé Heo Hồng chỉ còn thiếu 2 Xu nữa là đủ tiền mua cuốn truyện cổ tích, em thấy xe bán đồ chơi dạo đi qua. Em sẽ làm gì?",
      twistCorrectText: "Em mỉm cười lắc đầu với đồ chơi vặt, đút 2 Xu vào bụng Bé Heo Hồng để hoàn thành ước mơ mua truyện cổ tích!",
      twistCorrectFeedback: "🎉 Hoan hô! Bé Heo Hồng nhảy múa chúc mừng em đã kiên trì chạm tới ước mơ!",
      twistWrongText: "Lấy hết tiền trong ống heo ra mua đồ chơi nhựa dùng một lúc rồi hỏng.",
      twistWrongFeedback: "Hãy kiên trì thêm một chút cùng Bé Heo Hồng để thực hiện ước mơ đẹp nhé!"
    })
  },
  {
    periodIndex: 11,
    lessonId: "spec_les_fin_g1_p11",
    lessonCode: "TC01S.03.0011",
    lessonName: "11. Tiết kiệm từ việc nhỏ",
    topicId: "spec_top_fin_g1_03",
    topicCode: "TC01S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm mỗi ngày",
    creativeZoneName: "Vùng 3: Ngôi Làng Ống Heo Hồng & Gấu Mật Xanh 🐷",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 70, y: 30 },
    criteria: [
      { code: "TC01S.03.0011.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Nhận biết tiết kiệm điện, nước, giấy vở và bảo quản đồ dùng cũng chính là tiết kiệm tiền cho gia đình." },
      { code: "TC01S.03.0011.02", level: "Mức 2", competencyGroup: "Biết", description: "Phân biệt được việc nhỏ em tự làm được và việc liên quan tới điện/trên cao cần nhờ người lớn." },
      { code: "TC01S.03.0011.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thực hiện tắt đèn, khóa vòi nước, đậy nắp bút màu và giữ gìn sách vở hằng ngày." }
    ],
    interactive: buildVillageInteractive({
      storyBrief: "🐻 Bạn Gấu Mật Ấm Áp choàng khăn lá xanh vẫy gọi: 'Tiết kiệm bắt đầu từ những việc nhỏ xíu quanh mình! Hãy cùng Gấu Mật khóa vòi nước, cất bút màu và nhớ gọi người lớn khi ổ điện bị hỏng để đảm bảo an toàn nhé!'",
      worldLocationName: "Ngôi Làng Xanh Của Gấu Mật",
      mascotGuideTip: "🎶 Vè Gấu Mật: 'Khóa nước, cất bút tự tay – Việc cao, ổ điện gọi ngay người nhà!'",
      parentCompanionTip: "Giao cho con nhiệm vụ 'Đội trưởng Gấu Mật' kiểm tra vòi nước đã khóa chặt chưa sau khi rửa tay.",
      nodes: [
        {
          id: "g1_v11_1",
          title: "Khóa vòi nước sau khi rửa tay",
          emoji: "🚰",
          category: "WATER",
          brokenStateText: "Vòi nước đang chảy rỉ rả lãng phí",
          fixedStateText: "Đã tự tay khóa vòi nước chặt",
          correctActor: "SELF_ACTION",
          explanation: "Học sinh lớp 1 hoàn toàn tự khóa vòi nước được sau khi rửa tay."
        },
        {
          id: "g1_v11_2",
          title: "Đóng nắp bút màu và xếp vào hộp sau giờ vẽ",
          emoji: "🖍️",
          category: "REUSE",
          brokenStateText: "Bút màu mở nắp vương vãi dễ khô mực",
          fixedStateText: "Đã đóng nắp và cất gọn vào hộp",
          correctActor: "SELF_ACTION",
          explanation: "Giữ đồ dùng bền lâu giúp bố mẹ không tốn tiền mua mới."
        },
        {
          id: "g1_v11_3",
          title: "Ổ cắm điện trên tường bị lỏng và xẹt tia lửa",
          emoji: "⚡",
          category: "ENERGY",
          brokenStateText: "Ổ điện bị lỏng nguy hiểm!",
          fixedStateText: "Đã đứng xa và gọi bố mẹ/thầy cô kiểm tra",
          correctActor: "ADULT_HELP",
          explanation: "Trẻ em tuyệt đối không tự chạm vào ổ điện hỏng mà phải báo người lớn!"
        },
        {
          id: "g1_v11_4",
          title: "Bóng đèn trên trần nhà cao bị nhấp nháy",
          emoji: "💡",
          category: "ENERGY",
          brokenStateText: "Đèn trên trần cao bị hỏng",
          fixedStateText: "Đã nhờ người lớn kiểm tra và sửa đèn",
          correctActor: "ADULT_HELP",
          explanation: "Thiết bị điện ở trên cao phải nhờ người lớn xử lý an toàn."
        }
      ]
    })
  },
  {
    periodIndex: 12,
    lessonId: "spec_les_fin_g1_p12",
    lessonCode: "TC01S.03.0012",
    lessonName: "12. Nhật ký tiết kiệm",
    topicId: "spec_top_fin_g1_03",
    topicCode: "TC01S.03",
    officialTopicName: "Chủ đề 3. Tiết kiệm mỗi ngày",
    creativeZoneName: "Vùng 3: Ngôi Làng Ống Heo Hồng & Gấu Mật Xanh 🐷",
    isProject: false,
    feathersReward: 4,
    badgeCode: "BADGE_TC01S_ZONE3",
    badgeName: "Siêu Anh Hùng Tiết Kiệm Nhí",
    mapCoordinates: { x: 76, y: 25 },
    criteria: [
      { code: "TC01S.03.0012.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Hiểu tác dụng của việc ghi chép hoặc đánh dấu Nhật ký tiết kiệm mỗi tuần." },
      { code: "TC01S.03.0012.02", level: "Mức 2", competencyGroup: "Biết", description: "Nhận ra được khoản chi nào là cần thiết và khoản nào có thể cắt giảm để tăng tiền tiết kiệm." },
      { code: "TC01S.03.0012.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Tính được số xu còn lại bỏ vào ống heo sau các khoản chi trong tuần." }
    ],
    interactive: buildDiaryAdInteractive({
      storyBrief: "🐿️ Bạn Sóc Nâu Chăm Chỉ mở cuốn sổ nhỏ: 'Chào em! Sóc Nâu có 12 Xu trong tuần này. Hãy cùng Sóc Nâu tính tổng số xu đã tiêu, số xu còn lại bỏ vào ống heo và đánh dấu món nào chưa cần thiết nhé!'",
      worldLocationName: "Lều Nhật Ký Của Sóc Nâu",
      mascotGuideTip: "🎶 Vè Sóc Nâu: 'Mười hai xu nhỏ đầu tuần – Tiêu tám còn bốn, góp phần heo ngoan!' (3 + 2 + 2 + 1 = 8 Xu, còn 4 Xu nhé!)",
      parentCompanionTip: "Làm một bảng 'Nhật ký tiết kiệm' dán sticker ngôi sao mỗi ngày con tiết kiệm điện nước hoặc bỏ ống heo.",
      mode: "COIN_DIARY",
      startingCoins: 12,
      diaryEntries: [
        { id: "g1_d12_1", itemName: "Mua quyển vở tập viết chữ đẹp", emoji: "📓", cost: 3, isNecessary: true, note: "Đồ dùng học tập cần thiết" },
        { id: "g1_d12_2", itemName: "Mua kẹo dẻo hình khủng long", emoji: "🍬", cost: 2, isNecessary: false, note: "Quà vặt chưa cần thiết" },
        { id: "g1_d12_3", itemName: "Mua cục tẩy trắng", emoji: "🧼", cost: 2, isNecessary: true, note: "Cần thiết khi làm bài" },
        { id: "g1_d12_4", itemName: "Mua đồ chơi bong bóng xà phòng", emoji: "🫧", cost: 1, isNecessary: false, note: "Mua theo hứng nhất thời" }
      ]
    })
  },
  {
    periodIndex: 13,
    lessonId: "spec_les_fin_g1_p13",
    lessonCode: "TC01S.04.0013",
    lessonName: "13. Biết chia sẻ yêu thương",
    topicId: "spec_top_fin_g1_04",
    topicCode: "TC01S.04",
    officialTopicName: "Chủ đề 4. Em làm chủ đồng tiền",
    creativeZoneName: "Vùng 4: Đồi Ba Chiếc Hũ Của Sóc Nâu Chăm Chỉ 🐿️",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 82, y: 20 },
    criteria: [
      { code: "TC01S.04.0013.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Hiểu rằng đồng tiền và đồ dùng mang lại niềm vui lớn hơn khi biết chia sẻ, giúp đỡ người khác." },
      { code: "TC01S.04.0013.02", level: "Mức 2", competencyGroup: "Biết", description: "Nêu được những cách chia sẻ phù hợp với học sinh lớp 1 (cho bạn mượn bút, tặng sách cũ, góp quỹ Kế hoạch nhỏ)." },
      { code: "TC01S.04.0013.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thực hiện hành động chia sẻ chân thành, lễ phép và tôn trọng bạn bè." }
    ],
    interactive: buildBackpackInteractive({
      storyBrief: "🐻 Bạn Gấu Mật Ấm Áp ôm hộp quà trái tim mỉm cười: 'Khi chúng mình biết chia sẻ yêu thương, niềm vui sẽ nhân đôi đấy! Hãy cùng Gấu Mật chọn những việc làm nhân ái của học sinh Lớp 1 nhé!'",
      worldLocationName: "Vườn Hoa Sẻ Chia Của Gấu Mật",
      mascotGuideTip: "🎶 Vè Gấu Mật: 'Cho bạn mượn bút, tặng quà – Sẻ chia ấm áp, chan hòa yêu thương!'",
      parentCompanionTip: "Cùng con soạn những cuốn truyện thiếu nhi còn mới để quyên góp cho Tủ sách Nhân ái của trường.",
      mode: "NEED_VS_WANT",
      context1Title: "Trái tim ấm áp biết chia sẻ yêu thương",
      context1Subtitle: "Cùng Gấu Mật 🐻 xếp hành động Biết chia sẻ (Nhóm A) và Ích kỷ/Chưa biết chia sẻ (Nhóm B)",
      groupAName: "Biết chia sẻ yêu thương 💖",
      groupBName: "Chưa biết quan tâm chia sẻ ⚠️",
      items1: [
        { id: "g1_s13_1", name: "Tặng truyện tranh đã đọc xong còn mới cho Tủ sách lớp học", emoji: "📚", correctGroup: "GROUP_A", contextReason: "Giúp các bạn trong lớp cùng được đọc sách hay." },
        { id: "g1_s13_2", name: "Trích 2 Xu từ heo đất ủng hộ các bạn nhỏ vùng lũ lụt", emoji: "💝", correctGroup: "GROUP_A", contextReason: "Biết dùng tiền tiết kiệm để giúp đỡ người khó khăn." },
        { id: "g1_s13_3", name: "Vui vẻ cho bạn cùng bàn mượn bút chì khi bạn lỡ quên", emoji: "✏️", correctGroup: "GROUP_A", contextReason: "Quan tâm, giúp đỡ bạn bè trong lớp." },
        { id: "g1_s13_4", name: "Giấu hết đồ chơi và sách truyện không cho ai chạm vào", emoji: "🙅", correctGroup: "GROUP_B", contextReason: "Chưa biết mở lòng sẻ chia cùng bạn bè." }
      ],
      questionPrompt: "🐻 Gấu Mật hỏi: Khi em chia sẻ sách truyện hoặc giúp đỡ bạn bè, điều tuyệt vời gì sẽ xảy ra?",
      correctOptionText: "Cả người nhận và chính em đều cảm thấy vui vẻ, ấm áp và gắn kết tình bạn đẹp.",
      correctFeedback: "💖 Gấu Mật ôm em thật chặt! Trái tim nhân ái của em thật đáng quý!",
      wrongOptionText: "Chia sẻ làm mình mất hết niềm vui.",
      wrongFeedback: "Cho đi yêu thương luôn làm niềm vui của chúng mình lớn thêm gấp bội đấy!"
    })
  },
  {
    periodIndex: 14,
    lessonId: "spec_les_fin_g1_p14",
    lessonCode: "TC01S.04.0014",
    lessonName: "14. Kế hoạch chi tiêu đầu tiên",
    topicId: "spec_top_fin_g1_04",
    topicCode: "TC01S.04",
    officialTopicName: "Chủ đề 4. Em làm chủ đồng tiền",
    creativeZoneName: "Vùng 4: Đồi Ba Chiếc Hũ Của Sóc Nâu Chăm Chỉ 🐿️",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 88, y: 15 },
    criteria: [
      { code: "TC01S.04.0014.01", level: "Mức 1", competencyGroup: "Hiểu", description: "Biết ý nghĩa của 3 chiếc hũ tài chính đầu tiên: Hũ Cần thiết, Hũ Tiết kiệm và Hũ Chia sẻ." },
      { code: "TC01S.04.0014.02", level: "Mức 2", competencyGroup: "Biết", description: "Biết sắp xếp thứ tự ưu tiên trước khi sử dụng số tiền mình có." },
      { code: "TC01S.04.0014.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Thực hành chia 10 Xu vào 3 chiếc hũ hợp lý theo kế hoạch chi tiêu đầu tiên." }
    ],
    interactive: buildNestInteractive({
      storyBrief: "🐿️ Bạn Sóc Nâu Chăm Chỉ mang ra 3 chiếc hũ hạt dẻ xinh xắn: 'Em có 10 Xu! Hãy cùng Sóc Nâu lập Kế hoạch chi tiêu đầu tiên bằng cách chia đủ 10 Xu vào 3 chiếc hũ: Cần thiết – Tiết kiệm – Chia sẻ nhé!'",
      worldLocationName: "Cây Đại Thụ Ba Chiếc Hũ Của Sóc Nâu",
      mascotGuideTip: "🎶 Vè Sóc Nâu: 'Ba chiếc hũ nhỏ xinh xinh: Cần dùng (4–6 Xu), Tiết kiệm (2–4 Xu), Nghĩa tình sẻ chia (1–3 Xu)!'",
      parentCompanionTip: "Làm 3 chiếc hũ trong suốt dán hình Sóc Nâu, Heo Hồng, Gấu Mật để con tập chia tiền thưởng.",
      mode: "ALLOCATE_JARS",
      totalCoins: 10,
      jars: [
        { id: "g1_jar_need", name: "Hũ Chi tiêu cần thiết", emoji: "🎒", minCoins: 4, maxCoins: 6, description: "Mua bút chì, vở, đồ dùng học tập" },
        { id: "g1_jar_save", name: "Hũ Tiết kiệm ống heo", emoji: "🐷", minCoins: 2, maxCoins: 4, description: "Để dành nuôi ước mơ nhỏ" },
        { id: "g1_jar_share", name: "Hũ Chia sẻ yêu thương", emoji: "💝", minCoins: 1, maxCoins: 3, description: "Ủng hộ bạn khó khăn & mua quà tặng người thân" }
      ],
      twistPrompt: "🐿️ Sóc Nâu đố em: Sau khi đã chia 10 Xu vào 3 chiếc hũ, khi cần mua bút chì mới đi học, em lấy xu từ chiếc hũ nào?",
      twistCorrectText: "Em lấy đúng ở Hũ Chi tiêu cần thiết và giữ nguyên Hũ Tiết kiệm cùng Hũ Chia sẻ.",
      twistCorrectFeedback: "🐿️ Sóc Nâu vỗ tay khen ngợi! Kế hoạch chi tiêu đầu tiên của em chuẩn xác 100%!",
      twistWrongText: "Đổ cả 3 hũ ra trộn lẫn rồi tiêu hết sạch.",
      twistWrongFeedback: "Giữ đúng mục đích từng chiếc hũ mới là bí quyết của kế hoạch chi tiêu nhé!"
    })
  },
  {
    periodIndex: 15,
    lessonId: "spec_les_fin_g1_p15",
    lessonCode: "TC01S.04.0015",
    lessonName: "15. Nhà quản lí tài chính nhí",
    topicId: "spec_top_fin_g1_04",
    topicCode: "TC01S.04",
    officialTopicName: "Chủ đề 4. Em làm chủ đồng tiền",
    creativeZoneName: "Vùng 4: Đồi Ba Chiếc Hũ Của Sóc Nâu Chăm Chỉ 🐿️",
    isProject: true,
    feathersReward: 5,
    badgeCode: "BADGE_TC01S_CHAMPION",
    badgeName: "Nhà Quản Lí Tài Chính Nhí Khối 1",
    mapCoordinates: { x: 94, y: 10 },
    criteria: [
      { code: "TC01S.04.0015.01", level: "Mức 2", competencyGroup: "Biết", description: "Tổng hợp được các thói quen tốt của Nhà quản lí tài chính nhí: giữ tiền sạch đẹp, mua đồ cần thiết, chăm tiết kiệm và biết sẻ chia." },
      { code: "TC01S.04.0015.02", level: "Mức 3", competencyGroup: "Vận dụng", description: "Phân bổ hợp lý ngân sách 15 Xu vào các hoạt động Chi tiêu cần thiết – Tiết kiệm – Chia sẻ." },
      { code: "TC01S.04.0015.03", level: "Mức 3", competencyGroup: "Vận dụng", description: "Tự tin chia sẻ kế hoạch quản lí đồng tiền nhỏ của bản thân với thầy cô và gia đình." }
    ],
    interactive: buildDiaryAdInteractive({
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "🏆🐿️🐣🐷🐰🐻 CHẶNG 15 VỀ ĐÍCH: NHÀ QUẢN LÍ TÀI CHÍNH NHÍ! Cả 5 người bạn hoạt hình (Chim Non, Heo Hồng, Thỏ Trắng, Gấu Mật, Sóc Nâu) cùng cổ vũ em! Với 15 Xu, hãy phân bổ hợp lý: Tiết kiệm ít nhất 4 Xu, Chia sẻ ít nhất 2 Xu để nhận Vương Miện Nhà Quản Lí Tài Chính Nhí Khối 1 nhé!",
      worldLocationName: "Đài Vinh Danh Biệt Đội Hoạt Hình Sky-Line",
      mascotGuideTip: "🎶 Đồng ca 5 bạn nhỏ: 'Giữ tiền sạch – Mua đồ cần – Chăm tiết kiệm – Biết sẻ chia!' (Nhớ dành >= 4 Xu Tiết kiệm & >= 2 Xu Chia sẻ nhé!)",
      practicalPrompt: "Em hãy kể 1 việc tốt về giữ gìn đồng tiền, tiết kiệm hoặc chia sẻ mà em đã làm được cùng gia đình nhé!",
      parentCompanionTip: "Chúc mừng con hoàn thành trọn vẹn 15 bài học Khối 1 (TC01S)! Bố mẹ hãy trao cho con một cái ôm tự hào nhé!",
      mode: "MASTER_FINANCE_CAPSTONE",
      startingCoins: 15,
      diaryEntries: [
        { id: "g1_cap_1", itemName: "Mua sách truyện & đồ dùng học tập cần thiết", emoji: "📚", cost: 8, isNecessary: true, note: "Chi tiêu thông minh cùng Thỏ Trắng 🐰" },
        { id: "g1_cap_2", itemName: "Đút ống heo tiết kiệm nuôi ước mơ", emoji: "🐷", cost: 5, isNecessary: true, note: "Tiết kiệm mỗi ngày cùng Heo Hồng 🐷" },
        { id: "g1_cap_3", itemName: "Góp quỹ Chia sẻ yêu thương giúp bạn", emoji: "💝", cost: 2, isNecessary: true, note: "Chia sẻ ấm áp cùng Gấu Mật 🐻" }
      ],
      capstoneChallenge: {
        totalBudget: 15,
        minSaveCoins: 4,
        minShareCoins: 2,
        surpriseQuestion: "🌟 Biệt đội 5 bạn hoạt hình Sky-Line hỏi em: Điều gì tạo nên một Nhà Quản Lí Tài Chính Nhí Lớp 1 xuất sắc?",
        surpriseOptions: [
          {
            id: "g1_proj_right",
            text: "Biết ơn bố mẹ, giữ tiền phẳng phiu, ưu tiên mua đồ Cần thiết, chăm chỉ tiết kiệm ống heo và biết chia sẻ yêu thương!",
            isCorrect: true,
            feedback: "🎆 CHÚC MỪNG NHÀ QUẢN LÍ TÀI CHÍNH NHÍ KHỐI 1! Chim Non, Heo Hồng, Thỏ Trắng, Gấu Mật và Sóc Nâu vô cùng tự hào về em!"
          },
          {
            id: "g1_proj_wrong",
            text: "Tiêu hết sạch tiền mua đồ chơi và kẹo ngọt ngay từ ngày đầu tiên.",
            isCorrect: false,
            feedback: "Nhà quản lí tài chính nhí luôn nhớ dành phần Tiết kiệm và Chia sẻ yêu thương nhé!"
          }
        ]
      }
    })
  }
];

// ============================================================================
// REGISTRY ĐA KHỐI (KHỐI 1 -> KHỐI 5) & HÀM TRA CỨU DÙNG CHUNG
// ============================================================================

export const GRADE_CURRICULUM_BUNDLES: Record<string, GradeCurriculumBundle> = {
  "1": {
    grade: "1",
    curriculumCode: "TC01S",
    curriculumTitle: "Giáo dục Tài chính Khối 1 – Hệ S (TC01S)",
    versionCode: "v1.0-TC01S-2026",
    zones: TC01S_ZONES,
    stages: TC01S_STAGES
  },
  "2": {
    grade: "2",
    curriculumCode: "TC02S",
    curriculumTitle: "Giáo dục Tài chính Khối 2 – Hệ S (TC02S)",
    versionCode: "v1.0-TC02S-2026",
    zones: TC02S_ZONES,
    stages: TC02S_STAGES
  },
  "3": {
    grade: "3",
    curriculumCode: "TC03S",
    curriculumTitle: "Giáo dục Tài chính Khối 3 – Hệ S (TC03S)",
    versionCode: "v1.0-TC03S-2026",
    zones: TC03S_ZONES,
    stages: TC03S_STAGES
  },
  "4": {
    grade: "4",
    curriculumCode: "TC04S",
    curriculumTitle: "Giáo dục Tài chính Khối 4 – Hệ S (TC04S)",
    versionCode: "v1.0-TC04S-2026",
    zones: TC04S_ZONES,
    stages: TC04S_STAGES
  },
  "5": {
    grade: "5",
    curriculumCode: "TC05S",
    curriculumTitle: "Giáo dục Tài chính Khối 5 – Hệ S (TC05S)",
    versionCode: "v1.0-TC05S-2026",
    zones: TC05S_ZONES,
    stages: TC05S_STAGES
  }
};

export const ALL_FIN_EDU_STAGES: TC02SStageDefinition[] = [
  ...TC01S_STAGES,
  ...TC02S_STAGES,
  ...TC03S_STAGES,
  ...TC04S_STAGES,
  ...TC05S_STAGES
];

export function normalizeElementaryGrade(rawGrade?: string | null): string {
  const digits = String(rawGrade || "").replace(/\D/g, "");
  if (digits && ["1", "2", "3", "4", "5"].includes(digits)) {
    return digits;
  }
  return "2";
}

export function getGradeCurriculumBundle(grade?: string | null): GradeCurriculumBundle {
  const g = normalizeElementaryGrade(grade);
  return GRADE_CURRICULUM_BUNDLES[g] || GRADE_CURRICULUM_BUNDLES["2"];
}

export function getCurriculumBundleByProgramCode(programCode?: string | null): GradeCurriculumBundle {
  const code = String(programCode || "").trim().toUpperCase();
  for (const bundle of Object.values(GRADE_CURRICULUM_BUNDLES)) {
    if (bundle.curriculumCode === code) {
      return bundle;
    }
  }
  const match = code.match(/TC0([1-5])S/);
  if (match) {
    return getGradeCurriculumBundle(match[1]);
  }
  return GRADE_CURRICULUM_BUNDLES["2"];
}

export function getAnyStageByLessonCode(lessonCode: string): TC02SStageDefinition | undefined {
  return ALL_FIN_EDU_STAGES.find(
    (s) => s.lessonCode === lessonCode || s.lessonId === lessonCode
  );
}

export function getStageGradeAndProgramCode(lessonCode: string): { grade: string; curriculumCode: string } {
  for (const [grade, bundle] of Object.entries(GRADE_CURRICULUM_BUNDLES)) {
    if (bundle.stages.some((s) => s.lessonCode === lessonCode || s.lessonId === lessonCode)) {
      return { grade, curriculumCode: bundle.curriculumCode };
    }
  }
  return { grade: "2", curriculumCode: "TC02S" };
}

