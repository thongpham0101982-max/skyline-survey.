import { SheetCode, CatalogEducationLevel, ProgramType, ActivityEvaluationConfig } from './catalog-types';

export type ThemeAxisCode = 'DI_SAN' | 'MOI_TRUONG' | 'STEM' | 'NGON_NGU';

export interface ThemeAxisItem {
  code: ThemeAxisCode;
  name: string;
  shortName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const THEME_AXES: Record<ThemeAxisCode, ThemeAxisItem> = {
  DI_SAN: {
    code: 'DI_SAN',
    name: 'Di sản, lịch sử và bản sắc địa phương',
    shortName: 'Di sản & Bản sắc',
    description: 'Bảo tàng, Hội An, Mỹ Sơn, Địa đạo Kỳ Anh, Đại Nội Huế, nghệ thuật truyền thống...',
    color: '#d97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-800'
  },
  MOI_TRUONG: {
    code: 'MOI_TRUONG',
    name: 'Thiên nhiên, môi trường và nông nghiệp xanh',
    shortName: 'Môi trường & Nông nghiệp',
    description: 'Trang trại sinh thái, vườn rau, An Phú Farm, bảo vệ thiên nhiên và lối sống xanh...',
    color: '#059669',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-800'
  },
  STEM: {
    code: 'STEM',
    name: 'Khoa học, Toán học, STEM gắn với thực tiễn',
    shortName: 'Khoa học & STEM',
    description: 'Làng gốm Thanh Hà, Ngũ Hành Sơn, giỏ hàng thông minh, thiết kế sản phẩm, dự án thực tiễn...',
    color: '#0284c7',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    textColor: 'text-sky-800'
  },
  NGON_NGU: {
    code: 'NGON_NGU',
    name: 'Ngôn ngữ và văn hóa toàn cầu',
    shortName: 'Ngôn ngữ & Toàn cầu',
    description: 'Tiếng Anh trong bối cảnh thực, rạp phim Metiz, workshop quốc tế, giao lưu văn hóa...',
    color: '#7c3aed',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-800'
  }
};

export interface MasterActivityItem {
  appendixNumber: number;
  appendixTitle: string;
  code: string;
  name: string;
  educationLevel: CatalogEducationLevel;
  programType: ProgramType;
  sheetCode: SheetCode;
  grades: string[];
  themeAxis: ThemeAxisCode;
  themeName: string;
  integratedSubjects: string;
  primarySubjectName: string;
  educationalContent: string;
  learningOutcomes: string;
  timeFrame: string;
  semester: number;
  expectedLocation: string;
  deliverables: string;
  organizationFormat?: string;
  evaluationConfig: ActivityEvaluationConfig;
}

export const MASTER_ACTIVITIES_2026_2027: MasterActivityItem[] = [
  // =========================================================================
  // PHỤ LỤC 1: MẦM NON (5 hoạt động tương ứng tối đa 5 lần/năm)
  // =========================================================================
  {
    appendixNumber: 1,
    appendixTitle: 'Mầm non',
    code: 'HDNK-MN-01',
    name: 'Tìm hiểu nghệ thuật văn hoá truyền thống',
    educationLevel: 'MN',
    programType: 'HE_S',
    sheetCode: 'MN',
    grades: ['Mầm non'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục giá trị di sản văn hóa truyền thống và nghệ thuật dân gian qua lăng kính mầm non',
    integratedSubjects: 'Nghệ thuật, Phát triển ngôn ngữ',
    primarySubjectName: 'Nghệ thuật',
    educationalContent: 'Khám phá Văn hóa - Lịch sử địa phương/dân tộc; Trải nghiệm Nghệ thuật & Thủ công truyền thống; Giáo dục ý thức bảo tồn và phát triển.',
    learningOutcomes: 'Nhận diện và kể tên được một số nét đặc trưng cơ bản của di sản (hình dáng, màu sắc, hoa văn hoặc câu chuyện lịch sử liên quan). Hiểu được giá trị của di sản văn hóa đối với đời sống cộng đồng.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Nhà hát nghệ thuật truyền thống Đà Nẵng / Bảo tàng Nghệ thuật, nhà hát tuồng…',
    deliverables: 'Tranh vẽ/sản phẩm thủ công về di sản văn hóa đã tìm hiểu. Kể tên được một số đặc điểm nổi bật của di sản.',
    organizationFormat: 'Tham quan trải nghiệm trực quan',
    evaluationConfig: {
      mode: 'COMPLETION_LEVEL',
      modeTitle: 'Đánh giá quan sát mức độ tiến bộ của trẻ',
      hasRoleAssessment: false,
      completionLevels: ['Tốt - Tích cực hào hứng', 'Đạt - Tham gia hoàn thành', 'Cần cô hỗ trợ động viên']
    }
  },
  {
    appendixNumber: 1,
    appendixTitle: 'Mầm non',
    code: 'HDNK-MN-02',
    name: 'Tổ quốc em yêu',
    educationLevel: 'MN',
    programType: 'HE_S',
    sheetCode: 'MN',
    grades: ['Mầm non'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục tình yêu quê hương, đất nước, lòng biết ơn, rèn kỹ năng tự phục vụ',
    integratedSubjects: 'Khám phá khoa học – xã hội, Phát triển ngôn ngữ, Kỹ năng sống, Phát triển thể chất',
    primarySubjectName: 'Khám phá khoa học – xã hội',
    educationalContent: 'Trẻ biết các chú bộ đội là những người làm nhiệm vụ bảo vệ Tổ quốc. Quan sát cách các chú bộ đội sắp xếp chỗ ở, đồ dùng cá nhân. Trẻ biết thêm về nghề bộ đội, công việc, trang phục, phương tiện và môi trường làm việc của các chiến sĩ.',
    learningOutcomes: 'Biết tên gọi, công việc và một số hoạt động hằng ngày của các chú bộ đội; biết một số đặc điểm về trang phục, nơi ở và môi trường làm việc của bộ đội. Tham gia một số hoạt động vận động phù hợp, rèn sự nhanh nhẹn, khéo léo và tinh thần phối hợp cùng bạn.',
    timeFrame: 'Tháng 12',
    semester: 1,
    expectedLocation: 'Phước tường, Hòa Phát, Đà Nẵng / Vùng 3 Hải quân / Bảo tàng quân khu V',
    deliverables: 'Tranh vẽ/phiếu học tập về chú bộ đội và công việc của bộ đội. Kể tên được một số đặc điểm về trang phục, nơi ở, công việc của bộ đội.',
    organizationFormat: 'Giao lưu trải nghiệm thực địa',
    evaluationConfig: {
      mode: 'COMPLETION_LEVEL',
      modeTitle: 'Đánh giá quan sát mức độ tiến bộ của trẻ',
      hasRoleAssessment: false,
      completionLevels: ['Tốt - Nhanh nhẹn, nề nếp', 'Đạt - Tham gia đầy đủ', 'Cần cô hỗ trợ nề nếp']
    }
  },
  {
    appendixNumber: 1,
    appendixTitle: 'Mầm non',
    code: 'HDNK-MN-03',
    name: 'Hành trình về với thiên nhiên',
    educationLevel: 'MN',
    programType: 'HE_S',
    sheetCode: 'MN',
    grades: ['Mầm non'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Giáo dục tình yêu thiên nhiên, cây cỏ và bảo vệ môi trường sống',
    integratedSubjects: 'Vận động, Khám phá, Ngôn ngữ, Toán, Nghệ thuật',
    primarySubjectName: 'Khám phá',
    educationalContent: 'Tìm hiểu quá trình cây trồng sinh trưởng và tạo ra thực phẩm. Trải nghiệm chăm sóc, thu hoạch nông sản. Nhận biết mối liên hệ giữa nông trại và bữa ăn hằng ngày. Hình thành tình yêu thiên nhiên và ý thức chăm sóc, bảo vệ môi trường.',
    learningOutcomes: 'Trẻ nhận biết và gọi tên một số cây trồng, vật nuôi tại Farm. Mô tả được một số đặc điểm, nhu cầu sống qua quan sát. Thực hiện được một số thao tác đơn giản: tưới cây, cho vật nuôi ăn, thu hoạch... dưới sự hướng dẫn của cô.',
    timeFrame: 'Tháng 2',
    semester: 2,
    expectedLocation: 'An Phú Farm / Vườn rau Trà Quế / Khu du lịch sinh thái Trà Nhiêu',
    deliverables: 'Tráng mì lá truyền thống, sản phẩm nông sản thu hoạch thực tế.',
    organizationFormat: 'Trải nghiệm nông trại sinh thái',
    evaluationConfig: {
      mode: 'COMPLETION_LEVEL',
      modeTitle: 'Đánh giá quan sát mức độ tiến bộ của trẻ',
      hasRoleAssessment: false,
      completionLevels: ['Tốt - Khéo léo, tự giác', 'Đạt - Hoàn thành trải nghiệm', 'Cần cô hướng dẫn thêm']
    }
  },
  {
    appendixNumber: 1,
    appendixTitle: 'Mầm non',
    code: 'HDNK-MN-04',
    name: 'Đà Nẵng và bé',
    educationLevel: 'MN',
    programType: 'HE_S',
    sheetCode: 'MN',
    grades: ['Mầm non'],
    themeAxis: 'DI_SAN',
    themeName: 'Bé khám phá bảo tàng – Hành trình tìm hiểu lịch sử và văn hóa địa phương',
    integratedSubjects: 'Khám phá khoa học – xã hội, Phát triển ngôn ngữ, Kỹ năng sống',
    primarySubjectName: 'Khám phá khoa học – xã hội',
    educationalContent: 'Tìm hiểu đơn giản về lịch sử, văn hóa, con người và những giá trị truyền thống được giới thiệu tại bảo tàng. Rèn nề nếp khi tham quan nơi công cộng: đi theo nhóm, không chạy nhảy, không tự ý chạm hiện vật.',
    learningOutcomes: 'Trẻ nhận biết và nói được một số đặc điểm, tên gọi hoặc ý nghĩa đơn giản của hiện vật. Biết lắng nghe, trả lời câu hỏi và mạnh dạn đặt câu hỏi. Tuân thủ nội quy tham quan bảo tàng an toàn.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Bảo tàng Đà Nẵng / Thư viện / Nhà sách',
    deliverables: 'Tranh vẽ/phiếu học tập về hiện vật hoặc nội dung đã tham quan tại bảo tàng.',
    organizationFormat: 'Tham quan bảo tàng di sản',
    evaluationConfig: {
      mode: 'COMPLETION_LEVEL',
      modeTitle: 'Đánh giá quan sát mức độ tiến bộ của trẻ',
      hasRoleAssessment: false,
      completionLevels: ['Tốt - Nề nếp chuẩn mực, tự tin', 'Đạt - Tuân thủ hướng dẫn', 'Cần cô nhắc nhở nề nếp']
    }
  },
  {
    appendixNumber: 1,
    appendixTitle: 'Mầm non',
    code: 'HDNK-MN-05',
    name: 'Bé và những con vật đáng yêu',
    educationLevel: 'MN',
    programType: 'HE_S',
    sheetCode: 'MN',
    grades: ['Mầm non'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Tham quan tìm hiểu các loài động vật quen thuộc và đặc trưng (vd: Voọc Chà Vá)',
    integratedSubjects: 'Khám phá khoa học, Phát triển ngôn ngữ',
    primarySubjectName: 'Khám phá khoa học',
    educationalContent: 'Khám phá thế giới động vật; so sánh đặc điểm, môi trường sống; hình thành kỹ năng quan sát. Hình thành tình yêu thiên nhiên và hiểu cách bảo vệ động vật hoang dã.',
    learningOutcomes: 'Trẻ nhận biết và gọi tên được một số con vật đã quan sát; nhận ra đặc điểm nổi bật như hình dáng, màu sắc, thức ăn, môi trường sống. Bước đầu hiểu rằng động vật cần môi trường sống phù hợp, biết hành động bảo vệ như không xả rác, không trêu chọc động vật.',
    timeFrame: 'Tháng 8 (Hè)',
    semester: 2,
    expectedLocation: 'Bảo tàng Voọc Sơn Trà / Biểu diễn cá heo / Tiệm Cây và Nước / Furama',
    deliverables: 'Kể tên, nêu được một số đặc điểm hoặc ý nghĩa đơn giản của hiện vật/động vật đã quan sát.',
    organizationFormat: 'Trải nghiệm sinh thái động vật',
    evaluationConfig: {
      mode: 'COMPLETION_LEVEL',
      modeTitle: 'Đánh giá quan sát mức độ tiến bộ của trẻ',
      hasRoleAssessment: false,
      completionLevels: ['Tốt - Yêu thiên nhiên, quan sát tinh tế', 'Đạt - Tham gia nhiệt tình', 'Cần hỗ trợ']
    }
  },

  // =========================================================================
  // PHỤ LỤC 2: TIỂU HỌC HỆ S (6 hoạt động - mỗi khối 2 lần/năm)
  // =========================================================================
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-01',
    name: 'Hành trình khám phá sắc màu di sản (Khối 1)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['1'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục giá trị di sản văn hóa truyền thống và nghệ thuật dân gian qua lăng kính liên môn',
    integratedSubjects: 'Lịch sử & Địa lí địa phương, Mĩ thuật, Tiếng Việt',
    primarySubjectName: 'Mĩ thuật',
    educationalContent: 'Khám phá Văn hóa - Lịch sử địa phương/dân tộc; Trải nghiệm Nghệ thuật & Thủ công truyền thống; Giáo dục ý thức bảo tồn và phát huy di sản văn hóa.',
    learningOutcomes: 'Nhận diện và kể tên được một số nét đặc trưng cơ bản của di sản (hình dáng, màu sắc, hoa văn hoặc câu chuyện lịch sử liên quan). Hiểu được giá trị của di sản đối với đời sống cộng đồng.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Bảo tàng Mỹ thuật Đà Nẵng',
    deliverables: 'Tranh dân gian Đông Hồ tự in/vẽ và bài thu hoạch trải nghiệm.',
    organizationFormat: 'Trải nghiệm thực địa bảo tàng',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Tiểu học',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Thái độ tham gia & Tuân thủ nội quy', weight: 30, maxScore: 10 },
        { id: 'crit_2', name: 'Khả năng quan sát & Ghi nhận di sản', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Chất lượng sản phẩm Tranh Đông Hồ', weight: 40, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-02',
    name: 'Hành trình khám phá sắc màu di sản (Khối 2)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['2'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục giá trị di sản văn hóa truyền thống và nghệ thuật dân gian qua lăng kính liên môn',
    integratedSubjects: 'Lịch sử & Địa lí địa phương, Mĩ thuật, Tiếng Việt',
    primarySubjectName: 'Mĩ thuật',
    educationalContent: 'Khám phá Văn hóa - Lịch sử địa phương; Trải nghiệm Nghệ thuật in khắc mộc bản truyền thống; Giáo dục bảo tồn di sản.',
    learningOutcomes: 'Nhận diện và phân biệt các dòng tranh dân gian, màu sắc tự nhiên và hoa văn truyền thống.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Bảo tàng Mỹ thuật Đà Nẵng',
    deliverables: 'Tranh dân gian Đông Hồ tự in/vẽ.',
    organizationFormat: 'Trải nghiệm thực địa bảo tàng',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Tiểu học',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Thái độ tham gia & Kỷ luật nhóm', weight: 30, maxScore: 10 },
        { id: 'crit_2', name: 'Tìm hiểu đặc trưng văn hóa nghệ thuật', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Sản phẩm tranh và thuyết minh ngắn', weight: 40, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-03',
    name: 'Hành trình khám phá sắc màu di sản (Khối 3)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['3'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục giá trị di sản văn hóa truyền thống và nghệ thuật dân gian qua lăng kính liên môn',
    integratedSubjects: 'Lịch sử & Địa lí địa phương, Mĩ thuật, Tiếng Việt',
    primarySubjectName: 'Mĩ thuật',
    educationalContent: 'Tìm hiểu sâu về các nghệ nhân, kỹ thuật pha chế màu tự nhiên từ lá cây, vỏ sò, tro bếp.',
    learningOutcomes: 'Mô tả được quy trình tạo tác sản phẩm nghệ thuật dân gian, tự hào về bàn tay khéo léo của người Việt.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Bảo tàng Mỹ thuật Đà Nẵng',
    deliverables: 'Tranh Đông Hồ và phiếu thu hoạch cảm xúc.',
    organizationFormat: 'Trải nghiệm thực địa bảo tàng',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Tiểu học',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Ý thức bảo đảm an toàn & Tương tác', weight: 30, maxScore: 10 },
        { id: 'crit_2', name: 'Kỹ năng ghi chép và phỏng vấn cô hướng dẫn', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Hoàn thiện tranh và chia sẻ ý nghĩa', weight: 40, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-04',
    name: 'Hành trình khám phá sắc màu di sản (Khối 4, 5)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['4', '5'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục giá trị di sản văn hóa truyền thống và nghệ thuật dân gian qua lăng kính liên môn',
    integratedSubjects: 'Lịch sử & Địa lí địa phương, Mĩ thuật, Tiếng Việt',
    primarySubjectName: 'Mĩ thuật',
    educationalContent: 'Phân tích các giá trị lịch sử và thông điệp nhân văn trong từng tác phẩm hội họa, điêu khắc dân gian.',
    learningOutcomes: 'Học sinh viết được đoạn văn ngắn giới thiệu về một tác phẩm di sản yêu thích; đề xuất ý tưởng giữ gìn nét đẹp truyền thống.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Bảo tàng Mỹ thuật Đà Nẵng',
    deliverables: 'Tranh Đông Hồ kết hợp bài viết cảm nhận cá nhân.',
    organizationFormat: 'Trải nghiệm thực địa bảo tàng',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Tiểu học',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Nề nếp tham gia & Trách nhiệm nhóm', weight: 25, maxScore: 10 },
        { id: 'crit_2', name: 'Tư duy liên môn Lịch sử - Mĩ thuật', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Sản phẩm sáng tạo & Đoạn văn cảm thụ', weight: 40, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-05',
    name: 'Farm Exploration Day – Khám phá trang trại xanh (Khối 1, 2, 3)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['1', '2', '3'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Khám phá trang trại xanh và giáo dục bảo vệ môi trường tự nhiên',
    integratedSubjects: 'Tiếng Anh, CXXH, Tiểu học',
    primarySubjectName: 'Tiếng Anh',
    educationalContent: 'Tham quan vườn cây ăn trái, tìm hiểu đặc điểm/đặc trưng theo mùa. Khám phá động vật (chim công, chim trĩ, bồ câu, chuột lang...). Vui chơi dưới nước kết hợp vận động ngoài trời.',
    learningOutcomes: 'Nhận biết được một số loại trái cây và đặc điểm cơ bản của động vật bằng từ vựng tiếng Anh. Thực hiện nhiệm vụ làm nông dân/câu cá/vẽ tranh. Chấp hành an toàn và tinh thần hợp tác.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Thôn 2 An Sơn, xã Hoà Ninh, huyện Hoà Vang, Đà Nẵng',
    deliverables: 'Tranh vẽ/phiếu quan sát về cây ăn trái và động vật; chia sẻ ngắn từ vựng tiếng Anh.',
    organizationFormat: 'Dã ngoại sinh thái nông trại',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Nông trại xanh',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Tương tác ngôn ngữ Tiếng Anh', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Kỹ năng trải nghiệm thực địa & Tự lập', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Phiếu quan sát và bảo vệ môi trường', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 2,
    appendixTitle: 'Tiểu học Hệ S',
    code: 'HDNK-THS-06',
    name: 'Farm Exploration Day – Khám phá trang trại xanh (Khối 4, 5)',
    educationLevel: 'TIEU_HOC',
    programType: 'HE_S',
    sheetCode: 'TH_S',
    grades: ['4', '5'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Khám phá trang trại xanh và giáo dục bảo vệ môi trường tự nhiên',
    integratedSubjects: 'Tiếng Anh, CXXH, Tiểu học',
    primarySubjectName: 'Tiếng Anh',
    educationalContent: 'Tham quan sinh thái nâng cao, phân tích chuỗi cung ứng thực phẩm từ nông trại đến bàn ăn, giao tiếp tiếng Anh với chuyên gia nông nghiệp.',
    learningOutcomes: 'Sử dụng cấu trúc câu tiếng Anh mô tả vòng đời cây trồng; lập kế hoạch tiết kiệm tài nguyên nước và rác thải tại nông trại.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Thôn 2 An Sơn, xã Hoà Ninh, huyện Hoà Vang, Đà Nẵng',
    deliverables: 'Poster song ngữ về giải pháp bảo vệ hệ sinh thái trang trại.',
    organizationFormat: 'Dã ngoại sinh thái nông trại',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Nông trại xanh',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Thuyết trình Tiếng Anh về hệ sinh thái', weight: 40, maxScore: 10 },
        { id: 'crit_2', name: 'Làm việc nhóm & Kỹ năng sinh tồn an toàn', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Poster sản phẩm học tập', weight: 30, maxScore: 10 }
      ]
    }
  },

  // =========================================================================
  // PHỤ LỤC 3: THCS HỆ S (5 hoạt động)
  // =========================================================================
  {
    appendixNumber: 3,
    appendixTitle: 'THCS Hệ S',
    code: 'HDNK-THCSS-01',
    name: 'Giỏ hàng thông minh - Gia đình khỏe mạnh (Khối 6)',
    educationLevel: 'THCS',
    programType: 'HE_S',
    sheetCode: 'THCS_S',
    grades: ['6'],
    themeAxis: 'STEM',
    themeName: 'Ứng dụng Toán học, KHTN và Kỹ năng chi tiêu thông minh trong đời sống gia đình',
    integratedSubjects: 'Toán, KHTN, Tin học, Tiếng Anh',
    primarySubjectName: 'Toán',
    educationalContent: 'Khảo sát giá cả, tính toán tỷ lệ giảm giá, phân số và chiết khấu tại siêu thị. Đọc nhãn mác dinh dưỡng và xuất xứ thực phẩm an toàn. Đọc nhãn sản phẩm bằng tiếng Anh.',
    learningOutcomes: 'Lập bảng tính Excel so sánh các phương án mua sắm tối ưu; nhận biết thực phẩm có lợi cho sức khỏe; sử dụng từ vựng tiếng Anh về mua sắm.',
    timeFrame: 'Tháng 12',
    semester: 1,
    expectedLocation: 'Siêu thị gần trường (Co.opmart / Lotte / WinMart...)',
    deliverables: 'Bảng tính Excel kế hoạch giỏ hàng thông minh và bài thuyết trình nhóm.',
    organizationFormat: 'Dự án học tập thực tế tại siêu thị',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Dự án THCS',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Môn Toán: Tính toán ngân sách & Tỉ số %', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Môn KHTN & Tin: Dinh dưỡng & Bảng tính Excel', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Tiếng Anh: Đọc nhãn mác & Thuyết trình', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 3,
    appendixTitle: 'THCS Hệ S',
    code: 'HDNK-THCSS-02',
    name: 'Tinh hoa đất Việt – Hành trình khám phá Làng gốm Thanh Hà (Khối 7)',
    educationLevel: 'THCS',
    programType: 'HE_S',
    sheetCode: 'THCS_S',
    grades: ['7'],
    themeAxis: 'STEM',
    themeName: 'Khám phá văn hóa làng nghề và tích hợp liên môn Toán - KHTN - Lịch sử Địa lí',
    integratedSubjects: 'Toán, KHTN, Mĩ thuật, Lịch sử & Địa lí, Tiếng Anh',
    primarySubjectName: 'Toán',
    educationalContent: 'Khảo sát hình học khối tròn xoay của sản phẩm gốm. Tìm hiểu biến đổi vật lí - hóa học khi nung đất sét ở nhiệt độ cao. Tìm hiểu lịch sử hình thành làng gốm thế kỷ 16.',
    learningOutcomes: 'Học sinh đo đạc, tính thể tích và diện tích các hình gốm; trải nghiệm nhào nặn gốm thủ công; quay video ngắn giới thiệu làng nghề.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Làng gốm Thanh Hà, Hội An, Quảng Nam',
    deliverables: 'Sản phẩm gốm tự tạo tác, video phóng sự ngắn về làng nghề Thanh Hà.',
    organizationFormat: 'Dự án thực địa làng nghề truyền thống',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Làng nghề',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Nội dung liên môn Toán - KHTN (Đo đạc, Vật liệu)', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Nội dung Lịch sử - Địa lí (Nguồn gốc di sản)', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Sản phẩm gốm & Video truyền thông song ngữ', weight: 35, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 3,
    appendixTitle: 'THCS Hệ S',
    code: 'HDNK-THCSS-03',
    name: 'Về với Kỳ Anh - Một huyền thoại (Khối 8)',
    educationLevel: 'THCS',
    programType: 'HE_S',
    sheetCode: 'THCS_S',
    grades: ['8'],
    themeAxis: 'DI_SAN',
    themeName: 'Giáo dục truyền thống cách mạng, lịch sử kháng chiến và chủ quyền dân tộc',
    integratedSubjects: 'Lịch sử, Địa lí, Ngữ văn, GDQP-AN, Tiếng Anh',
    primarySubjectName: 'Lịch sử',
    educationalContent: 'Thực địa hệ thống địa đạo Kỳ Anh, tìm hiểu nghệ thuật chiến tranh nhân dân, điều kiện địa hình và tinh thần kiên cường của quân dân vùng cát.',
    learningOutcomes: 'Học sinh viết bài văn cảm nhận tri ân người có công; thực hiện phóng sự ảnh/podcast giới thiệu địa đạo Kỳ Anh bằng tiếng Việt và tiếng Anh.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Địa đạo Kỳ Anh, Tam Kỳ, Quảng Nam',
    deliverables: 'Video ngắn / Podcast / Tạp chí ảnh giới thiệu Địa đạo Kỳ Anh bằng Tiếng Anh.',
    organizationFormat: 'Hành trình về nguồn lịch sử',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Địa đạo Kỳ Anh',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Hiểu biết lịch sử & Khảo sát địa hình chiến lược', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Ý thức kỷ luật nề nếp & Tinh thần về nguồn', weight: 25, maxScore: 10 },
        { id: 'crit_3', name: 'Chất lượng Podcast/Video song ngữ giới thiệu di tích', weight: 40, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 3,
    appendixTitle: 'THCS Hệ S',
    code: 'HDNK-THCSS-04',
    name: 'Khám phá Ngũ Hành Sơn - Hành trình địa chất, lịch sử và văn hóa (Khối 9)',
    educationLevel: 'THCS',
    programType: 'HE_S',
    sheetCode: 'THCS_S',
    grades: ['9'],
    themeAxis: 'STEM',
    themeName: 'Nghiên cứu cấu tạo địa chất núi đá vôi Karst gắn với văn hóa Phật giáo và danh thắng',
    integratedSubjects: 'Khoa học tự nhiên, Lịch sử & Địa lí, Ngữ văn, Tiếng Anh',
    primarySubjectName: 'Khoa học tự nhiên',
    educationalContent: 'Khảo sát hiện tượng phong hóa hóa học của đá vôi, cấu trúc hang động và thạch nhũ. Tìm hiểu các bia ma nhai được công nhận di sản tư liệu thế giới.',
    learningOutcomes: 'Đo độ pH nước ngầm trong hang, phân tích mẫu đất đá; viết cẩm nang song ngữ quảng bá du lịch bền vững Ngũ Hành Sơn.',
    timeFrame: 'Tháng 1/2027',
    semester: 2,
    expectedLocation: 'Danh thắng Ngũ Hành Sơn, Đà Nẵng',
    deliverables: 'Bản đồ số địa hình danh thắng, cẩm nang du lịch xanh Ngũ Hành Sơn.',
    organizationFormat: 'Nghiên cứu thực địa khoa học và văn hóa',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Ngũ Hành Sơn',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'KHTN: Báo cáo khảo sát địa chất & Môi trường', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Lịch sử - Địa lí: Tìm hiểu Ma nhai & Di sản', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Tiếng Anh: Cẩm nang hướng dẫn viên di sản', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 3,
    appendixTitle: 'THCS Hệ S',
    code: 'HDNK-THCSS-05',
    name: 'Trải nghiệm điện ảnh tiếng Anh tại Metiz Cinema (Khối 6, 7, 8, 9)',
    educationLevel: 'THCS',
    programType: 'HE_S',
    sheetCode: 'THCS_S',
    grades: ['6', '7', '8', '9'],
    themeAxis: 'NGON_NGU',
    themeName: 'Phát triển kỹ năng ngôn ngữ và cảm thụ nghệ thuật điện ảnh toàn cầu',
    integratedSubjects: 'Tiếng Anh, Ngữ văn, Giáo dục công dân',
    primarySubjectName: 'Tiếng Anh',
    educationalContent: 'Xem phim điện ảnh quốc tế nguyên bản tiếng Anh có phụ đề. Thảo luận các chủ đề nhân văn, tình bạn, lòng dũng cảm và bảo vệ hòa bình thế giới.',
    learningOutcomes: 'Học sinh viết bài cảm nhận (Film Review) bằng tiếng Anh; thiết kế poster tóm tắt cốt truyện và các thông điệp ý nghĩa.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Rạp chiếu phim Metiz Cinema Đà Nẵng',
    deliverables: 'Poster / Video review / Bài viết Film Review bằng Tiếng Anh.',
    organizationFormat: 'Trải nghiệm văn hóa điện ảnh',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Điện ảnh',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Khả năng nghe hiểu & Ghi chú từ vựng/cốt truyện', weight: 30, maxScore: 10 },
        { id: 'crit_2', name: 'Tư duy phản biện & Cảm thụ thông điệp nhân văn', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Chất lượng bài Film Review / Poster sáng tạo', weight: 40, maxScore: 10 }
      ]
    }
  },

  // =========================================================================
  // PHỤ LỤC 4: THPT HỆ S (2 hoạt động)
  // =========================================================================
  {
    appendixNumber: 4,
    appendixTitle: 'THPT Hệ S',
    code: 'HDNK-THPTS-01',
    name: 'Ký ức Cố Đô – Đại Nội Huế: Không gian văn hóa & Lịch sử triều Nguyễn (Khối 10, 11, 12)',
    educationLevel: 'THPT',
    programType: 'HE_S',
    sheetCode: 'THPT_S',
    grades: ['10', '11', '12'],
    themeAxis: 'DI_SAN',
    themeName: 'Khám phá di sản quần thể kiến trúc Cố đô Huế và nghệ thuật cung đình',
    integratedSubjects: 'Lịch sử, Địa lí, Mĩ thuật, Tiếng Anh',
    primarySubjectName: 'Lịch sử',
    educationalContent: 'Khảo sát kiến trúc cung đình triều Nguyễn (pháp lam, khảm sành sứ, kiến trúc trùng thiềm điệp ốc). Tìm hiểu thiết chế chính trị, thi cử và vai trò của triều đình trong bảo vệ biên cương.',
    learningOutcomes: 'Học sinh thiết kế mô hình 3D hoặc ấn phẩm số giới thiệu Đại Nội Huế; thuyết trình chuyên sâu bằng tiếng Anh về giá trị bảo tồn di sản.',
    timeFrame: 'Tháng 10',
    semester: 1,
    expectedLocation: 'Đại Nội Huế, Thừa Thiên Huế',
    deliverables: 'Ấn phẩm số / Video tài liệu / Mô hình 3D về Đại Nội Huế và thuyết minh tiếng Anh.',
    organizationFormat: 'Dự án thực địa nghiên cứu chuyên sâu',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Cố đô Huế',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Nghiên cứu lịch sử & Phân tích kiến trúc cung đình', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Thuyết minh tiếng Anh & Phong thái học thuật', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Chất lượng ấn phẩm số / Mô hình 3D', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 4,
    appendixTitle: 'THPT Hệ S',
    code: 'HDNK-THPTS-02',
    name: 'Trải nghiệm điện ảnh tiếng Anh tại Metiz Cinema (Khối 10, 11, 12)',
    educationLevel: 'THPT',
    programType: 'HE_S',
    sheetCode: 'THPT_S',
    grades: ['10', '11', '12'],
    themeAxis: 'NGON_NGU',
    themeName: 'Phát triển tư duy phản biện, kỹ năng phân tích điện ảnh và truyền thông quốc tế',
    integratedSubjects: 'Tiếng Anh, Ngữ văn, Lịch sử',
    primarySubjectName: 'Tiếng Anh',
    educationalContent: 'Thưởng thức tác phẩm điện ảnh nghệ thuật quốc tế; phân tích thủ pháp điện ảnh, tâm lý nhân vật và các vấn đề xã hội đương đại.',
    learningOutcomes: 'Học sinh viết bài luận phê bình điện ảnh (Film Critique Essay) chuẩn quốc tế; quay vlog thảo luận nhóm song ngữ.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Rạp chiếu phim Metiz Cinema Đà Nẵng',
    deliverables: 'Bài luận phê bình điện ảnh (Film Essay) và Vlog thảo luận nhóm.',
    organizationFormat: 'Trải nghiệm văn hóa điện ảnh',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Điện ảnh THPT',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Tư duy phản biện & Phân tích nghệ thuật điện ảnh', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Trình độ viết luận Tiếng Anh học thuật', weight: 40, maxScore: 10 },
        { id: 'crit_3', name: 'Vlog thảo luận và góc nhìn công dân toàn cầu', weight: 25, maxScore: 10 }
      ]
    }
  },

