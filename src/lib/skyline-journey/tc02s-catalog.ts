/**
 * Nền tảng Hành trình Sky-Line (Khối 1–5) & Danh mục Chuẩn Đảo Tài Chính 2S (Mã TC02S)
 * Ánh xạ 1-1 với PPCT_MON_GIAO_DUC_TAI_CHINH_2S.xlsx (3 Chủ đề / Vùng, 15 Bài học / Chặng, 55 Tiêu chuẩn).
 */

export type GameMechanicType =
  | "BACKPACK_BUILDER"     // A. Chuẩn bị hành lý & Phân loại theo bối cảnh
  | "BIRD_SHOP"            // B. Cửa hàng của chim (Mua sắm, bán hàng, hội chợ, kế hoạch)
  | "DREAM_NEST"           // C. Xây tổ ước mơ & Hũ xu thông thái (Phân bổ, tiết kiệm, sẻ chia)
  | "VILLAGE_RESCUE"       // D. Giải cứu ngôi làng (Tiết kiệm điện nước, giá trị lao động, tái chế)
  | "COIN_DIARY_AD_STREET";// E. Nhật ký đồng xu & Phố quảng cáo

export type StageEvaluationMode =
  | "AUTO_OBJECTIVE"       // Nhiệm vụ khách quan chấm tự động
  | "HYBRID_TEACHER";      // Tự động chấm thử thách + Giáo viên xác nhận thực hành/tình huống mở

export interface GradeDifferentiationProfile {
  grade: string;
  label: string;
  uiDensity: "LARGE_VISUAL_MINIMAL_TEXT" | "FRIENDLY_SCENARIO" | "MULTI_STEP" | "RESOURCE_PLANNING" | "MINI_PROJECT";
  mathScopeMax: number;
  stepsPerQuest: number;
  enableVoiceNarration: boolean;
  pedagogicalFocus: string;
}

export const GRADE_DIFFERENTIATION_PROFILES: Record<string, GradeDifferentiationProfile> = {
  "1": {
    grade: "1",
    label: "Khối 1 – Khởi đầu Khám phá",
    uiDensity: "LARGE_VISUAL_MINIMAL_TEXT",
    mathScopeMax: 20,
    stepsPerQuest: 1,
    enableVoiceNarration: true,
    pedagogicalFocus: "Hình ảnh lớn, ít chữ, một thao tác mỗi bước; hỗ trợ đọc lời dẫn âm thanh."
  },
  "2": {
    grade: "2",
    label: "Khối 2 – Tình huống Gần gũi (Chuẩn TC02S)",
    uiDensity: "FRIENDLY_SCENARIO",
    mathScopeMax: 100,
    stepsPerQuest: 3,
    enableVoiceNarration: true,
    pedagogicalFocus: "Tình huống gần gũi, phân loại Cần – Muốn theo bối cảnh, mua bán và phân bổ đơn giản trong phạm vi 100."
  },
  "3": {
    grade: "3",
    label: "Khối 3 – Lựa chọn & Hệ quả",
    uiDensity: "MULTI_STEP",
    mathScopeMax: 1000,
    stepsPerQuest: 4,
    enableVoiceNarration: false,
    pedagogicalFocus: "Nhiệm vụ nhiều bước, phân tích lựa chọn và quan sát hệ quả nối tiếp."
  },
  "4": {
    grade: "4",
    label: "Khối 4 – Lập Kế hoạch & Quản lý Tài nguyên",
    uiDensity: "RESOURCE_PLANNING",
    mathScopeMax: 10000,
    stepsPerQuest: 4,
    enableVoiceNarration: false,
    pedagogicalFocus: "Lập kế hoạch chi tiêu - tiết kiệm theo tuần/tháng, quản lý tài nguyên và nhiệm vụ hợp tác."
  },
  "5": {
    grade: "5",
    label: "Khối 5 – Dự án Nhỏ & Tự nhìn nhận",
    uiDensity: "MINI_PROJECT",
    mathScopeMax: 100000,
    stepsPerQuest: 5,
    enableVoiceNarration: false,
    pedagogicalFocus: "Dự án tài chính nhỏ, điều chỉnh kế hoạch trước rủi ro và tự nhìn nhận năng lực."
  }
};

export interface OfficialCriterionDef {
  code: string;
  level: string;
  competencyGroup: "Hiểu" | "Biết" | "Vận dụng";
  description: string;
}

export interface BackpackItemOption {
  id: string;
  name: string;
  icon: string;
  costCoins?: number;
  categoryByContext: Record<string, "NEED" | "WANT" | "NO_MONEY_NEEDED">;
  explanationByContext: Record<string, string>;
}

export interface BackpackContextDef {
  id: string;
  title: string;
  weatherOrSetting: string;
  skylineIntro: string;
  targetNeedCount: number;
}

export interface ShopItemOption {
  id: string;
  name: string;
  icon: string;
  price: number;
  needTag: "STUDY" | "FOOD_HEALTHY" | "ESSENTIAL" | "TOY_WANT" | "SHARE_GIFT" | "CRAFT_MATERIAL";
  qualityLabel: string;
  isHighQuality: boolean;
  adHookLabel?: string;
  description: string;
}

export interface VillageHotspotOption {
  id: string;
  title: string;
  icon: string;
  problemState: string;
  restoredState: string;
  correctActionId: string;
  safetyType: "SELF_DO" | "ASK_ADULT"; // Phân biệt việc HS tự làm được và việc cần nhờ người lớn
  actions: Array<{
    id: string;
    label: string;
    isCorrect: boolean;
    feedback: string;
  }>;
}

export interface StageInteractiveConfig {
  mechanic: GameMechanicType;
  evaluationMode: StageEvaluationMode;
  storyBrief: string;
  worldLocationName: string;
  mascotGuideTip: string;
  practicalPrompt?: string;
  parentCompanionTip: string;
  // Mechanic A: BACKPACK_BUILDER
  backpackConfig?: {
    mode: "NEED_VS_WANT" | "MONEY_VS_NO_MONEY";
    contexts: Array<{
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      targetGroupAName: string;
      targetGroupBName: string;
      items: Array<{
        id: string;
        name: string;
        emoji: string;
        correctGroup: "GROUP_A" | "GROUP_B";
        contextReason: string;
      }>;
    }>;
    reasonQuestion: {
      prompt: string;
      options: Array<{ id: string; text: string; isOptimal: boolean; feedback: string }>;
    };
  };
  // Mechanic B: BIRD_SHOP
  shopConfig?: {
    shopName: string;
    walletBudget: number;
    minRequiredItems: number;
    requiredNeedTags: string[];
    requireQualityCheck?: boolean;
    requirePriorityListFirst?: boolean;
    items: ShopItemOption[];
    changeScenario: {
      prompt: string;
      itemTotalExample: number;
      coinGivenExample: number;
      correctChange: number;
      shopkeeperGivenChange: number; // Có thể trả nhầm để kiểm tra ứng xử lịch sự
      politeResponses: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
      }>;
    };
  };
  // Mechanic C: DREAM_NEST
  nestConfig?: {
    mode: "ALLOCATE_JARS" | "SAVINGS_PIGGY_PLAN" | "HAPPY_SHARING";
    totalCoins: number;
    jars: Array<{
      id: string;
      name: string;
      emoji: string;
      minCoins: number;
      maxCoins: number;
      description: string;
    }>;
    goals?: Array<{
      id: string;
      name: string;
      emoji: string;
      targetCoins: number;
      weeksSuggested: number;
      ageAppropriate: boolean;
      feedback: string;
    }>;
    unexpectedTwist: {
      prompt: string;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
      }>;
    };
  };
  // Mechanic D: VILLAGE_RESCUE
  villageConfig?: {
    villageTheme: "ENERGY_WATER_SAVER" | "CAREER_VALUE_TOWN" | "ECO_REUSE_WORKSHOP";
    hotspots: VillageHotspotOption[];
    reflectionQuestion: {
      prompt: string;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
      }>;
    };
  };
  // Mechanic E: COIN_DIARY_AD_STREET
  diaryAdConfig?: {
    mode: "COIN_DIARY" | "AD_DETECTIVE" | "MASTER_FINANCE_CAPSTONE";
    startingCoins: number;
    diaryEntries?: Array<{
      id: string;
      itemName: string;
      emoji: string;
      cost: number;
      isNecessary: boolean;
      note: string;
    }>;
    adBillboards?: Array<{
      id: string;
      productName: string;
      emoji: string;
      price: number;
      adSlogan: string;
      hookType: "GIFT_BONUS" | "BIG_DISCOUNT" | "FLASHY_IMAGE" | "GENUINE_QUALITY";
      hookLabel: string;
      matchesStudentNeed: boolean;
      fitsWallet: boolean;
      shouldBuy: boolean;
      explanation: string;
    }>;
    capstoneChallenge?: {
      totalBudget: number;
      minSaveCoins: number;
      minShareCoins: number;
      surpriseQuestion: string;
      surpriseOptions: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
      }>;
    };
  };
}

export interface TC02SStageDefinition {
  periodIndex: number;
  lessonId: string;
  lessonCode: string;
  lessonName: string;
  topicId: string;
  topicCode: string;
  officialTopicName: string;
  creativeZoneName: string;
  isProject: boolean;
  feathersReward: number;
  badgeCode?: string;
  badgeName?: string;
  mapCoordinates: { x: number; y: number };
  criteria: OfficialCriterionDef[];
  interactive: StageInteractiveConfig;
}

export const TC02S_ZONES = [
  {
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    subtitle: "Khám phá vai trò của đồng tiền, phân biệt Cần – Muốn, quản lý hũ xu và trở thành Siêu anh hùng tiết kiệm",
    color: "#0D9488",
    bgGradient: "from-teal-600 via-emerald-600 to-cyan-700",
    stageRange: [1, 5],
    badgeCode: "BADGE_TC02S_ZONE1",
    badgeName: "Thám Hiểm Đồng Xu Thông Thái",
    parentTip: "Ba mẹ có thể cùng con quan sát hóa đơn siêu thị nhỏ hoặc khuyến khích con tự tắt đèn, khóa vòi nước ở nhà."
  },
  {
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    subtitle: "Trải nghiệm quầy hàng của chim Sky-Line, trân trọng sức lao động, sẻ chia yêu thương và tham gia Hội chợ nhí",
    color: "#0284C7",
    bgGradient: "from-sky-600 via-blue-600 to-indigo-700",
    stageRange: [6, 10],
    badgeCode: "BADGE_TC02S_ZONE2",
    badgeName: "Nhà Tiêu Dùng Nhí Nhân Ái",
    parentTip: "Khi đi mua sắm cuối tuần, ba mẹ hãy thử giao cho con chọn 1 món đồ học tập trong ngân sách nhỏ và cùng kiểm tra hạn sử dụng."
  },
  {
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    subtitle: "Xây tổ ước mơ cùng heo đất, lập danh sách mua sắm, tái chế đồ cũ và tỉnh táo trước phố quảng cáo",
    color: "#7C3AED",
    bgGradient: "from-purple-600 via-violet-600 to-amber-600",
    stageRange: [11, 15],
    badgeCode: "BADGE_TC02S_ZONE3",
    badgeName: "Kiến Trúc Sư Tài Chính Tương Lai",
    parentTip: "Ba mẹ hãy khích lệ con đặt mục tiêu tiết kiệm nhỏ vừa sức (như mua một cuốn truyện hay đồ dùng học tập) và tái sử dụng hộp giấy cũ."
  }
];