  // =========================================================================
  // PHỤ LỤC 5: TIỂU HỌC HỆ UK, INT (4 hoạt động)
  // =========================================================================
  {
    appendixNumber: 5,
    appendixTitle: 'Tiểu học Hệ UK, INT',
    code: 'HDNK-THQT-01',
    name: 'Explore An Farm – Trải nghiệm đời sống nông trại và trổ tài đầu bếp (Khối 1, 2)',
    educationLevel: 'TIEU_HOC',
    programType: 'SONG_NGU',
    sheetCode: 'TH_QT',
    grades: ['1', '2'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Farm Life & Junior Chef Adventure',
    integratedSubjects: 'English, Science, Arts & Crafts',
    primarySubjectName: 'English',
    educationalContent: 'Khám phá đời sống nông trại hữu cơ, thu hoạch rau sạch và trải nghiệm làm đầu bếp nhí tự tay chế biến món ăn đơn giản.',
    learningOutcomes: 'Học sinh sử dụng tiếng Anh giao tiếp tự nhiên về tên gọi nông sản, dụng cụ nhà bếp và quy trình chế biến món ăn an toàn.',
    timeFrame: 'Tháng 11',
    semester: 1,
    expectedLocation: '633 Nguyễn Tất Thành, P. Thanh Hà, Hội An',
    deliverables: 'Món ăn tự làm và nhật ký nông trại bằng tiếng Anh.',
    organizationFormat: 'Trải nghiệm thực địa nông trại quốc tế',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Farm & Cooking',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'English Communication & Vocabulary', weight: 40, maxScore: 10 },
        { id: 'crit_2', name: 'Hands-on Cooking & Kitchen Hygiene', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Farm Log Book & Presentation', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 5,
    appendixTitle: 'Tiểu học Hệ UK, INT',
    code: 'HDNK-THQT-02',
    name: 'Become a Plush Toy Designer – Một ngày trở thành nhà thiết kế thú bông (Khối 3, 4, 5)',
    educationLevel: 'TIEU_HOC',
    programType: 'SONG_NGU',
    sheetCode: 'TH_QT',
    grades: ['3', '4', '5'],
    themeAxis: 'STEM',
    themeName: 'Design Thinking & Creative Toy Making',
    integratedSubjects: 'English, Design & Technology, Visual Arts',
    primarySubjectName: 'English',
    educationalContent: 'Áp dụng quy trình tư duy thiết kế (Design Thinking): Lên ý tưởng bản vẽ, lựa chọn vải và phụ liệu tái chế, tự tay khâu may và hoàn thiện sản phẩm.',
    learningOutcomes: 'Thuyết trình sản phẩm bằng tiếng Anh (tên gọi, tính cách, thông điệp bảo vệ động vật); trưng bày sản phẩm triển lãm.',
    timeFrame: 'Tháng 11',
    semester: 1,
    expectedLocation: '79 Tôn Thất Dương Kỵ, P. Hòa Xuân, Đà Nẵng',
    deliverables: 'Thú bông handmade và bản vẽ thiết kế đồ họa kèm thuyết minh tiếng Anh.',
    organizationFormat: 'Workshop thiết kế sáng tạo',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Toy Designer',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Design Thinking & Creativity', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'English Pitching & Storytelling', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Craftsmanship & Quality of Final Toy', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 5,
    appendixTitle: 'Tiểu học Hệ UK, INT',
    code: 'HDNK-THQT-03',
    name: 'Farm Exploration Day – Khám phá trang trại xanh (Khối 1, 2, 3)',
    educationLevel: 'TIEU_HOC',
    programType: 'SONG_NGU',
    sheetCode: 'TH_QT',
    grades: ['1', '2', '3'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Green Farm Ecology & Outdoor Learning',
    integratedSubjects: 'English, Natural Science, Physical Education',
    primarySubjectName: 'English',
    educationalContent: 'Khảo sát hệ sinh thái thực vật, quan sát động vật quý hiếm, tham gia trò chơi vận động teamwork bằng tiếng Anh.',
    learningOutcomes: 'Tự tin giao tiếp tiếng Anh bối cảnh ngoài lớp học; hoàn thành nhật ký quan sát khoa học tự nhiên.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Thôn 2 An Sơn, xã Hoà Ninh, Hòa Vang, Đà Nẵng',
    deliverables: 'Science observation booklet and English speech recording.',
    organizationFormat: 'Outdoor experiential camp',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Green Farm',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'English Listening & Speaking Fluency', weight: 40, maxScore: 10 },
        { id: 'crit_2', name: 'Scientific Curiosity & Environmental Habits', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'Teamwork & Safety Guidelines', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 5,
    appendixTitle: 'Tiểu học Hệ UK, INT',
    code: 'HDNK-THQT-04',
    name: 'Farm Exploration Day – Khám phá trang trại xanh (Khối 4, 5)',
    educationLevel: 'TIEU_HOC',
    programType: 'SONG_NGU',
    sheetCode: 'TH_QT',
    grades: ['4', '5'],
    themeAxis: 'MOI_TRUONG',
    themeName: 'Ecosystem Sustainability & Young Ecologist',
    integratedSubjects: 'English, Global Perspectives, Science',
    primarySubjectName: 'English',
    educationalContent: 'Thực hiện dự án sinh thái: Đo đạc chỉ số môi trường, phỏng vấn chuyên gia trang trại bằng tiếng Anh, đề xuất mô hình vườn trường bền vững.',
    learningOutcomes: 'Thuyết trình dự án bảo tồn sinh thái bằng tiếng Anh; xây dựng infographic hướng tới mục tiêu phát triển bền vững.',
    timeFrame: 'Tháng 4',
    semester: 2,
    expectedLocation: 'Thôn 2 An Sơn, xã Hoà Ninh, Hòa Vang, Đà Nẵng',
    deliverables: 'Sustainability Infographic and group video report in English.',
    organizationFormat: 'Outdoor experiential camp',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Sustainability',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Global Perspectives & Ecological Analysis', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'English Academic Presentation', weight: 40, maxScore: 10 },
        { id: 'crit_3', name: 'Group Collaboration & Infographic Quality', weight: 25, maxScore: 10 }
      ]
    }
  },

  // =========================================================================
  // PHỤ LỤC 6: THCS HỆ UK, INT (5 hoạt động - CS3)
  // =========================================================================
  {
    appendixNumber: 6,
    appendixTitle: 'THCS Hệ UK, INT',
    code: 'HDNK-THCSQT-01',
    name: 'Trải nghiệm điện ảnh tiếng Anh tại Metiz Cinema (Khối 6, 7, 8, 9 CS3)',
    educationLevel: 'THCS',
    programType: 'SONG_NGU',
    sheetCode: 'THCS_QT',
    grades: ['6', '7', '8', '9'],
    themeAxis: 'NGON_NGU',
    themeName: 'Global Cinema & Creative Media Production',
    integratedSubjects: 'English, Drama, Global Studies',
    primarySubjectName: 'English',
    educationalContent: 'Xem phim quốc tế nguyên bản tiếng Anh, phân tích nghệ thuật kịch bản và đạo diễn, tổ chức talkshow thảo luận văn hóa.',
    learningOutcomes: 'Viết bài review phân tích nhân vật; sáng tạo podcast phê bình điện ảnh bằng tiếng Anh.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Rạp chiếu phim Metiz Cinema Đà Nẵng',
    deliverables: 'Podcast / Video review / Film critique essay in English.',
    organizationFormat: 'Trải nghiệm văn hóa điện ảnh',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Cinema Media',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Critical Media Literacy & Thematic Analysis', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Advanced English Expression & Vocabulary', weight: 40, maxScore: 10 },
        { id: 'crit_3', name: 'Podcast/Video Production Value', weight: 25, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 6,
    appendixTitle: 'THCS Hệ UK, INT',
    code: 'HDNK-THCSQT-02',
    name: 'Giỏ hàng thông minh - Gia đình khỏe mạnh (Khối 6 CS3)',
    educationLevel: 'THCS',
    programType: 'SONG_NGU',
    sheetCode: 'THCS_QT',
    grades: ['6'],
    themeAxis: 'STEM',
    themeName: 'Smart Consumer & Financial Mathematics',
    integratedSubjects: 'Maths, Science, ICT, English',
    primarySubjectName: 'Maths',
    educationalContent: 'Tính toán tài chính gia đình, phân tích dữ liệu mua sắm, đánh giá thành phần dinh dưỡng chuẩn WHO bằng tiếng Anh.',
    learningOutcomes: 'Lập bảng tính chi tiêu tối ưu; thuyết trình giải pháp dinh dưỡng thông minh bằng tiếng Anh.',
    timeFrame: 'Tháng 12/2026',
    semester: 1,
    expectedLocation: 'Siêu thị thương mại quốc tế (Lotte Mart / MM Mega Market)',
    deliverables: 'Excel Budgeting model and English group pitch deck.',
    organizationFormat: 'Dự án thực tế siêu thị',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Smart Consumer',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Mathematical Modelling & Price Optimization', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Nutritional Science & Label Literacy', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'English Presentation & Tech Integration', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 6,
    appendixTitle: 'THCS Hệ UK, INT',
    code: 'HDNK-THCSQT-03',
    name: 'Tinh hoa đất Việt – Làng gốm Thanh Hà (Khối 7 CS3)',
    educationLevel: 'THCS',
    programType: 'SONG_NGU',
    sheetCode: 'THCS_QT',
    grades: ['7'],
    themeAxis: 'STEM',
    themeName: 'Ancient Pottery Craftsmanship & Material Physics',
    integratedSubjects: 'Maths, Science, Arts, Humanities, English',
    primarySubjectName: 'Maths',
    educationalContent: 'Nghiên cứu hình học khối quay và cơ học bàn xoay gốm; tìm hiểu lịch sử con đường tơ lụa trên biển và xuất khẩu gốm Hội An.',
    learningOutcomes: 'Thực hành tạo tác sản phẩm gốm; quay vlog song ngữ hướng dẫn viên di sản quốc tế.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Làng gốm Thanh Hà, Hội An, Quảng Nam',
    deliverables: 'Handcrafted ceramic artifact and bilingual cultural documentary.',
    organizationFormat: 'Nghiên cứu thực địa làng nghề',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Heritage Craft',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Geometry & Material Science Analysis', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Historical Heritage Documentation', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'English Cultural Documentary Quality', weight: 35, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 6,
    appendixTitle: 'THCS Hệ UK, INT',
    code: 'HDNK-THCSQT-04',
    name: 'Về với Kỳ Anh - Một huyền thoại (Khối 8 CS3)',
    educationLevel: 'THCS',
    programType: 'SONG_NGU',
    sheetCode: 'THCS_QT',
    grades: ['8'],
    themeAxis: 'DI_SAN',
    themeName: 'Historical Courage & Underground Defense Heritage',
    integratedSubjects: 'History, Geography, Literature, English',
    primarySubjectName: 'History',
    educationalContent: 'Khảo sát thực địa đường hầm địa đạo Kỳ Anh, nghiên cứu hệ thống thông gió và chiến thuật du kích vùng cát.',
    learningOutcomes: 'Thực hiện podcast song ngữ phỏng vấn nhân chứng lịch sử; lập sơ đồ tư duy phân tích yếu tố địa lý trong chiến tranh.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Địa đạo Kỳ Anh, Tam Kỳ, Quảng Nam',
    deliverables: 'Bilingual historical podcast and digital interactive tunnel map.',
    organizationFormat: 'Hành trình về nguồn lịch sử',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Ky Anh Tunnels',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Historical Empathy & Defense Strategy Insight', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Bilingual Historical Storytelling', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Field Discipline & Digital Map Presentation', weight: 30, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 6,
    appendixTitle: 'THCS Hệ UK, INT',
    code: 'HDNK-THCSQT-05',
    name: 'Khám phá Ngũ Hành Sơn – Karst Geology & Sacred Heritage (Khối 9 CS3)',
    educationLevel: 'THCS',
    programType: 'SONG_NGU',
    sheetCode: 'THCS_QT',
    grades: ['9'],
    themeAxis: 'STEM',
    themeName: 'Karst Geological Formations & UNESCO Inscriptions',
    integratedSubjects: 'Science, Humanities, English, Art',
    primarySubjectName: 'Science',
    educationalContent: 'Phân tích địa chất học karst và sự hình thành hang động; khảo sát hệ thống bia ma nhai di sản tư liệu ký ức thế giới.',
    learningOutcomes: 'Xây dựng website/cẩm nang số song ngữ bảo tồn danh thắng Ngũ Hành Sơn theo chuẩn quốc tế.',
    timeFrame: 'Tháng 1/2027',
    semester: 2,
    expectedLocation: 'Danh thắng Ngũ Hành Sơn, Đà Nẵng',
    deliverables: 'Digital Field Guide and Bilingual Geological Research Report.',
    organizationFormat: 'Nghiên cứu thực địa khoa học và văn hóa',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Marble Mountains',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Karst Geology & Cave Science Report', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'UNESCO Ma Nhai Epigraphy Analysis', weight: 30, maxScore: 10 },
        { id: 'crit_3', name: 'English Digital Guidebook Publication', weight: 35, maxScore: 10 }
      ]
    }
  },

  // =========================================================================
  // PHỤ LỤC 7: THPT HỆ COMPASS/INT (2 hoạt động - CS3)
  // =========================================================================
  {
    appendixNumber: 7,
    appendixTitle: 'THPT Hệ COMPASS/INT',
    code: 'HDNK-THPTQT-01',
    name: 'Trải nghiệm điện ảnh tiếng Anh tại Metiz Cinema (Khối 10, 11, 12 CS3)',
    educationLevel: 'THPT',
    programType: 'SONG_NGU',
    sheetCode: 'THPT_QT',
    grades: ['10', '11', '12'],
    themeAxis: 'NGON_NGU',
    themeName: 'International Cinema & Global Contemporary Issues',
    integratedSubjects: 'English, Media Studies, Philosophy',
    primarySubjectName: 'English',
    educationalContent: 'Phân tích điện ảnh toàn cầu, khám phá tư tưởng triết học và các chủ đề công dân toàn cầu qua lăng kính nghệ thuật thứ bảy.',
    learningOutcomes: 'Học sinh viết bài luận phản biện (Critical Film Essay); thuyết trình video dạng TED-Ed chia sẻ góc nhìn văn hóa.',
    timeFrame: 'Tháng 10/2026',
    semester: 1,
    expectedLocation: 'Rạp chiếu phim Metiz Cinema Đà Nẵng',
    deliverables: 'Academic Film Critique Essay and TED-style video presentation.',
    organizationFormat: 'Trải nghiệm văn hóa điện ảnh',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric International Cinema',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Philosophical & Societal Depth of Analysis', weight: 40, maxScore: 10 },
        { id: 'crit_2', name: 'Advanced English Writing (IELTS/SAT/AP Standard)', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Video Discourse & Rhetorical Skills', weight: 25, maxScore: 10 }
      ]
    }
  },
  {
    appendixNumber: 7,
    appendixTitle: 'THPT Hệ COMPASS/INT',
    code: 'HDNK-THPTQT-02',
    name: 'Ký ức Cố Đô – Đại Nội Huế: Royal Heritage & Imperial Diplomacy (Khối 10, 11, 12 CS3)',
    educationLevel: 'THPT',
    programType: 'SONG_NGU',
    sheetCode: 'THPT_QT',
    grades: ['10', '11', '12'],
    themeAxis: 'DI_SAN',
    themeName: 'Imperial Nguyen Dynasty Architecture & Global Heritage Conservation',
    integratedSubjects: 'History, Architecture, Visual Arts, English',
    primarySubjectName: 'History',
    educationalContent: 'Nghiên cứu kiến trúc Hoàng thành, phong thủy cung đình và chính sách ngoại giao triều Nguyễn với phương Tây thế kỷ 19.',
    learningOutcomes: 'Xây dựng hồ sơ di sản số (Digital Heritage Portfolio); đề xuất giải pháp ứng dụng công nghệ AR/VR quảng bá di sản Huế tới khách quốc tế.',
    timeFrame: 'Tháng 4/2027',
    semester: 2,
    expectedLocation: 'Đại Nội Huế, Thừa Thiên Huế',
    deliverables: 'Digital Heritage Portfolio & AR/VR Heritage Promotion Proposal in English.',
    organizationFormat: 'Nghiên cứu học thuật thực địa chuyên sâu',
    evaluationConfig: {
      mode: 'RUBRIC',
      modeTitle: 'Đánh giá Rubric Imperial Hue Heritage',
      hasRoleAssessment: true,
      formulaType: 'WEIGHTED',
      criteria: [
        { id: 'crit_1', name: 'Historiography & Architectural Analysis', weight: 35, maxScore: 10 },
        { id: 'crit_2', name: 'Academic English Presentation & Research Paper', weight: 35, maxScore: 10 },
        { id: 'crit_3', name: 'Digital Heritage Innovation & AR/VR Proposal', weight: 30, maxScore: 10 }
      ]
    }
  }
];

export function getMasterActivitiesBySheet(sheetCode: SheetCode): MasterActivityItem[] {
  return MASTER_ACTIVITIES_2026_2027.filter(a => a.sheetCode === sheetCode);
}

export function getMasterActivitiesByLevel(level: CatalogEducationLevel): MasterActivityItem[] {
  return MASTER_ACTIVITIES_2026_2027.filter(a => a.educationLevel === level);
}

export function getMasterActivitiesByTheme(axis: ThemeAxisCode): MasterActivityItem[] {
  return MASTER_ACTIVITIES_2026_2027.filter(a => a.themeAxis === axis);
}