export const TC02S_STAGES: TC02SStageDefinition[] = [
  // =========================================================================
  // VÙNG 1: KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN (CHẶNG 1 -> 5)
  // =========================================================================
  {
    periodIndex: 1,
    lessonId: "les_fin_g2_p01",
    lessonCode: "TC02S.01.0001",
    lessonName: "Đồng tiền quanh em",
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 12, y: 76 },
    criteria: [
      {
        code: "TC02S.01.0001.01",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Nhận biết được tiền dùng để mua hàng hóa và thanh toán các dịch vụ trong cuộc sống."
      },
      {
        code: "TC02S.01.0001.02",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Kể được một số tình huống sử dụng tiền hằng ngày như mua đồ ăn, sách vở, vé xe."
      },
      {
        code: "TC02S.01.0001.03",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Phân biệt được tình huống cần dùng tiền và tình huống không cần dùng tiền."
      },
      {
        code: "TC02S.01.0001.04",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Lựa chọn được cách sử dụng tiền phù hợp trong một tình huống gần gũi và nêu được lí do."
      }
    ],
    interactive: {
      mechanic: "BACKPACK_BUILDER",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Chào mừng em đến với Thung Lũng Đồng Xu! Chú chim Sky-Line chuẩn bị bay qua thị trấn buổi sáng. Em hãy giúp chim phân biệt những hoạt động nào cần dùng tiền và những điều tuyệt vời nào hoàn toàn miễn phí nhé!",
      worldLocationName: "Cổng Thị Trấn Bình Minh",
      mascotGuideTip: "Không phải điều gì trong cuộc sống cũng cần dùng tiền đâu nhé! Tình yêu thương, lời cảm ơn hay tập thể dục buổi sáng đều miễn phí!",
      parentCompanionTip: "Trò chuyện cùng con về những hoạt động gia đình dùng tiền (mua thức ăn, đi xe buýt) và những niềm vui không tốn tiền (đọc sách ở thư viện, đi dạo công viên).",
      backpackConfig: {
        mode: "MONEY_VS_NO_MONEY",
        contexts: [
          {
            id: "MORNING_TOWN",
            title: "Buổi sáng ở Thị trấn Sky-Line",
            subtitle: "Hãy xếp từng hoạt động vào đúng ngăn: Cần dùng tiền hay Không cần dùng tiền!",
            badge: "Bối cảnh: Một ngày của chim Sky-Line",
            targetGroupAName: "Ví Xu Thanh Toán (Cần dùng tiền)",
            targetGroupBName: "Trái Tim Tự Nhiên (Không cần dùng tiền)",
            items: [
              {
                id: "item_notebook",
                name: "Mua quyển vở ô li ở hiệu sách",
                emoji: "📓",
                correctGroup: "GROUP_A",
                contextReason: "Quyển vở là hàng hóa ở hiệu sách nên cần dùng tiền để mua."
              },
              {
                id: "item_bus_ticket",
                name: "Mua vé xe buýt đến bảo tàng",
                emoji: "🚌",
                correctGroup: "GROUP_A",
                contextReason: "Đi xe buýt là dịch vụ vận chuyển nên cần mua vé."
              },
              {
                id: "item_breakfast",
                name: "Mua bánh mì và sữa buổi sáng",
                emoji: "🥖",
                correctGroup: "GROUP_A",
                contextReason: "Đồ ăn sáng tại cửa hàng là hàng hóa cần thanh toán."
              },
              {
                id: "item_hug_parents",
                name: "Ôm chúc buổi sáng và cảm ơn ba mẹ",
                emoji: "🤗",
                correctGroup: "GROUP_B",
                contextReason: "Tình cảm yêu thương và lời biết ơn trong gia đình không cần dùng tiền."
              },
              {
                id: "item_morning_exercise",
                name: "Tập thể dục hít thở không khí tại sân trường",
                emoji: "🤸",
                correctGroup: "GROUP_B",
                contextReason: "Tập thể dục và vui chơi cùng bạn ở sân trường hoàn toàn miễn phí."
              },
              {
                id: "item_help_friend",
                name: "Giúp bạn nhặt hộp bút bị rơi",
                emoji: "🤝",
                correctGroup: "GROUP_B",
                contextReason: "Lòng tốt giúp đỡ bạn bè xuất phát từ trái tim, không cần dùng tiền."
              }
            ]
          }
        ],
        reasonQuestion: {
          prompt: "Chim Sky-Line có 15 Xu trong ví để chuẩn bị cho giờ học vẽ sáng nay. Em khuyên chim nên dùng tiền như thế nào?",
          options: [
            {
              id: "opt_crayon",
              text: "Mua hộp bút sáp màu đang thiếu (10 Xu) để kịp giờ học vẽ và cất 5 Xu còn lại vào ví.",
              isOptimal: true,
              feedback: "Tuyệt vời! Em đã chọn cách dùng tiền đúng mục đích học tập và còn biết giữ lại tiền dư!"
            },
            {
              id: "opt_candy_all",
              text: "Mua hết 15 Xu kẹo nổ lấp lánh rồi vào lớp mượn màu của bạn.",
              isOptimal: false,
              feedback: "Nếu mua hết kẹo, chim Sky-Line sẽ không có bút màu cho giờ học vẽ đâu. Hãy ưu tiên việc học trước nhé!"
            },
            {
              id: "opt_pay_friend",
              text: "Trả tiền để nhờ bạn trực nhật lớp hộ mình.",
              isOptimal: false,
              feedback: "Trực nhật lớp là trách nhiệm chung của học sinh, chúng mình cùng giúp nhau chứ không dùng tiền thuê bạn nhé!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 2,
    lessonId: "les_fin_g2_p02",
    lessonCode: "TC02S.01.0002",
    lessonName: "Điều gì là cần thiết?",
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 24, y: 66 },
    criteria: [
      {
        code: "TC02S.01.0002.05",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nhận biết được những đồ dùng, nhu cầu thiết yếu trong sinh hoạt và học tập."
      },
      {
        code: "TC02S.01.0002.06",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Phân biệt được điều “cần” và điều “muốn” qua các ví dụ cụ thể."
      },
      {
        code: "TC02S.01.0002.07",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Phân biệt được điều “cần” và điều “muốn” qua các ví dụ cụ thể."
      },
      {
        code: "TC02S.01.0002.08",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Giải thích được lí do mua hoặc chưa mua một món đồ dựa trên nhu cầu thực tế."
      }
    ],
    interactive: {
      mechanic: "BACKPACK_BUILDER",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Trời sắp đổ mưa rào mà chim Sky-Line chuẩn bị bay tới trường! Em hãy giúp chim soạn ba lô thật chuẩn: phân biệt món đồ CẦN THIẾT cho bối cảnh đi học ngày mưa và món đồ chỉ là MONG MUỐN nhất thời nhé!",
      worldLocationName: "Trạm Ba Lô Thông Thái",
      mascotGuideTip: "Món đồ 'Cần' hay 'Muốn' phụ thuộc vào hoàn cảnh thực tế! Đi học ngày mưa thì Áo mưa là CẦN, nhưng ngày nắng đẹp đi học thì đồ chơi điện tử lại là MUỐN!",
      parentCompanionTip: "Trước khi mua một món đồ mới, ba mẹ hãy hỏi con: 'Món này con CẦN cho việc học/sinh hoạt ngay hay con đang MUỐN vì thấy đẹp?'",
      backpackConfig: {
        mode: "NEED_VS_WANT",
        contexts: [
          {
            id: "RAINY_SCHOOL_DAY",
            title: "Bối cảnh 1: Đi học sáng thứ Hai trời mưa",
            subtitle: "Đưa các vật dụng CẦN THIẾT vào Ba lô đi học, và xếp các món MUỐN (chưa cần ngay) sang Khay Để Ở Nhà!",
            badge: "Trời đang mưa • Có tiết Toán & Tiếng Việt",
            targetGroupAName: "Ba Lô Đi Học (Điều CẦN)",
            targetGroupBName: "Khay Chưa Cần Ngay (Điều MUỐN)",
            items: [
              {
                id: "raincoat",
                name: "Áo mưa gọn nhẹ",
                emoji: "🧥",
                correctGroup: "GROUP_A",
                contextReason: "Trời đang mưa nên áo mưa là đồ dùng thiết yếu bảo vệ sức khỏe khi tới trường."
              },
              {
                id: "textbook_pen",
                name: "Sách giáo khoa & Hộp bút chì",
                emoji: "📚",
                correctGroup: "GROUP_A",
                contextReason: "Sách vở và bút là đồ dùng thiết yếu bắt buộc cho giờ học trên lớp."
              },
              {
                id: "water_bottle",
                name: "Bình nước cá nhân",
                emoji: "🍼",
                correctGroup: "GROUP_A",
                contextReason: "Nước uống là nhu cầu thiết yếu cho cơ thể suốt ngày học."
              },
              {
                id: "toy_robot",
                name: "Robot đồ chơi phát nhạc",
                emoji: "🤖",
                correctGroup: "GROUP_B",
                contextReason: "Robot đồ chơi là mong muốn giải trí, mang vào lớp sẽ làm mất tập trung."
              },
              {
                id: "sticker_album",
                name: "Bộ sưu tập hình dán lấp lánh thứ 3",
                emoji: "✨",
                correctGroup: "GROUP_B",
                contextReason: "Ở nhà đã có 2 bộ hình dán rồi, mua hoặc mang thêm lúc này là điều 'Muốn' chứ chưa 'Cần'."
              },
              {
                id: "lollipop_pack",
                name: "Túi kẹo bông gòn khổng lồ",
                emoji: "🍭",
                correctGroup: "GROUP_B",
                contextReason: "Kẹo ngọt khổng lồ chỉ là mong muốn ăn vặt, không phải bữa ăn thiết yếu."
              }
            ]
          },
          {
            id: "SPORTS_CLUB_DAY",
            title: "Bối cảnh 2: Buổi sinh hoạt CLB Thể thao ngoài trời",
            subtitle: "Bối cảnh thay đổi rồi! Khi tham gia giờ Thể thao nắng ấm, vật dụng nào trở thành CẦN THIẾT?",
            badge: "Trời nắng đẹp • Giờ học Thể dục",
            targetGroupAName: "Túi Thể Thao (Điều CẦN trong giờ thể dục)",
            targetGroupBName: "Khay Chưa Cần Trong Giờ Tập (Điều MUỐN)",
            items: [
              {
                id: "sneakers",
                name: "Giày thể thao vừa chân",
                emoji: "👟",
                correctGroup: "GROUP_A",
                contextReason: "Trong giờ thể thao, giày vận động là điều CẦN để bảo vệ đôi chân."
              },
              {
                id: "sport_hat",
                name: "Mũ rộng vành che nắng & Bình nước",
                emoji: "🧢",
                correctGroup: "GROUP_A",
                contextReason: "Tập ngoài trời nắng cần mũ và nước uống để giữ sức khỏe."
              },
              {
                id: "glowing_crown",
                name: "Vương miện nhựa gắn đèn nhấp nháy",
                emoji: "👑",
                correctGroup: "GROUP_B",
                contextReason: "Vương miện đồ chơi không giúp ích cho buổi tập thể thao."
              },
              {
                id: "comic_book_new",
                name: "Truyện tranh siêu anh hùng tập mới",
                emoji: "🦸",
                correctGroup: "GROUP_B",
                contextReason: "Truyện tranh giải trí là điều Muốn, đọc vào giờ nghỉ chứ không cần trên sân tập."
              }
            ]
          }
        ],
        reasonQuestion: {
          prompt: "Ở nhà chim Sky-Line vẫn còn hộp bút màu 12 cây dùng rất tốt. Hôm nay thấy hộp bút màu 24 cây có hình siêu nhân mới ra mắt, chim nên quyết định thế nào?",
          options: [
            {
              id: "opt_wait_use_old",
              text: "Chưa mua hộp mới vì hộp bút màu ở nhà vẫn dùng tốt; để dành tiền cho nhu cầu thực sự cần thiết.",
              isOptimal: true,
              feedback: "Chính xác! Khi đồ dùng hiện có vẫn đáp ứng tốt việc học, mua thêm chỉ vì mẫu mã mới là điều 'Muốn' chưa cần thiết."
            },
            {
              id: "opt_buy_immediately",
              text: "Mua ngay lập tức vì có hình siêu nhân đẹp hơn hộp cũ.",
              isOptimal: false,
              feedback: "Mua thêm khi hộp cũ còn nguyên vẹn sẽ gây lãng phí tiền và đồ dùng đấy em ạ!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 3,
    lessonId: "les_fin_g2_p03",
    lessonCode: "TC02S.01.0003",
    lessonName: "Em làm chủ đồng tiền",
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 36, y: 74 },
    criteria: [
      {
        code: "TC02S.01.0003.09",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Nêu được các mục đích sử dụng tiền như ăn uống, học tập và tiết kiệm."
      },
      {
        code: "TC02S.01.0003.10",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Chia được số tiền giả định thành các phần theo mục đích sử dụng."
      },
      {
        code: "TC02S.01.0003.11",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Biết dành một phần tiền để tiết kiệm, bảo đảm tổng số tiền phân chia không vượt số tiền có."
      },
      {
        code: "TC02S.01.0003.12",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Biết dành một phần tiền để tiết kiệm, bảo đảm tổng số tiền phân chia không vượt số tiền có."
      }
    ],
    interactive: {
      mechanic: "DREAM_NEST",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Chim Sky-Line vừa nhận được 20 Xu thưởng học tập! Trên cây đại thụ có 3 chiếc hũ: Ăn uống & Sinh hoạt, Học tập, và Tiết kiệm. Em hãy giúp chim phân chia 20 Xu vào 3 chiếc hũ thật hợp lý nhé!",
      worldLocationName: "Cây Đại Thụ Ba Chiếc Hũ",
      mascotGuideTip: "Bí quyết làm chủ đồng tiền: Tổng số xu chia vào các hũ không được vượt quá 20 Xu đang có, và nhớ luôn dành một phần cho Hũ Tiết Kiệm nhé!",
      parentCompanionTip: "Hướng dẫn con làm 3 chiếc lọ nhỏ bằng hộp nhựa tái chế ở nhà: Chi tiêu cần thiết – Học tập – Tiết kiệm.",
      nestConfig: {
        mode: "ALLOCATE_JARS",
        totalCoins: 20,
        jars: [
          {
            id: "jar_food",
            name: "Hũ Ăn uống & Sinh hoạt",
            emoji: "🥪",
            minCoins: 4,
            maxCoins: 12,
            description: "Dành cho bữa phụ lành mạnh như sữa hạt, bánh mì, trái cây."
          },
          {
            id: "jar_study",
            name: "Hũ Học tập",
            emoji: "✏️",
            minCoins: 4,
            maxCoins: 12,
            description: "Dành mua vở ô li, bút chì, tẩy, thước kẻ phục vụ học tập."
          },
          {
            id: "jar_saving",
            name: "Hũ Tiết kiệm (Heo đất)",
            emoji: "🐷",
            minCoins: 2,
            maxCoins: 12,
            description: "Dành dụm cho mục tiêu lớn hơn hoặc khi có việc cần đột xuất."
          }
        ],
        unexpectedTwist: {
          prompt: "Sau khi chia xu vào 3 hũ, một người bạn rủ chim Sky-Line lấy hết tiền trong Hũ Tiết Kiệm ra mua kẹo đồ chơi. Chim nên làm gì?",
          options: [
            {
              id: "keep_saving",
              text: "Giữ nguyên phần tiền trong Hũ Tiết Kiệm như đã định để rèn thói quen làm chủ đồng tiền.",
              isCorrect: true,
              feedback: "Rất bản lĩnh! Giữ vững khoản tiết kiệm giúp chiếc tổ của chim Sky-Line ngày càng vững chắc!"
            },
            {
              id: "spend_all_saving",
              text: "Đổ hết Hũ Tiết Kiệm ra mua đồ chơi ngay.",
              isCorrect: false,
              feedback: "Nếu tiêu hết ngay khi vừa bỏ vào, chúng mình sẽ không còn khoản dự phòng nào nữa!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 4,
    lessonId: "les_fin_g2_p04",
    lessonCode: "TC02S.01.0004",
    lessonName: "Siêu anh hùng tiết kiệm",
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 48, y: 63 },
    criteria: [
      {
        code: "TC02S.01.0004.13",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Nhận biết được những hành vi tiết kiệm điện, nước, đồ dùng và thời gian."
      },
      {
        code: "TC02S.01.0004.14",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Phân biệt được hành vi tiết kiệm và hành vi lãng phí trong các tình huống quen thuộc."
      },
      {
        code: "TC02S.01.0004.15",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Thực hiện được việc làm tiết kiệm phù hợp như tắt đèn khi không sử dụng, khóa vòi nước sau khi dùng."
      },
      {
        code: "TC02S.01.0004.16",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Đề xuất được một việc làm tiết kiệm tại nhà hoặc ở lớp và chia sẻ kết quả thực hiện."
      }
    ],
    interactive: {
      mechanic: "VILLAGE_RESCUE",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Ngôi làng Sky-Line đang bị lãng phí điện, nước và đồ dùng làm cây cối héo rũ! Em hãy hóa thân thành Siêu anh hùng tiết kiệm, giúp chim Sky-Line xử lý từng điểm trong làng và phân biệt việc em tự làm với việc cần nhờ người lớn nhé!",
      worldLocationName: "Ngôi Làng Năng Lượng Xanh",
      mascotGuideTip: "Tiết kiệm điện, nước, đồ dùng và thời gian cũng chính là tiết kiệm tiền! Nhưng nhớ nhé: thiết bị điện bị hỏng hoặc ở trên cao thì em phải báo cho người lớn!",
      practicalPrompt: "Em hãy chia sẻ 1 việc làm tiết kiệm điện, nước hoặc đồ dùng mà em đã tự thực hiện ở nhà hoặc ở lớp học:",
      parentCompanionTip: "Cùng con thực hiện thử thách 'Đội tuần tra năng lượng nhí' tại nhà: kiểm tra đèn, quạt và vòi nước trước khi cả nhà ra ngoài.",
      villageConfig: {
        villageTheme: "ENERGY_WATER_SAVER",
        hotspots: [
          {
            id: "spot_classroom_light",
            title: "Phòng học giờ ra chơi",
            icon: "💡",
            problemState: "Cả lớp đã ra sân chơi đầy nắng nhưng 4 bóng đèn vẫn bật sáng trưng.",
            restoredState: "Đèn đã tắt gọn, phòng học đón ánh sáng tự nhiên mát lành!",
            correctActionId: "act_turn_off_switch",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "act_turn_off_switch",
                label: "Em tự bấm công tắc vừa tầm tay để tắt đèn trước khi ra sân (Tự thực hiện)",
                isCorrect: true,
                feedback: "Chính xác! Tắt công tắc đèn vừa tầm tay khi ra khỏi phòng là việc em tự làm được ngay!"
              },
              {
                id: "act_leave_light_on",
                label: "Cứ để đèn sáng suốt giờ ra chơi cho đẹp",
                isCorrect: false,
                feedback: "Để đèn sáng khi không có ai trong phòng gây lãng phí điện năng lắm!"
              }
            ]
          },
          {
            id: "spot_water_tap",
            title: "Bồn rửa tay sân trường",
            icon: "🚰",
            problemState: "Vòi nước rửa tay chưa khóa chặt, nước chảy rỉ rả suốt buổi.",
            restoredState: "Vòi nước đã được vặn khóa vừa tay, dòng suối quanh làng trong xanh trở lại!",
            correctActionId: "act_close_tap",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "act_close_tap",
                label: "Em tự vặn khóa vòi nước lại ngay sau khi dùng (Tự thực hiện)",
                isCorrect: true,
                feedback: "Tuyệt vời! Khóa vòi nước sau khi rửa tay giúp bảo vệ nguồn nước quý giá."
              },
              {
                id: "act_splash_water",
                label: "Mở vòi mạnh hơn để té nước đùa nghịch",
                isCorrect: false,
                feedback: "Té nước đùa nghịch vừa lãng phí nước sạch vừa làm ướt sàn dễ trượt ngã!"
              }
            ]
          },
          {
            id: "spot_broken_socket",
            title: "Quạt trần trên cao kêu rè rè & ổ cắm lỏng",
            icon: "⚡",
            problemState: "Chiếc quạt treo cao trên tường có mùi khét nhẹ và ổ điện bị lỏng.",
            restoredState: "Chú kỹ thuật viên và cô giáo đã ngắt điện, sửa quạt an toàn!",
            correctActionId: "act_call_adult",
            safetyType: "ASK_ADULT",
            actions: [
              {
                id: "act_call_adult",
                label: "Không tự chạm vào ổ điện; báo ngay cho thầy cô hoặc người lớn xử lý (Nhờ người lớn)",
                isCorrect: true,
                feedback: "Rất thông minh và an toàn! Với ổ điện lỏng hoặc thiết bị trên cao, học sinh tuyệt đối không tự sửa mà phải nhờ người lớn!"
              },
              {
                id: "act_climb_chair",
                label: "Tự bắc ghế trèo lên tháo quạt điện",
                isCorrect: false,
                feedback: "Nguy hiểm lắm! Học sinh lớp 2 không được tự trèo cao hay chạm vào ổ điện hỏng nhé!"
              }
            ]
          },
          {
            id: "spot_notebook_pencil",
            title: "Bàn học tập của Sóc Nhí",
            icon: "📒",
            problemState: "Quyển vở mới viết 3 dòng đã định xé bỏ làm máy bay giấy; giờ học sắp bắt đầu mà vẫn mải chơi.",
            restoredState: "Vở được giữ phẳng phiu, Sóc Nhí chuẩn bị sách bút đúng giờ!",
            correctActionId: "act_save_paper_time",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "act_save_paper_time",
                label: "Giữ gìn vở sạch đẹp, viết hết trang và chuẩn bị bài đúng giờ (Tự thực hiện)",
                isCorrect: true,
                feedback: "Đúng rồi! Không xé giấy vở và quý trọng thời gian học tập là phẩm chất của Siêu anh hùng tiết kiệm!"
              },
              {
                id: "act_tear_pages",
                label: "Xé giấy trắng gấp đồ chơi tiếp",
                isCorrect: false,
                feedback: "Xé giấy trắng là lãng phí đồ dùng học tập và công sức sản xuất giấy đấy!"
              }
            ]
          }
        ],
        reflectionQuestion: {
          prompt: "Việc làm nào dưới đây thể hiện em biết tiết kiệm cả ĐỒ DÙNG lẫn THỜI GIAN mỗi ngày?",
          options: [
            {
              id: "opt_neat_desk",
              text: "Soạn sách vở gọn gàng từ tối hôm trước và cất bút chì, tẩy vào hộp ngay sau khi viết xong.",
              isCorrect: true,
              feedback: "Chuẩn xác! Cất đồ gọn gàng giúp không bị thất lạc (tiết kiệm đồ dùng) và sáng hôm sau không mất công tìm kiếm (tiết kiệm thời gian)!"
            },
            {
              id: "opt_leave_messy",
              text: "Để bút thước lung tung, sáng mai đi học muộn rồi xin mua bộ mới.",
              isCorrect: false,
              feedback: "Làm vậy vừa tốn thời gian tìm đồ vừa tốn tiền mua lại đồ dùng bị mất!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 5,
    lessonId: "les_fin_g2_p05",
    lessonCode: "TC02S.01.0005",
    lessonName: "Tiền đi đâu mất rồi?",
    topicId: "top_fin_g2_1",
    topicCode: "TC02S.01",
    officialTopicName: "Chủ đề 1. KHÁM PHÁ THẾ GIỚI ĐỒNG TIỀN",
    creativeZoneName: "Vùng 1: Thung Lũng Đồng Xu Lấp Lánh",
    isProject: false,
    feathersReward: 4,
    badgeCode: "BADGE_TC02S_ZONE1",
    badgeName: "Thám Hiểm Đồng Xu Thông Thái",
    mapCoordinates: { x: 58, y: 74 },
    criteria: [
      {
        code: "TC02S.01.0005.17",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Kể được những khoản chi tiêu cá nhân trong một ngày hoặc một hoạt động."
      },
      {
        code: "TC02S.01.0005.18",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Ghi được món đã mua và số tiền đã chi vào mẫu “Nhật ký đồng xu”."
      },
      {
        code: "TC02S.01.0005.19",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Tính được tổng số tiền đã chi và số tiền còn lại trong phạm vi số đã học."
      },
      {
        code: "TC02S.01.0005.20",
        level: "Mức 2",
        competencyGroup: "Vận dụng",
        description: "Nhận xét được một khoản chi cần thiết hoặc chưa cần thiết và đề xuất cách chi tiêu phù hợp hơn."
      }
    ],
    interactive: {
      mechanic: "COIN_DIARY_AD_STREET",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Ủa, sáng nay ví của bạn Gấu Nhí có 30 Xu mà chiều về chỉ còn vài xu lẻ, Gấu Nhí thắc mắc: 'Tiền đi đâu mất rồi?'. Em hãy cùng chim Sky-Line mở sổ 'Nhật ký đồng xu' để ghi lại các khoản chi, tính tổng tiền đã dùng và tìm ra khoản chi chưa hợp lý nhé!",
      worldLocationName: "Lều Nhật Ký Đồng Xu",
      mascotGuideTip: "Khi ghi chép vào 'Nhật ký đồng xu', em sẽ biết rõ từng đồng xu đã đi đâu và rút kinh nghiệm cho lần chi tiêu sau!",
      parentCompanionTip: "Khuyến khích con dùng một cuốn sổ nhỏ ghi lại những món đồ con được mua trong tuần để hình thành thói quen theo dõi thu chi.",
      diaryAdConfig: {
        mode: "COIN_DIARY",
        startingCoins: 30,
        diaryEntries: [
          {
            id: "entry_ruler",
            itemName: "Mua thước kẻ gỗ cho tiết Toán",
            emoji: "📏",
            cost: 8,
            isNecessary: true,
            note: "Thước cũ bị gãy nên cần mua để kẻ bài học."
          },
          {
            id: "entry_milk",
            itemName: "Hộp sữa tươi giờ ra chơi",
            emoji: "🥛",
            cost: 7,
            isNecessary: true,
            note: "Bổ sung năng lượng cho buổi học."
          },
          {
            id: "entry_whistle_toy",
            itemName: "Còi nhựa đồ chơi mua theo đám đông",
            emoji: "📯",
            cost: 10,
            isNecessary: false,
            note: "Thổi 2 lần rồi bỏ quên trong ngăn bàn."
          }
        ],
        capstoneChallenge: {
          totalBudget: 30,
          minSaveCoins: 5,
          minShareCoins: 0,
          surpriseQuestion: "Sau khi xem lại 'Nhật ký đồng xu' của Gấu Nhí (đã chi 8 + 7 + 10 = 25 Xu, còn lại 5 Xu), em khuyên Gấu Nhí điều gì cho ngày mai?",
          surpriseOptions: [
            {
              id: "advise_cut_whistle",
              text: "Khoản mua còi nhựa 10 Xu là chưa cần thiết; lần sau nếu không mua món đó thì Gấu Nhí sẽ tiết kiệm được tới 15 Xu!",
              isCorrect: true,
              feedback: "Quá xuất sắc! Em vừa tính đúng tổng chi (25 Xu), số tiền còn lại (5 Xu) và chỉ ra đúng khoản chi chưa cần thiết!"
            },
            {
              id: "advise_skip_ruler",
              text: "Lần sau đừng mua thước kẻ học Toán nữa để lấy tiền mua thêm còi nhựa.",
              isCorrect: false,
              feedback: "Thước kẻ là đồ dùng học tập thiết yếu, còn còi nhựa mới là khoản chi chưa cần thiết em nhé!"
            }
          ]
        }
      }
    }
  },

  // =========================================================================
  // VÙNG 2: TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM (CHẶNG 6 -> 10)
  // =========================================================================
  {
    periodIndex: 6,
    lessonId: "les_fin_g2_p06",
    lessonCode: "TC02S.02.0001",
    lessonName: "Em là người bán hàng",
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 20, y: 46 },
    criteria: [
      {
        code: "TC02S.02.0001.21",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nhận biết được vai trò của người mua, người bán và giá tiền của hàng hóa trong hoạt động mô phỏng."
      },
      {
        code: "TC02S.02.0001.22",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Tính được tổng tiền của các món hàng đơn giản trong phạm vi số đã học."
      },
      {
        code: "TC02S.02.0001.23",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Thực hiện được việc trả tiền và xác định số tiền cần trả lại trong tình huống mua bán đơn giản."
      },
      {
        code: "TC02S.02.0001.24",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Biết kiểm tra tiền hàng, tiền trả lại và trao đổi lịch sự khi phát hiện nhầm lẫn."
      }
    ],
    interactive: {
      mechanic: "BIRD_SHOP",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Hôm nay chim Sky-Line mở Quầy Văn Phòng Phẩm Nhí! Em hãy trải nghiệm chọn các món đồ học tập trong ngân sách 25 Xu, tính tổng tiền thanh toán, kiểm tra số tiền trả lại và ứng xử thật lịch sự khi có sự nhầm lẫn nhé!",
      worldLocationName: "Quầy Hàng Chim Xanh",
      mascotGuideTip: "Người bán hàng niêm yết giá rõ ràng và giao hàng chu đáo; người mua chọn hàng, trả tiền và luôn đếm lại tiền thừa một cách lịch sự!",
      parentCompanionTip: "Chơi trò đóng vai 'Cửa hàng tạp hóa mini' tại nhà với con bằng các tờ tiền đồ chơi mệnh giá 5, 10, 20, 50.",
      shopConfig: {
        shopName: "Quầy Văn Phòng Phẩm Chim Xanh",
        walletBudget: 25,
        minRequiredItems: 2,
        requiredNeedTags: ["STUDY"],
        items: [
          {
            id: "shop_notebook",
            name: "Vở ô li Sky-Line",
            icon: "📓",
            price: 10,
            needTag: "STUDY",
            qualityLabel: "Giấy dày chống lóa",
            isHighQuality: true,
            description: "Vở 48 trang kẻ ô li chuẩn lớp 2"
          },
          {
            id: "shop_pencil",
            name: "Bút chì gỗ 2B",
            icon: "✏️",
            price: 5,
            needTag: "STUDY",
            qualityLabel: "Ngòi bền đẹp",
            isHighQuality: true,
            description: "Bút chì luyện viết chữ đẹp"
          },
          {
            id: "shop_eraser",
            name: "Cục tẩy trắng sạch",
            icon: "🧼",
            price: 4,
            needTag: "STUDY",
            qualityLabel: "Không bụi",
            isHighQuality: true,
            description: "Tẩy sạch không làm rách giấy"
          },
          {
            id: "shop_crayon",
            name: "Hộp màu sáp 6 màu",
            icon: "🖍️",
            price: 12,
            needTag: "STUDY",
            qualityLabel: "Màu tươi sáng",
            isHighQuality: true,
            description: "Dùng cho tiết Mỹ thuật"
          },
          {
            id: "shop_bookmark",
            name: "Thẻ đánh dấu sách hình chim",
            icon: "🔖",
            price: 3,
            needTag: "STUDY",
            qualityLabel: "Bìa cứng",
            isHighQuality: true,
            description: "Giúp nhớ trang sách đang đọc"
          }
        ],
        changeScenario: {
          prompt: "Tình huống tại quầy thu ngân: Giả sử bạn Thỏ Trắng mua 1 quyển vở (10 Xu) và 1 cây bút chì (5 Xu), tổng cộng hết 15 Xu. Bạn Thỏ đưa tờ 20 Xu, nhưng bác Gấu bán hàng đang vội nên đưa nhầm lại 3 Xu (thay vì 5 Xu). Em nên nói thế nào?",
          itemTotalExample: 15,
          coinGivenExample: 20,
          correctChange: 5,
          shopkeeperGivenChange: 3,
          politeResponses: [
            {
              id: "polite_check",
              text: "“Dạ thưa bác Gấu, con mua hết 15 Xu, con gửi 20 Xu nên tiền trả lại là 5 Xu ạ. Bác kiểm tra lại giúp con nhé ạ!”",
              isCorrect: true,
              feedback: "Tuyệt vời! Em vừa tính nhẩm 20 - 15 = 5 Xu thật chính xác, vừa nói lời lễ phép, lịch sự!"
            },
            {
              id: "angry_shout",
              text: "“Bác tính sai rồi! Trả ngay tiền cho tôi!”",
              isCorrect: false,
              feedback: "Khi phát hiện nhầm lẫn, chúng mình cần nói nhẹ nhàng, lễ phép với người bán hàng nhé!"
            },
            {
              id: "silent_ignore",
              text: "Im lặng cầm 3 Xu đi về rồi buồn bã.",
              isCorrect: false,
              feedback: "Em có quyền kiểm tra tiền trả lại và nhẹ nhàng báo ngay tại quầy để bác bán hàng gửi đủ 5 Xu nhé!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 7,
    lessonId: "les_fin_g2_p07",
    lessonCode: "TC02S.02.0002",
    lessonName: "Công việc tạo ra giá trị",
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 35, y: 38 },
    criteria: [
      {
        code: "TC02S.02.0002.25",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Kể tên được một số nghề nghiệp quen thuộc và công việc tương ứng."
      },
      {
        code: "TC02S.02.0002.26",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nêu được lao động tạo ra sản phẩm, dịch vụ và có thể mang lại thu nhập."
      },
      {
        code: "TC02S.02.0002.27",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Liên hệ được một nghề nghiệp với lợi ích mà nghề đó mang lại cho mọi người."
      },
      {
        code: "TC02S.02.0002.28",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Giải thích được vì sao cần quý trọng công sức lao động và sử dụng tiền có trách nhiệm."
      }
    ],
    interactive: {
      mechanic: "VILLAGE_RESCUE",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Đồng tiền không tự nhiên sinh ra mà đến từ công sức lao động chân chính! Em hãy cùng chim Sky-Line ghé thăm 4 khu làm việc trong Thị trấn Nghề Nghiệp để khám phá mỗi nghề tạo ra sản phẩm, dịch vụ gì và mang lại giá trị như thế nào cho cuộc sống nhé!",
      worldLocationName: "Quảng Trường Nghề Nghiệp Đáng Quý",
      mascotGuideTip: "Mỗi đồng tiền ba mẹ kiếm được đều chứa đựng mồ hôi và trí tuệ lao động. Quý trọng đồng tiền chính là biết ơn ba mẹ và người lao động!",
      parentCompanionTip: "Kể cho con nghe về công việc hằng ngày của ba mẹ và giá trị mà công việc đó đóng góp cho cộng đồng.",
      villageConfig: {
        villageTheme: "CAREER_VALUE_TOWN",
        hotspots: [
          {
            id: "job_farmer",
            title: "Cánh đồng Lúa Vàng của Bác Nông Dân",
            icon: "🌾",
            problemState: "Bác nông dân đang chăm sóc ruộng lúa và vườn rau sạch dưới nắng sớm.",
            restoredState: "Lúa gạo thơm dẻo và rau củ tươi ngon đã sẵn sàng cho bữa cơm mọi nhà!",
            correctActionId: "val_farmer",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "val_farmer",
                label: "Tạo ra lương thực, thực phẩm nuôi sống mọi người và mang lại thu nhập từ mùa màng",
                isCorrect: true,
                feedback: "Chính xác! Nhờ bác nông dân vất vả gieo trồng, chúng mình mới có hạt gạo trắng ngần mỗi bữa ăn!"
              },
              {
                id: "val_farmer_wrong",
                label: "Chỉ trồng cây để ngắm chứ không tạo ra sản phẩm gì",
                isCorrect: false,
                feedback: "Bác nông dân lao động vất vả để tạo ra lúa gạo, rau quả nuôi sống cộng đồng đấy!"
              }
            ]
          },
          {
            id: "job_teacher",
            title: "Ngôi trường Sky-Line của Thầy Cô Giáo",
            icon: "👩‍🏫",
            problemState: "Cô giáo đang tận tình chuẩn bị bài giảng và hướng dẫn học sinh rèn luyện.",
            restoredState: "Các bạn nhỏ thêm hiểu biết, lễ phép và lớn khôn mỗi ngày!",
            correctActionId: "val_teacher",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "val_teacher",
                label: "Mang lại dịch vụ giáo dục, dạy kiến thức và kỹ năng giúp học sinh nên người",
                isCorrect: true,
                feedback: "Đúng rồi! Thầy cô giáo tạo ra giá trị tri thức vô cùng to lớn cho xã hội!"
              },
              {
                id: "val_teacher_wrong",
                label: "Chỉ phát phần thưởng mà không cần soạn bài",
                isCorrect: false,
                feedback: "Thầy cô phải miệt mài soạn bài, giảng dạy và chăm lo cho học sinh mỗi ngày!"
              }
            ]
          },
          {
            id: "job_doctor",
            title: "Bệnh viện Ánh Dương của Bác Sĩ",
            icon: "🩺",
            problemState: "Bác sĩ và cô y tá đang khám bệnh, chăm sóc sức khỏe cho các em nhỏ.",
            restoredState: "Mọi người khỏe mạnh, nụ cười rạng rỡ khắp ngôi làng!",
            correctActionId: "val_doctor",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "val_doctor",
                label: "Khám chữa bệnh, bảo vệ sức khỏe cho cộng đồng và nhận thu nhập từ nghề y",
                isCorrect: true,
                feedback: "Tuyệt vời! Bác sĩ giúp mọi người khỏe mạnh để học tập và làm việc!"
              },
              {
                id: "val_doctor_wrong",
                label: "Chỉ mặc áo trắng đi dạo",
                isCorrect: false,
                feedback: "Bác sĩ làm việc rất tận tụy để cứu chữa và chăm sóc sức khỏe cho mọi người!"
              }
            ]
          },
          {
            id: "job_worker",
            title: "Xưởng Sản Xuất Đồ Dùng Học Tập",
            icon: "🏭",
            problemState: "Các cô chú công nhân đang tỉ mỉ lắp ráp từng chiếc bút, đóng từng quyển vở.",
            restoredState: "Những bộ dụng cụ học tập bền đẹp đã tới tay học sinh!",
            correctActionId: "val_worker",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "val_worker",
                label: "Lao động tạo ra sản phẩm thiết thực (vở, bút, quần áo) phục vụ đời sống",
                isCorrect: true,
                feedback: "Chuẩn xác! Từng quyển vở, cây bút em dùng đều do bàn tay người công nhân làm ra."
              },
              {
                id: "val_worker_wrong",
                label: "Đồ dùng tự nhiên xuất hiện không cần ai làm",
                isCorrect: false,
                feedback: "Mọi sản phẩm quanh ta đều là kết quả lao động của các cô chú công nhân, kỹ sư!"
              }
            ]
          }
        ],
        reflectionQuestion: {
          prompt: "Vì sao chúng mình cần quý trọng công sức lao động và sử dụng đồng tiền có trách nhiệm?",
          options: [
            {
              id: "respect_labor",
              text: "Vì mỗi đồng tiền và mỗi món đồ đều đổi bằng thời gian, công sức, trí tuệ của ba mẹ và người lao động.",
              isCorrect: true,
              feedback: "Một câu trả lời thật sâu sắc! Khi hiểu giá trị sức lao động, em sẽ luôn tiêu dùng thông minh và biết ơn!"
            },
            {
              id: "money_easy",
              text: "Vì tiền chỉ cần rút từ máy ATM là có vô tận.",
              isCorrect: false,
              feedback: "Tiền trong thẻ ATM cũng là tiền lương do ba mẹ làm việc vất vả mới gửi vào được đấy em nhé!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 8,
    lessonId: "les_fin_g2_p08",
    lessonCode: "TC02S.02.0003",
    lessonName: "Đồng tiền hạnh phúc",
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 50, y: 46 },
    criteria: [
      {
        code: "TC02S.02.0003.29",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Nhận biết được một số việc làm sử dụng tiền hoặc đồ dùng để giúp đỡ người khác."
      },
      {
        code: "TC02S.02.0003.30",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Lựa chọn được hình thức chia sẻ phù hợp với một tình huống cụ thể."
      },
      {
        code: "TC02S.02.0003.31",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Biết dành một phần tiền hoặc đồ dùng phù hợp để tham gia hoạt động chia sẻ dưới sự hướng dẫn của người lớn."
      },
      {
        code: "TC02S.02.0003.32",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Đề xuất được một việc làm giúp đỡ người khác phù hợp với khả năng và nêu được ý nghĩa của việc làm đó."
      }
    ],
    interactive: {
      mechanic: "DREAM_NEST",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Đồng tiền trở nên hạnh phúc nhất khi nó mang lại nụ cười cho người khác! Trường Sky-Line đang phát động ngày hội 'Tủ sách & Áo ấm yêu thương'. Em hãy cùng chim Sky-Line phân bổ quỹ xu và lựa chọn cách sẻ chia phù hợp dưới sự hướng dẫn của thầy cô và ba mẹ nhé!",
      worldLocationName: "Vườn Cây Sẻ Chia Hạnh Phúc",
      mascotGuideTip: "Chia sẻ không nhất thiết phải nhiều tiền; một cuốn truyện giữ gìn cẩn thận hay vài đồng xu tiết kiệm gửi tới bạn vùng cao cũng làm ấm áp biết bao trái tim!",
      practicalPrompt: "Em hãy nêu 1 việc làm giúp đỡ, sẻ chia phù hợp với khả năng của em và ý nghĩa của việc làm đó:",
      parentCompanionTip: "Cùng con soạn những cuốn truyện thiếu nhi còn mới hoặc trích một phần nhỏ heo đất tham gia hoạt động thiện nguyện tại trường.",
      nestConfig: {
        mode: "HAPPY_SHARING",
        totalCoins: 20,
        jars: [
          {
            id: "jar_essential_8",
            name: "Hũ Chi tiêu Cần thiết",
            emoji: "🎒",
            minCoins: 8,
            maxCoins: 14,
            description: "Đảm bảo đồ dùng học tập và sinh hoạt hằng ngày của em."
          },
          {
            id: "jar_save_8",
            name: "Hũ Tiết kiệm Tương lai",
            emoji: "🐷",
            minCoins: 3,
            maxCoins: 8,
            description: "Tích lũy cho kế hoạch cá nhân."
          },
          {
            id: "jar_share_8",
            name: "Hũ Đồng Tiền Hạnh Phúc (Sẻ chia)",
            emoji: "💝",
            minCoins: 2,
            maxCoins: 6,
            description: "Mua vở mới, bút chì tặng các bạn nhỏ khó khăn dưới sự hướng dẫn của người lớn."
          }
        ],
        goals: [
          {
            id: "share_books_pencils",
            name: "Góp 4 Xu mua 1 quyển vở mới + tặng 2 cuốn truyện cũ còn đẹp vào Tủ sách vùng cao của lớp",
            emoji: "📚",
            targetCoins: 4,
            weeksSuggested: 1,
            ageAppropriate: true,
            feedback: "Thật ấm áp! Đây là hình thức sẻ chia rất phù hợp với học sinh lớp 2 dưới sự hướng dẫn của thầy cô và ba mẹ!"
          },
          {
            id: "share_give_all_lunch",
            name: "Nhịn ăn sáng cả tuần để đem hết tiền đi cho mà không hỏi ý kiến ba mẹ",
            emoji: "🚫",
            targetCoins: 20,
            weeksSuggested: 1,
            ageAppropriate: false,
            feedback: "Sẻ chia cần phù hợp với khả năng và giữ gìn sức khỏe của bản thân, đồng thời có sự hướng dẫn của người lớn em nhé!"
          }
        ],
        unexpectedTwist: {
          prompt: "Khi muốn đóng góp tiền hoặc đồ dùng cho chương trình thiện nguyện, học sinh lớp 2 nên thực hiện như thế nào?",
          options: [
            {
              id: "with_adult_guidance",
              text: "Bàn bạc với ba mẹ hoặc thầy cô để chọn phần tiền tiết kiệm nhỏ hoặc đồ dùng còn tốt, phù hợp khả năng.",
              isCorrect: true,
              feedback: "Chính xác! Có sự đồng hành của ba mẹ và thầy cô giúp món quà sẻ chia của em đến đúng nơi và thật ý nghĩa!"
            },
            {
              id: "secretly_take_home_items",
              text: "Tự ý lấy đồ đạc trong nhà đem cho mà không xin phép ba mẹ.",
              isCorrect: false,
              feedback: "Em cần luôn xin phép và nhận sự hướng dẫn của ba mẹ trước khi mang đồ dùng hoặc tiền đi quyên góp nhé!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 9,
    lessonId: "les_fin_g2_p09",
    lessonCode: "TC02S.02.0004",
    lessonName: "Nhà thông thái mua sắm",
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 64, y: 38 },
    criteria: [
      {
        code: "TC02S.02.0004.33",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Nhận biết được các yếu tố cần xem xét khi mua hàng: nhu cầu, giá tiền và chất lượng."
      },
      {
        code: "TC02S.02.0004.34",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "So sánh được hai sản phẩm dựa trên giá và thông tin chất lượng đơn giản được cung cấp."
      },
      {
        code: "TC02S.02.0004.35",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Lựa chọn được sản phẩm đáp ứng nhu cầu và phù hợp với số tiền hiện có."
      },
      {
        code: "TC02S.02.0004.36",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Giải thích được lựa chọn mua hàng dựa trên nhu cầu, giá tiền và chất lượng sản phẩm."
      }
    ],
    interactive: {
      mechanic: "BIRD_SHOP",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Tại Siêu thị Hải Âu, có nhiều món hàng trông gần giống nhau nhưng khác nhau về giá tiền và chất lượng! Với ngân sách 25 Xu để mua 1 Bình nước đi học và 1 Hộp sữa chua, em hãy giúp chim Sky-Line so sánh kỹ NHU CẦU – GIÁ TIỀN – CHẤT LƯỢNG để chọn đúng sản phẩm tốt nhất nhé!",
      worldLocationName: "Siêu Thị Hải Âu Thông Thái",
      mascotGuideTip: "Đừng chỉ nhìn giá rẻ nhất hay vỏ ngoài sặc sỡ nhất! Hãy kiểm tra chất lượng, nguồn gốc và hạn sử dụng trong phạm vi số tiền mình có!",
      parentCompanionTip: "Hướng dẫn con cách đọc ngày sản xuất – hạn sử dụng (NSX – HSD) trên hộp sữa hoặc bánh khi đi siêu thị.",
      shopConfig: {
        shopName: "Siêu Thị Hải Âu – So Sánh Chất Lượng",
        walletBudget: 25,
        minRequiredItems: 2,
        requiredNeedTags: ["ESSENTIAL", "FOOD_HEALTHY"],
        requireQualityCheck: true,
        items: [
          {
            id: "bottle_safe_15",
            name: "Bình nước nhựa an toàn Sky-Line",
            icon: "🍼",
            price: 15,
            needTag: "ESSENTIAL",
            qualityLabel: "Nhựa an toàn, nắp kín, bền chắc",
            isHighQuality: true,
            description: "Đạt chuẩn an toàn sức khỏe, vừa ngân sách"
          },
          {
            id: "bottle_cheap_leak_10",
            name: "Bình nước nhựa mỏng không nhãn mác",
            icon: "🧪",
            price: 10,
            needTag: "ESSENTIAL",
            qualityLabel: "Có mùi nhựa nồng, nắp lỏng dễ đổ nước",
            isHighQuality: false,
            description: "Giá rẻ nhưng chất lượng kém, dễ làm ướt sách vở"
          },
          {
            id: "bottle_luxury_24",
            name: "Bình nước gắn đèn nhạc kim tuyến",
            icon: "💎",
            price: 24,
            needTag: "ESSENTIAL",
            qualityLabel: "Đắt tiền vì đồ trang trí, mua xong hết tiền mua sữa",
            isHighQuality: false,
            description: "Vượt quá ngân sách dành cho các nhu cầu khác"
          },
          {
            id: "yogurt_fresh_8",
            name: "Lốc sữa chua trái cây tươi mới",
            icon: "🍓",
            price: 8,
            needTag: "FOOD_HEALTHY",
            qualityLabel: "Còn hạn dùng 15 ngày, bảo quản lạnh tốt",
            isHighQuality: true,
            description: "Thơm ngon, an toàn cho sức khỏe"
          },
          {
            id: "yogurt_expired_5",
            name: "Sữa chua giảm giá sát hạn (hộp móp)",
            icon: "⚠️",
            price: 5,
            needTag: "FOOD_HEALTHY",
            qualityLabel: "Hết hạn vào ngày mai, vỏ hộp bị phồng",
            isHighQuality: false,
            description: "Rẻ hơn 3 Xu nhưng không đảm bảo an toàn thực phẩm"
          }
        ],
        changeScenario: {
          prompt: "Em đã chọn Bình nước an toàn (15 Xu) + Sữa chua tươi mới (8 Xu) = 23 Xu (trong ngân sách 25 Xu, còn dư 2 Xu). Vì sao em không chọn bình nước 10 Xu không nhãn mác và sữa chua hộp phồng 5 Xu?",
          itemTotalExample: 23,
          coinGivenExample: 25,
          correctChange: 2,
          shopkeeperGivenChange: 2,
          politeResponses: [
            {
              id: "reason_quality_need_budget",
              text: "Vì nhà thông thái mua sắm cần xét cả 3 yếu tố: đúng nhu cầu, vừa túi tiền (23/25 Xu) và đảm bảo chất lượng, an toàn sức khỏe!",
              isCorrect: true,
              feedback: "Xuất sắc! Em đã kết hợp hoàn hảo 3 tiêu chí: Nhu cầu – Giá tiền – Chất lượng!"
            },
            {
              id: "reason_only_cheapest",
              text: "Cứ món nào rẻ nhất thì mua, không cần xem hạn sử dụng.",
              isCorrect: false,
              feedback: "Thực phẩm hết hạn hoặc bình nhựa kém chất lượng sẽ gây hại cho sức khỏe đấy em nhé!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 10,
    lessonId: "les_fin_g2_p10",
    lessonCode: "TC02S.02.0005",
    lessonName: "Hội chợ tài chính nhí",
    topicId: "top_fin_g2_2",
    topicCode: "TC02S.02",
    officialTopicName: "Chủ đề 2. TIÊU DÙNG THÔNG MINH – SỐNG CÓ TRÁCH NHIỆM",
    creativeZoneName: "Vùng 2: Bến Cảng Mua Sắm & Trái Tim Ấm",
    isProject: true,
    feathersReward: 5,
    badgeCode: "BADGE_TC02S_ZONE2",
    badgeName: "Nhà Tiêu Dùng Nhí Nhân Ái",
    mapCoordinates: { x: 78, y: 48 },
    criteria: [
      {
        code: "TC02S.02.0005.37",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nêu được những điều đã học về sử dụng tiền, tiết kiệm và chia sẻ."
      },
      {
        code: "TC02S.02.0005.38",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Thực hiện được các bước mua bán đơn giản: chọn hàng, tính tiền, trả tiền và kiểm tra tiền trả lại."
      },
      {
        code: "TC02S.02.0005.39",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Biết lựa chọn hàng hóa trong giới hạn số tiền được giao và ghi lại khoản đã chi."
      },
      {
        code: "TC02S.02.0005.40",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Vận dụng kiến thức đã học để xử lí một tình huống tại hội chợ và giải thích được cách xử lí."
      }
    ],
    interactive: {
      mechanic: "BIRD_SHOP",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Chào mừng em đến với DỰ ÁN HỘI CHỢ TÀI CHÍNH NHÍ SKY-LINE! Em được giao ngân sách 30 Xu. Nhiệm vụ của em là chọn mua ít nhất 1 món đồ học tập cần thiết và 1 món quà sẻ chia/lành mạnh sao cho tổng chi không vượt quá 30 Xu và còn dư ít nhất 3 Xu để bỏ heo đất tiết kiệm nhé!",
      worldLocationName: "Quảng Trường Hội Chợ Tài Chính Nhí",
      mascotGuideTip: "Tại Hội chợ, có rất nhiều phương án giỏ hàng hợp lệ! Chỉ cần em chọn đủ nhu cầu, không vượt quá 27 Xu (để dành ít nhất 3 Xu tiết kiệm) và kiểm tra tiền thừa chính xác!",
      practicalPrompt: "Em hãy ghi lại ngắn gọn kinh nghiệm của em sau khi tham gia Hội chợ tài chính nhí (em đã mua gì, tiết kiệm và chia sẻ thế nào):",
      parentCompanionTip: "Khuyến khích con kể lại cách con phân bổ 30 Xu tại Hội chợ tài chính nhí và khen ngợi khi con biết giữ lại một phần tiết kiệm.",
      shopConfig: {
        shopName: "Hội Chợ Tài Chính Nhí (3 Gian Hàng)",
        walletBudget: 27, // Để dành ít nhất 3 Xu tiết kiệm trên tổng 30 Xu
        minRequiredItems: 2,
        requiredNeedTags: ["STUDY", "SHARE_GIFT"],
        items: [
          {
            id: "fair_notebook_set",
            name: "Bộ sổ tay & thước kẻ học tập",
            icon: "📐",
            price: 12,
            needTag: "STUDY",
            qualityLabel: "Gian hàng Học Cụ Xanh",
            isHighQuality: true,
            description: "Phục vụ học tập hằng ngày"
          },
          {
            id: "fair_pencil_pack",
            name: "Đôi bút chì 2B & Tẩy",
            icon: "✏️",
            price: 8,
            needTag: "STUDY",
            qualityLabel: "Gian hàng Học Cụ Xanh",
            isHighQuality: true,
            description: "Gọn nhẹ, thiết thực"
          },
          {
            id: "fair_charity_card",
            name: "Thiệp gây quỹ Tủ sách vùng cao",
            icon: "💌",
            price: 6,
            needTag: "SHARE_GIFT",
            qualityLabel: "Gian hàng Sẻ Chia Yêu Thương",
            isHighQuality: true,
            description: "Toàn bộ 6 Xu góp vào quỹ sách tặng bạn nghèo"
          },
          {
            id: "fair_seed_pot",
            name: "Chậu cây sen đá nhỏ gây quỹ Xanh",
            icon: "🪴",
            price: 9,
            needTag: "SHARE_GIFT",
            qualityLabel: "Gian hàng Sẻ Chia Yêu Thương",
            isHighQuality: true,
            description: "Vừa trang trí góc học tập vừa ủng hộ quỹ cây xanh"
          },
          {
            id: "fair_fruit_cup",
            name: "Cốc trái cây tươi mát",
            icon: "🍉",
            price: 7,
            needTag: "FOOD_HEALTHY",
            qualityLabel: "Gian hàng Ẩm Thực Sạch",
            isHighQuality: true,
            description: "Bổ sung vitamin tại hội chợ"
          }
        ],
        changeScenario: {
          prompt: "Tình huống tại Hội chợ: Bạn Sóc Nhí đã chi 20 Xu mua đồ học tập và thiệp từ thiện, còn lại 10 Xu định bỏ heo đất. Bỗng một gian hàng đồ chơi rao bán 'Bong bóng xà phòng khổng lồ giá 12 Xu'. Nếu là Sóc Nhí, em xử lý thế nào?",
          itemTotalExample: 20,
          coinGivenExample: 30,
          correctChange: 10,
          shopkeeperGivenChange: 10,
          politeResponses: [
            {
              id: "fair_wise_choice",
              text: "Không vay thêm tiền để mua bong bóng 12 Xu vì vượt số tiền còn lại (10 Xu) và không nằm trong kế hoạch; giữ 10 Xu bỏ heo đất tiết kiệm.",
              isCorrect: true,
              feedback: "Tuyệt vời! Em đã vận dụng trọn vẹn kiến thức Mua sắm thông minh – Tiết kiệm – Chia sẻ tại Hội chợ!"
            },
            {
              id: "fair_borrow_overspend",
              text: "Trả lại tấm thiệp từ thiện và vay thêm bạn 2 Xu để mua bong bóng chơi 5 phút là hết.",
              isCorrect: false,
              feedback: "Làm vậy vừa mất đi niềm vui sẻ chia vừa tiêu quá số tiền được giao và không tiết kiệm được xu nào!"
            }
          ]
        }
      }
    }
  },

  // =========================================================================
  // VÙNG 3: KIẾN TẠO TƯƠNG LAI TÀI CHÍNH (CHẶNG 11 -> 15)
  // =========================================================================
  {
    periodIndex: 11,
    lessonId: "les_fin_g2_p11",
    lessonCode: "TC02S.03.0001",
    lessonName: "Chiếc heo đất mơ ước",
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 25, y: 18 },
    criteria: [
      {
        code: "TC02S.03.0001.41",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nêu được một điều bản thân muốn tiết kiệm tiền để thực hiện"
      },
      {
        code: "TC02S.03.0001.42",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Xác định được mục tiêu tiết kiệm cụ thể, phù hợp với lứa tuổi."
      },
      {
        code: "TC02S.03.0001.43",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Lập được kế hoạch tiết kiệm đơn giản theo mẫu: mục tiêu, số tiền cần có và số tiền dự định dành dụm."
      },
      {
        code: "TC02S.03.0001.44",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Đề xuất được cách duy trì hoặc điều chỉnh kế hoạch khi chưa tiết kiệm đủ số tiền mong muốn."
      }
    ],
    interactive: {
      mechanic: "DREAM_NEST",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Trên Đỉnh Đồi Tổ Ấm, chim Sky-Line đang xây dựng Chiếc Tổ Ước Mơ cùng chú Heo Đất Vàng! Em hãy chọn một mục tiêu tiết kiệm phù hợp với lứa tuổi lớp 2, lập kế hoạch dành dụm từng tuần để nâng cấp chiếc tổ, và tìm cách điều chỉnh khi có tuần chưa tiết kiệm đủ nhé!",
      worldLocationName: "Đồi Tổ Ấm & Heo Đất Vàng",
      mascotGuideTip: "Một mục tiêu tiết kiệm tốt cho học sinh lớp 2 là mục tiêu cụ thể, thiết thực, vừa sức và có kế hoạch dành dụm đều đặn mỗi tuần!",
      practicalPrompt: "Kế hoạch Heo đất của em: Em muốn tiết kiệm cho mục tiêu gì, cần bao nhiêu Xu (giả định) và dự định dành dụm mỗi tuần thế nào?",
      parentCompanionTip: "Không cần dùng tiền thật lớn; ba mẹ có thể cùng con lập 'Bảng theo dõi sao/xu tiết kiệm' cho một mục tiêu nhỏ trong 3–4 tuần.",
      nestConfig: {
        mode: "SAVINGS_PIGGY_PLAN",
        totalCoins: 24,
        jars: [
          {
            id: "week_1",
            name: "Tuần 1: Đặt nền móng tổ",
            emoji: "🪹",
            minCoins: 5,
            maxCoins: 8,
            description: "Bỏ ống heo tuần thứ nhất từ khoản tiết kiệm chi tiêu vặt."
          },
          {
            id: "week_2",
            name: "Tuần 2: Đan cành vững chắc",
            emoji: "🌿",
            minCoins: 5,
            maxCoins: 8,
            description: "Kiên trì bỏ ống heo tuần thứ hai."
          },
          {
            id: "week_3",
            name: "Tuần 3: Điểm hoa đón nắng",
            emoji: "🌸",
            minCoins: 5,
            maxCoins: 8,
            description: "Bỏ ống heo tuần thứ ba."
          },
          {
            id: "week_4",
            name: "Tuần 4: Hoàn thành Tổ Ước Mơ",
            emoji: "🏡",
            minCoins: 5,
            maxCoins: 8,
            description: "Đạt mục tiêu 24 Xu cho món đồ mơ ước!"
          }
        ],
        goals: [
          {
            id: "goal_science_book",
            name: "Bộ sách khám phá Vũ trụ & Loài chim (Cần 24 Xu – tiết kiệm 6 Xu/tuần trong 4 tuần)",
            emoji: "🔭",
            targetCoins: 24,
            weeksSuggested: 4,
            ageAppropriate: true,
            feedback: "Mục tiêu rất cụ thể, bổ ích và hoàn toàn vừa sức với học sinh lớp 2!"
          },
          {
            id: "goal_art_kit",
            name: "Bộ màu nước & cọ vẽ Mỹ thuật (Cần 24 Xu – tiết kiệm 6 Xu/tuần trong 4 tuần)",
            emoji: "🎨",
            targetCoins: 24,
            weeksSuggested: 4,
            ageAppropriate: true,
            feedback: "Mục tiêu học tập sáng tạo và phù hợp lứa tuổi!"
          },
          {
            id: "goal_gift_mom",
            name: "Chậu cây nhỏ & thiệp tặng sinh nhật Mẹ (Cần 24 Xu – tiết kiệm 6 Xu/tuần trong 4 tuần)",
            emoji: "💐",
            targetCoins: 24,
            weeksSuggested: 4,
            ageAppropriate: true,
            feedback: "Một mục tiêu tiết kiệm đầy yêu thương và hiếu thảo!"
          },
          {
            id: "goal_real_car",
            name: "Mua tàu vũ trụ thật trị giá hàng tỷ đồng trong 1 tuần",
            emoji: "🚀",
            targetCoins: 9999,
            weeksSuggested: 1,
            ageAppropriate: false,
            feedback: "Mục tiêu này vượt quá khả năng của học sinh lớp 2. Hãy chọn mục tiêu nhỏ, cụ thể và vừa sức nhé!"
          }
        ],
        unexpectedTwist: {
          prompt: "Tình huống bất ngờ: Đến Tuần 3, chim Sky-Line mới tiết kiệm được 15 Xu (còn thiếu 9 Xu nữa mới đủ 24 Xu) vì tuần vừa rồi phải mua thêm quyển vở viết. Em nên điều chỉnh kế hoạch thế nào?",
          options: [
            {
              id: "adjust_extend_week",
              text: "Kiên trì tiết kiệm thêm 1–2 tuần nữa và cắt giảm các món ăn vặt chưa cần thiết cho đến khi đủ 24 Xu.",
              isCorrect: true,
              feedback: "Rất kiên trì và thông minh! Khi chưa đủ tiền, chúng mình có thể kéo dài thời gian tiết kiệm thêm một chút thay vì bỏ cuộc!"
            },
            {
              id: "give_up_break_piggy",
              text: "Đập heo đất luôn rồi tiêu hết 15 Xu vào kẹo ngọt vì chán quá.",
              isCorrect: false,
              feedback: "Đừng bỏ cuộc khi đã đi được hơn nửa chặng đường! Điều chỉnh kế hoạch thêm 1 tuần sẽ giúp em chạm tới ước mơ!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 12,
    lessonId: "les_fin_g2_p12",
    lessonCode: "TC02S.03.0002",
    lessonName: "Mua sắm có kế hoạch",
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 42, y: 14 },
    criteria: [
      {
        code: "TC02S.03.0002.45",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Nêu được lợi ích của việc lập danh sách trước khi mua hàng."
      },
      {
        code: "TC02S.03.0002.46",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Lập được danh sách các món cần mua theo một nhu cầu cụ thể."
      },
      {
        code: "TC02S.03.0002.47",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Lựa chọn được các món trong danh sách để tổng tiền không vượt số tiền được giao."
      },
      {
        code: "TC02S.03.0002.48",
        level: "Mức 1",
        competencyGroup: "Hiểu",
        description: "Điều chỉnh được danh sách khi không đủ tiền và giải thích được món cần ưu tiên."
      }
    ],
    interactive: {
      mechanic: "BIRD_SHOP",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Ngày mai lớp 2S có buổi 'Làm thiệp thủ công chúc mừng Ngày Nhà giáo'. Em có ngân sách 20 Xu. Hãy giúp chim Sky-Line lập danh sách ưu tiên các nguyên liệu cần thiết và chọn mua sao cho không vượt quá 20 Xu nhé!",
      worldLocationName: "Trạm Lập Kế Hoạch Mua Sắm",
      mascotGuideTip: "Lập danh sách trước khi vào cửa hàng giúp em mua đủ món cần thiết, tiết kiệm thời gian và không bị cám dỗ bởi những món ngoài kế hoạch!",
      parentCompanionTip: "Trước khi đi siêu thị, ba mẹ hãy cùng con viết 3–4 món cần mua ra giấy nhớ và giao con tích dấu khi đã bỏ vào giỏ.",
      shopConfig: {
        shopName: "Cửa Hàng Thủ Công Mỹ Thuật",
        walletBudget: 20,
        minRequiredItems: 2,
        requiredNeedTags: ["CRAFT_MATERIAL"],
        requirePriorityListFirst: true,
        items: [
          {
            id: "craft_cardstock",
            name: "Giấy bìa màu làm thiệp (Ưu tiên 1)",
            icon: "📄",
            price: 8,
            needTag: "CRAFT_MATERIAL",
            qualityLabel: "Bắt buộc cần có để làm khung thiệp",
            isHighQuality: true,
            description: "Nguyên liệu chính của tấm thiệp"
          },
          {
            id: "craft_glue_scissors",
            name: "Hồ dán & Dây ruy-băng (Ưu tiên 2)",
            icon: "🎀",
            price: 7,
            needTag: "CRAFT_MATERIAL",
            qualityLabel: "Cần thiết để dán và trang trí thiệp",
            isHighQuality: true,
            description: "Giúp gắn kết các chi tiết thiệp"
          },
          {
            id: "craft_color_pen",
            name: "Bút nhũ viết lời chúc (Ưu tiên 3)",
            icon: "🖊️",
            price: 5,
            needTag: "CRAFT_MATERIAL",
            qualityLabel: "Viết lời chúc nổi bật",
            isHighQuality: true,
            description: "Vừa khít ngân sách 20 Xu (8 + 7 + 5 = 20)"
          },
          {
            id: "craft_glitter_box",
            name: "Hộp kim tuyến khổng lồ (Ngoài danh sách)",
            icon: "✨",
            price: 12,
            needTag: "TOY_WANT",
            qualityLabel: "Nếu mua sẽ vượt quá 20 Xu",
            isHighQuality: false,
            description: "Chưa thực sự cần thiết cho tấm thiệp đơn giản"
          },
          {
            id: "craft_toy_car",
            name: "Xe đua dây cót (Không liên quan làm thiệp)",
            icon: "🏎️",
            price: 10,
            needTag: "TOY_WANT",
            qualityLabel: "Ngoài mục đích mua sắm",
            isHighQuality: false,
            description: "Làm thiếu tiền mua giấy bìa và hồ dán"
          }
        ],
        changeScenario: {
          prompt: "Tình huống điều chỉnh danh sách: Nếu hôm đó chim Sky-Line chỉ mang theo 15 Xu (thay vì 20 Xu), em sẽ điều chỉnh danh sách (Giấy bìa 8 Xu, Hồ dán 7 Xu, Bút nhũ 5 Xu) như thế nào?",
          itemTotalExample: 15,
          coinGivenExample: 15,
          correctChange: 0,
          shopkeeperGivenChange: 0,
          politeResponses: [
            {
              id: "priority_keep_core",
              text: "Ưu tiên mua Giấy bìa (8 Xu) và Hồ dán (7 Xu) = 15 Xu trước vì đó là nguyên liệu bắt buộc để làm thành tấm thiệp; lời chúc có thể viết bằng bút chì màu sẵn có ở nhà!",
              isCorrect: true,
              feedback: "Rất linh hoạt! Biết ưu tiên món quan trọng nhất và tận dụng đồ sẵn có ở nhà khi ngân sách hạn hẹp là đỉnh cao của Mua sắm có kế hoạch!"
            },
            {
              id: "priority_buy_glitter_only",
              text: "Chỉ mua Hộp kim tuyến 12 Xu và Bút nhũ 5 Xu, khỏi cần mua giấy làm thiệp.",
              isCorrect: false,
              feedback: "Không có giấy bìa thì không thể làm thiệp được, và 12 + 5 = 17 Xu cũng vượt quá 15 Xu rồi!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 13,
    lessonId: "les_fin_g2_p13",
    lessonCode: "TC02S.03.0003",
    lessonName: "Đồ cũ vẫn có giá trị",
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    isProject: false,
    feathersReward: 4,
    mapCoordinates: { x: 58, y: 18 },
    criteria: [
      {
        code: "TC02S.03.0003.49",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Lựa chọn được cách giữ gìn, tái sử dụng hoặc chia sẻ phù hợp với từng đồ dùng."
      },
      {
        code: "TC02S.03.0003.50",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Đề xuất được cách tận dụng một đồ dùng cũ và giải thích được lợi ích về tiết kiệm, giảm rác thải."
      }
    ],
    interactive: {
      mechanic: "VILLAGE_RESCUE",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "Nhiều món đồ cũ quanh ta vẫn còn rất nhiều giá trị nếu biết giữ gìn, tái sử dụng hoặc chia sẻ! Em hãy cùng chim Sky-Line ghé Xưởng Tái Chế Xanh để biến các món đồ cũ thành vật dụng hữu ích, vừa tiết kiệm tiền vừa giảm rác thải bảo vệ môi trường nhé!",
      worldLocationName: "Xưởng Tái Chế & Trao Đổi Đồ Cũ",
      mascotGuideTip: "Mỗi món đồ cũ được tái sử dụng hoặc tặng lại cho người cần sẽ giúp gia đình tiết kiệm tiền mua mới và giúp Trái Đất bớt đi một món rác thải!",
      practicalPrompt: "Em hãy chia sẻ ý tưởng tận dụng 1 món đồ cũ ở nhà (ví dụ: vỏ hộp sữa, chai nhựa, quần áo/truyện cũ) và lợi ích của việc đó:",
      parentCompanionTip: "Cuối tuần, ba mẹ cùng con làm 1 sản phẩm DIY từ hộp giấy/lọ nhựa cũ (như ống đựng bút hoặc chậu trồng cây nhỏ).",
      villageConfig: {
        villageTheme: "ECO_REUSE_WORKSHOP",
        hotspots: [
          {
            id: "old_cardboard_box",
            title: "Hộp giấy cứng đựng bánh quy đã dùng hết",
            icon: "📦",
            problemState: "Chiếc hộp giấy cứng vuông vắn sắp bị vứt vào thùng rác.",
            restoredState: "Biến hình thành Hộp đựng bút và thẻ học tập đầy màu sắc trên bàn học!",
            correctActionId: "reuse_pen_holder",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "reuse_pen_holder",
                label: "Trang trí lại thành ống cắm bút hoặc hộp đựng đồ dùng học tập (Tái sử dụng)",
                isCorrect: true,
                feedback: "Sáng tạo quá! Em vừa tiết kiệm được tiền mua ống cắm bút mới vừa giảm rác thải giấy!"
              },
              {
                id: "throw_away_box",
                label: "Xé vụn vứt ra sàn",
                isCorrect: false,
                feedback: "Hộp giấy cứng còn rất sạch và bền, tái sử dụng sẽ có ích hơn nhiều!"
              }
            ]
          },
          {
            id: "old_story_books",
            title: "Bộ truyện tranh lớp 1 em đã đọc thuộc lòng",
            icon: "📖",
            problemState: "Những cuốn truyện lớp 1 còn mới nguyên đang nằm im trên kệ.",
            restoredState: "Được trao tặng cho các em học sinh lớp 1 và Thư viện Xanh của trường!",
            correctActionId: "share_books_grade1",
            safetyType: "SELF_DO",
            actions: [
              {
                id: "share_books_grade1",
                label: "Lau sạch, bọc phẳng và tặng lại cho em nhỏ lớp 1 hoặc góc thư viện lớp (Chia sẻ)",
                isCorrect: true,
                feedback: "Tuyệt vời! Chia sẻ sách cũ giúp nhiều bạn nhỏ được đọc sách hay mà không tốn tiền mua mới!"
              },
              {
                id: "throw_books",
                label: "Bỏ vào sọt rác vì mình đã lên lớp 2",
                isCorrect: false,
                feedback: "Sách là kho tàng tri thức, tặng lại cho các em lớp 1 sẽ mang lại niềm vui lớn!"
              }
            ]
          },
          {
            id: "slightly_torn_backpack",
            title: "Chiếc cặp sách chỉ bị tuột một đoạn chỉ nhỏ ở quai",
            icon: "🎒",
            problemState: "Chiếc cặp vẫn còn rất tốt, chỉ bị sứt một đường chỉ nhỏ ở quai đeo.",
            restoredState: "Mẹ đã giúp khâu lại đường chỉ chắc chắn, chiếc cặp lại bền đẹp như mới!",
            correctActionId: "repair_with_adult",
            safetyType: "ASK_ADULT",
            actions: [
              {
                id: "repair_with_adult",
                label: "Nhờ ba mẹ dùng kim chỉ khâu lại quai cặp để tiếp tục sử dụng bền lâu (Giữ gìn & Nhờ người lớn)",
                isCorrect: true,
                feedback: "Rất chuẩn xác! Việc dùng kim khâu sắc nhọn em nhờ ba mẹ giúp, chiếc cặp lại bền đẹp và tiết kiệm cả trăm nghìn đồng!"
              },
              {
                id: "demand_new_bag",
                label: "Vứt cặp đi đòi mua cặp mới ngay",
                isCorrect: false,
                feedback: "Cặp chỉ tuột một chút chỉ mà vứt đi thì thật lãng phí công sức của ba mẹ!"
              }
            ]
          }
        ],
        reflectionQuestion: {
          prompt: "Việc tận dụng và tái sử dụng đồ dùng cũ mang lại hai lợi ích lớn nào?",
          options: [
            {
              id: "benefit_save_money_and_earth",
              text: "Vừa tiết kiệm tiền cho gia đình (không phải mua mới khi chưa cần), vừa giảm rác thải bảo vệ môi trường xanh sạch.",
              isCorrect: true,
              feedback: "Hoàn toàn chính xác! Tiết kiệm tài chính luôn gắn liền với lối sống xanh có trách nhiệm!"
            },
            {
              id: "benefit_none",
              text: "Chẳng có lợi ích gì ngoài làm chật nhà.",
              isCorrect: false,
              feedback: "Tái sử dụng đúng cách giúp căn phòng gọn đẹp, tiết kiệm tiền và bảo vệ thiên nhiên đấy!"
            }
          ]
        }
      }
    }
  },
  {
    periodIndex: 14,
    lessonId: "les_fin_g2_p14",
    lessonCode: "TC02S.03.0004",
    lessonName: "Em biết lựa chọn quảng cáo",
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    isProject: false,
    feathersReward: 3,
    mapCoordinates: { x: 74, y: 14 },
    criteria: [
      {
        code: "TC02S.03.0004.51",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Chỉ ra được chi tiết thu hút trong quảng cáo như hình ảnh, lời giới thiệu, quà tặng hoặc giảm giá."
      },
      {
        code: "TC02S.03.0004.52",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Biết đối chiếu món hàng được quảng cáo với nhu cầu và số tiền hiện có trước khi lựa chọn."
      }
    ],
    interactive: {
      mechanic: "COIN_DIARY_AD_STREET",
      evaluationMode: "AUTO_OBJECTIVE",
      storyBrief: "Chim Sky-Line đang bay qua Phố Quảng Cáo Rực Rỡ! Khắp nơi là biển hiệu nhấp nháy: 'Mua 1 tặng 1', 'Siêu giảm giá', 'Quà tặng bí mật'! Trong ví chim có 18 Xu và chim đang cần mua 1 Hộp bút màu tốt cho giờ học vẽ. Em hãy dùng 'Kính Lúp Thông Thái' nhận diện chiêu thu hút quảng cáo và chọn đúng món hàng phù hợp nhé!",
      worldLocationName: "Phố Quảng Cáo Rực Rỡ",
      mascotGuideTip: "Quảng cáo thường dùng hình ảnh bắt mắt, quà tặng kèm hoặc chữ 'Giảm giá sốc' để thu hút chúng mình. Hãy luôn hỏi: Mình có thực sự CẦN món này không? Ví mình có ĐỦ tiền không?",
      parentCompanionTip: "Khi xem quảng cáo đồ chơi/bánh kẹo trên TV hoặc siêu thị, ba mẹ hãy đố con tìm ra 'chi tiết thu hút' mà nhà quảng cáo đã sử dụng.",
      diaryAdConfig: {
        mode: "AD_DETECTIVE",
        startingCoins: 18,
        adBillboards: [
          {
            id: "ad_candy_toy",
            productName: "Kẹo Nổ Vũ Trụ – Tặng kèm Nhẫn Phát Sáng!",
            emoji: "🍬",
            price: 16,
            adSlogan: "MUA NGAY KẺO HẾT! Ăn kẹo nhận ngay nhẫn siêu nhân phát sáng cực ngầu!",
            hookType: "GIFT_BONUS",
            hookLabel: "Chi tiết thu hút: Quà tặng kèm lấp lánh & lời giục mua ngay",
            matchesStudentNeed: false,
            fitsWallet: true,
            shouldBuy: false,
            explanation: "Dùng quà tặng kèm (nhẫn phát sáng) để thu hút, nhưng không đúng nhu cầu cần mua hộp bút màu cho giờ học vẽ!"
          },
          {
            id: "ad_giant_crayon_castle",
            productName: "Lâu Đài Màu Vẽ 100 Cây Siêu Cấp",
            emoji: "🏰",
            price: 35,
            adSlogan: "GIẢM GIÁ SỐC TỪ 50 XU CÒN 35 XU! Ai cũng phải sở hữu!",
            hookType: "BIG_DISCOUNT",
            hookLabel: "Chi tiết thu hút: Giảm giá lớn & lời giới thiệu phóng đại",
            matchesStudentNeed: true,
            fitsWallet: false,
            shouldBuy: false,
            explanation: "Tuy là màu vẽ nhưng giá 35 Xu vượt quá số tiền hiện có trong ví (18 Xu) và quá cồng kềnh so với nhu cầu lớp 2."
          },
          {
            id: "ad_good_crayon_12",
            productName: "Hộp Bút Sáp Màu Thiên Nhiên 12 Màu Sky-Line",
            emoji: "🖍️",
            price: 14,
            adSlogan: "Màu sắc tươi sáng, an toàn cho đôi tay bé – Đủ 12 màu chuẩn bài học Mỹ thuật!",
            hookType: "GENUINE_QUALITY",
            hookLabel: "Chi tiết giới thiệu: Thông tin chất lượng rõ ràng, đúng nhu cầu học tập",
            matchesStudentNeed: true,
            fitsWallet: true,
            shouldBuy: true,
            explanation: "Đúng nhu cầu học vẽ, chất lượng an toàn và giá 14 Xu vừa vặn với ví tiền 18 Xu (còn dư 4 Xu tiết kiệm)!"
          }
        ]
      }
    }
  },
  {
    periodIndex: 15,
    lessonId: "les_fin_g2_p15",
    lessonCode: "TC02S.03.0005",
    lessonName: "Nhà tài chính nhí tài ba",
    topicId: "top_fin_g2_3",
    topicCode: "TC02S.03",
    officialTopicName: "Chủ đề 3. KIẾN TẠO TƯƠNG LAI TÀI CHÍNH",
    creativeZoneName: "Vùng 3: Đỉnh Đồi Tổ Ấm Ước Mơ",
    isProject: true,
    feathersReward: 5,
    badgeCode: "BADGE_TC02S_ISLAND_CHAMPION",
    badgeName: "Nhà Tài Chính Nhí Tài Ba 2S",
    mapCoordinates: { x: 88, y: 20 },
    criteria: [
      {
        code: "TC02S.03.0005.53",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Lập được phương án sử dụng một khoản tiền giả định cho nhu cầu cần thiết, tiết kiệm hoặc chia sẻ."
      },
      {
        code: "TC02S.03.0005.54",
        level: "Mức 2",
        competencyGroup: "Biết",
        description: "Thực hiện được nhiệm vụ mua sắm theo kế hoạch và ghi lại số tiền đã dùng, số tiền còn lại."
      },
      {
        code: "TC02S.03.0005.55",
        level: "Mức 3",
        competencyGroup: "Vận dụng",
        description: "Giải quyết được tình huống phát sinh như thiếu tiền, muốn mua thêm hoặc nhận sai tiền trả lại và giải thích được lựa chọn."
      }
    ],
    interactive: {
      mechanic: "COIN_DIARY_AD_STREET",
      evaluationMode: "HYBRID_TEACHER",
      storyBrief: "CHẶNG ĐÍCH VINH QUANG! Để nhận danh hiệu 'Nhà Tài Chính Nhí Tài Ba 2S', em hãy giúp chim Sky-Line lập phương án sử dụng 30 Xu cho đủ 3 mục tiêu (Mua đồ cần thiết – Bỏ heo đất tiết kiệm – Sẻ chia yêu thương), ghi vào Nhật ký đồng xu và xử lý tình huống phát sinh thật bản lĩnh nhé!",
      worldLocationName: "Đài Vinh Danh Nhà Tài Chính Nhí Sky-Line",
      mascotGuideTip: "Nhà tài chính nhí tài ba luôn biết: Lập kế hoạch trước khi chi – Ghi chép sau khi mua – Dành phần tiết kiệm & sẻ chia – Bình tĩnh, lịch sự trước mọi tình huống phát sinh!",
      practicalPrompt: "Em hãy viết lời cam kết hoặc kế hoạch sử dụng tiền thông minh của riêng em sau khi hoàn thành 15 chặng Đảo Tài Chính 2S:",
      parentCompanionTip: "Chúc mừng con đã hoàn thành 15 chặng Đảo Tài Chính 2S! Ba mẹ hãy cùng con xem lại Hộ chiếu Hành trình và trao cho con một cái ôm tự hào nhé!",
      diaryAdConfig: {
        mode: "MASTER_FINANCE_CAPSTONE",
        startingCoins: 30,
        diaryEntries: [
          {
            id: "cap_study_set",
            itemName: "Mua bộ vở ô li & bút chì (Nhu cầu cần thiết)",
            emoji: "📚",
            cost: 15,
            isNecessary: true,
            note: "Chi tiêu thiết yếu theo kế hoạch"
          },
          {
            id: "cap_charity_box",
            itemName: "Ủng hộ Quỹ bạn nghèo vượt khó (Chia sẻ)",
            emoji: "💝",
            cost: 5,
            isNecessary: true,
            note: "Đồng tiền hạnh phúc giúp đỡ bạn bè"
          },
          {
            id: "cap_piggy_save",
            itemName: "Bỏ ống heo đất ước mơ (Tiết kiệm)",
            emoji: "🐷",
            cost: 10,
            isNecessary: true,
            note: "Dành dụm cho mục tiêu tương lai (Còn lại 10 Xu trong heo đất)"
          }
        ],
        capstoneChallenge: {
          totalBudget: 30,
          minSaveCoins: 5,
          minShareCoins: 3,
          surpriseQuestion: "Tình huống tổng hợp: Khi thanh toán bộ vở & bút giá 15 Xu bằng tờ 20 Xu, cô bán hàng trả lại 3 Xu (thiếu 2 Xu), đồng thời bạn bên cạnh rủ em lấy tiền tiết kiệm mua thêm đồ chơi phát sáng giá 12 Xu. Em xử lý cả hai việc này thế nào?",
          surpriseOptions: [
            {
              id: "master_solution",
              text: "Lễ phép nhờ cô bán hàng kiểm tra và gửi đủ 5 Xu tiền thừa (20 - 15 = 5); đồng thời từ chối mua đồ chơi ngoài kế hoạch để giữ trọn 10 Xu bỏ heo đất và 5 Xu sẻ chia!",
              isCorrect: true,
              feedback: "CHÚC MỪNG NHÀ TÀI CHÍNH NHÍ TÀI BA! Em đã làm chủ hoàn hảo mọi kỹ năng của Đảo Tài Chính 2S!"
            },
            {
              id: "master_wrong_1",
              text: "Không cần kiểm tra tiền thừa và lấy hết tiền heo đất mua đồ chơi theo bạn.",
              isCorrect: false,
              feedback: "Hãy nhớ kiểm tra tiền trả lại lịch sự và bảo vệ kế hoạch tiết kiệm, sẻ chia của mình nhé!"
            }
          ]
        }
      }
    }
  }
];

export function getTC02SStageByLessonCode(lessonCode: string): TC02SStageDefinition | undefined {
  const norm = (lessonCode || "").trim().toUpperCase();
  return TC02S_STAGES.find(
    (s) => s.lessonCode.toUpperCase() === norm || s.lessonId.toUpperCase() === norm
  );
}

export function getTC02SStageByPeriod(periodIndex: number): TC02SStageDefinition | undefined {
  return TC02S_STAGES.find((s) => s.periodIndex === Number(periodIndex));
}
