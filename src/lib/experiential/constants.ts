import { CriterionConfig, ThresholdConfig } from './types';

// 4 Mạch hoạt động chuẩn
export const ACTIVITY_STRANDS = [
  {
    id: 'BAN_THAN',
    name: 'Hướng vào bản thân',
    desc: 'Phát triển cá nhân, rèn luyện cảm xúc, tự lập, kỹ năng sống',
    icon: 'User',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotColor: 'bg-amber-500'
  },
  {
    id: 'XA_HOI',
    name: 'Hướng đến xã hội',
    desc: 'Giao tiếp, làm việc nhóm, văn hóa ứng xử, thiện nguyện, cộng đồng',
    icon: 'Users',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dotColor: 'bg-indigo-500'
  },
  {
    id: 'TU_NHIEN',
    name: 'Hướng đến tự nhiên',
    desc: 'Môi trường, sinh thái, bảo vệ thiên nhiên, STEM & khoa học thực tế',
    icon: 'Leaf',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotColor: 'bg-emerald-500'
  },
  {
    id: 'HUONG_NGHIEP',
    name: 'Hướng nghiệp',
    desc: 'Trải nghiệm nghề nghiệp, tham quan doanh nghiệp, tài chính cá nhân',
    icon: 'Compass',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dotColor: 'bg-sky-500'
  }
];

// 13 Loại hoạt động Sky-Line
export const SKYLINE_ACTIVITY_TYPES = [
  { id: 'SU_KIEN', name: 'Sự kiện / Lễ hội', code: 'SK' },
  { id: 'THAM_QUAN', name: 'Tham quan – Dã ngoại', code: 'TQ' },
  { id: 'DU_AN', name: 'Dự án học tập', code: 'DA' },
  { id: 'STEM', name: 'STEM / Trải nghiệm Khoa học', code: 'STEM' },
  { id: 'KY_NANG', name: 'Kỹ năng sống', code: 'KN' },
  { id: 'NGHE_THUAT', name: 'Nghệ thuật – Âm nhạc', code: 'NT' },
  { id: 'THE_THAO', name: 'Thể dục Thể thao', code: 'TT' },
  { id: 'THIEN_NGUYEN', name: 'Thiện nguyện – Cộng đồng', code: 'TN' },
  { id: 'HUONG_NGHIEP_TYPE', name: 'Hướng nghiệp', code: 'HN' },
  { id: 'CLB', name: 'Hoạt động Câu lạc bộ (CLB)', code: 'CLB' },
  { id: 'QUOC_TE', name: 'Hoạt động Giao lưu Quốc tế', code: 'QT' },
  { id: 'LIEN_CO_SO_TYPE', name: 'Hoạt động Liên cơ sở', code: 'LCS' },
  { id: 'KHAC', name: 'Hoạt động trải nghiệm khác', code: 'KHAC' }
];

// Quy mô hoạt động
export const ACTIVITY_SCALES = [
  { id: 'LOP', name: 'Quy mô Lớp' },
  { id: 'KHOI', name: 'Quy mô Khối' },
  { id: 'CO_SO', name: 'Quy mô Cơ sở' },
  { id: 'LIEN_CO_SO', name: 'Quy mô Liên cơ sở' },
  { id: 'TOAN_HE_THONG', name: 'Quy mô Toàn hệ thống Sky-Line' }
];

// Vai trò học sinh
export const STUDENT_ROLES = [
  { id: 'TRUONG_NHOM', name: 'Trưởng nhóm', code: 'NT' },
  { id: 'THANH_VIEN', name: 'Thành viên', code: 'TV' },
  { id: 'DIEU_PHOI', name: 'Điều phối viên', code: 'DP' },
  { id: 'THUYET_TRINH', name: 'Thuyết trình', code: 'TT' },
  { id: 'SAN_PHAM', name: 'Phụ trách sản phẩm', code: 'SP' },
  { id: 'HAU_CAN', name: 'Hậu cần', code: 'HC' },
  { id: 'DAI_DIEN', name: 'Đại diện lớp', code: 'DD' },
  { id: 'TINH_NGUYEN', name: 'Tình nguyện viên', code: 'TNV' },
  { id: 'KHAC', name: 'Khác', code: 'KHAC' }
];

// Điểm danh học sinh
export const ATTENDANCE_OPTIONS = [
  { id: 'PRESENT', name: 'Có mặt', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'EXCUSED', name: 'Vắng có phép', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'UNEXCUSED', name: 'Vắng không phép', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'NOT_ATTENDED', name: 'Không tham gia', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'EXEMPT', name: 'Miễn / Không áp dụng', badge: 'bg-purple-50 text-purple-700 border-purple-200' }
];

// Thang 4 mức chuẩn
export const EVAL_LEVELS = [
  {
    level: 1,
    name: 'Cần hỗ trợ',
    code: 'CAN_HO_TRO',
    points: 1,
    color: 'amber',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-300',
    btnActiveCls: 'bg-amber-500 text-white shadow-xs'
  },
  {
    level: 2,
    name: 'Đạt',
    code: 'DAT',
    points: 2,
    color: 'sky',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-300',
    btnActiveCls: 'bg-sky-500 text-white shadow-xs'
  },
  {
    level: 3,
    name: 'Tốt',
    code: 'TOT',
    points: 3,
    color: 'emerald',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    btnActiveCls: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    level: 4,
    name: 'Nổi bật',
    code: 'NOI_BAT',
    points: 4,
    color: 'indigo',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    btnActiveCls: 'bg-indigo-600 text-white shadow-xs'
  }
];

// Thư viện tiêu chí chuẩn (12 tiêu chí)
export const CRITERIA_LIBRARY: CriterionConfig[] = [
  {
    id: 'CRIT_CHUDONG',
    name: 'Chủ động tham gia',
    description: 'Tự giác, nhiệt tình tham gia các hoạt động ngay từ khi bắt đầu.',
    weight: 35,
    isRequired: false,
    order: 1
  },
  {
    id: 'CRIT_TRACHNHIEM',
    name: 'Trách nhiệm',
    description: 'Hoàn thành nhiệm vụ được giao đúng hạn và giữ gìn cơ sở vật chất.',
    weight: 35,
    isRequired: false,
    order: 2
  },
  {
    id: 'CRIT_HOPTAC',
    name: 'Hợp tác & Làm việc nhóm',
    description: 'Lắng nghe, chia sẻ, phối hợp nhịp nhàng và tôn trọng các thành viên.',
    weight: 30,
    isRequired: false,
    order: 3
  },
  {
    id: 'CRIT_TULAP',
    name: 'Tự lập & Tự quản',
    description: 'Tự chăm sóc bản thân, quản lý đồ dùng cá nhân và tuân thủ thời gian.',
    weight: 20,
    isRequired: false,
    order: 4
  },
  {
    id: 'CRIT_GIAOTIEP',
    name: 'Giao tiếp ứng xử',
    description: 'Lịch sự, văn minh, thể hiện sự tôn trọng với thầy cô, bạn bè và cộng đồng.',
    weight: 20,
    isRequired: false,
    order: 5
  },
  {
    id: 'CRIT_KYLUAT',
    name: 'Kỷ luật & Tuân thủ an toàn',
    description: 'Thực hiện đúng nội quy, hướng dẫn an toàn trong suốt hoạt động trải nghiệm.',
    weight: 25,
    isRequired: true,
    order: 6
  },
  {
    id: 'CRIT_NHIEMVU',
    name: 'Thực hiện nhiệm vụ',
    description: 'Nỗ lực vượt qua khó khăn để hoàn thành tốt các mục tiêu của hoạt động.',
    weight: 25,
    isRequired: false,
    order: 7
  },
  {
    id: 'CRIT_GIAIQUYET',
    name: 'Giải quyết vấn đề',
    description: 'Bình tĩnh xử lý các tình huống phát sinh một cách sáng tạo và hợp lý.',
    weight: 20,
    isRequired: false,
    order: 8
  },
  {
    id: 'CRIT_SANGTAO',
    name: 'Sáng tạo & Đổi mới',
    description: 'Đưa ra ý tưởng mới, cách làm độc đáo trong quá trình trải nghiệm.',
    weight: 20,
    isRequired: false,
    order: 9
  },
  {
    id: 'CRIT_THUYETTRINH',
    name: 'Thuyết trình & Bày tỏ ý kiến',
    description: 'Tự tin chia sẻ cảm nghĩ, báo cáo sản phẩm và kết quả trước tập thể.',
    weight: 20,
    isRequired: false,
    order: 10
  },
  {
    id: 'CRIT_LANHDAO',
    name: 'Lãnh đạo & Tổ chức',
    description: 'Có khả năng dẫn dắt, phân công công việc và động viên nhóm hoàn thành mục tiêu.',
    weight: 20,
    isRequired: false,
    order: 11
  },
  {
    id: 'CRIT_VANDUNG',
    name: 'Vận dụng kiến thức',
    description: 'Ứng dụng kiến thức đã học vào thực tế đời sống và giải quyết thử thách.',
    weight: 20,
    isRequired: false,
    order: 12
  }
];

// Bộ mặc định 1 tiêu chí
export const DEFAULT_1_CRITERION: CriterionConfig[] = [
  {
    id: 'CRIT_CHUDONG',
    name: 'Chủ động tham gia',
    description: 'Tự giác, nhiệt tình tham gia hoạt động trải nghiệm.',
    weight: 100,
    isRequired: false,
    order: 1
  }
];

// Bộ mặc định 3 tiêu chí
export const DEFAULT_3_CRITERIA: CriterionConfig[] = [
  {
    id: 'CRIT_CHUDONG',
    name: 'Chủ động tham gia',
    description: 'Tự giác, nhiệt tình tham gia các hoạt động ngay từ khi bắt đầu.',
    weight: 35,
    isRequired: false,
    order: 1
  },
  {
    id: 'CRIT_TRACHNHIEM',
    name: 'Trách nhiệm',
    description: 'Hoàn thành nhiệm vụ được giao đúng hạn và giữ gìn cơ sở vật chất.',
    weight: 35,
    isRequired: false,
    order: 2
  },
  {
    id: 'CRIT_HOPTAC',
    name: 'Hợp tác & Làm việc nhóm',
    description: 'Lắng nghe, chia sẻ, phối hợp nhịp nhàng và tôn trọng các thành viên.',
    weight: 30,
    isRequired: false,
    order: 3
  }
];

// Bộ mặc định 5 tiêu chí
export const DEFAULT_5_CRITERIA: CriterionConfig[] = [
  {
    id: 'CRIT_CHUDONG',
    name: 'Chủ động tham gia',
    description: 'Tự giác, nhiệt tình tham gia các hoạt động ngay từ khi bắt đầu.',
    weight: 20,
    isRequired: false,
    order: 1
  },
  {
    id: 'CRIT_TRACHNHIEM',
    name: 'Trách nhiệm',
    description: 'Hoàn thành nhiệm vụ được giao đúng hạn và giữ gìn cơ sở vật chất.',
    weight: 20,
    isRequired: false,
    order: 2
  },
  {
    id: 'CRIT_HOPTAC',
    name: 'Hợp tác & Làm việc nhóm',
    description: 'Lắng nghe, chia sẻ, phối hợp nhịp nhàng và tôn trọng các thành viên.',
    weight: 20,
    isRequired: false,
    order: 3
  },
  {
    id: 'CRIT_NHIEMVU',
    name: 'Thực hiện nhiệm vụ',
    description: 'Nỗ lực vượt qua khó khăn để hoàn thành tốt các mục tiêu của hoạt động.',
    weight: 20,
    isRequired: false,
    order: 4
  },
  {
    id: 'CRIT_VANDUNG',
    name: 'Vận dụng / Sáng tạo',
    description: 'Ứng dụng kiến thức đã học vào thực tế và đưa ra ý tưởng giải quyết mới.',
    weight: 20,
    isRequired: false,
    order: 5
  }
];

// Ngưỡng mặc định
export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  outstanding: 85,
  good: 70,
  pass: 50
};

// Nhận xét nhanh dùng chung (Quick Remarks)
export const QUICK_REMARKS = [
  'Tích cực, chủ động tham gia hoạt động.',
  'Có tinh thần trách nhiệm cao trong công việc.',
  'Hợp tác tốt với các thành viên trong nhóm.',
  'Chủ động thực hiện và hoàn thành xuất sắc nhiệm vụ.',
  'Có khả năng lãnh đạo và điều phối nhóm tốt.',
  'Thể hiện sự sáng tạo và tư duy giải quyết vấn đề linh hoạt.',
  'Cần rèn luyện tính chủ động và tập trung hơn.',
  'Cần tăng cường khả năng hợp tác và lắng nghe ý kiến.'
];

// Ngân hàng nhận xét chuyên sâu theo 4 Mạch hoạt động
export const STRAND_QUICK_REMARKS: Record<string, string[]> = {
  BAN_THAN: [
    'Tự giác, chủ động thực hiện nhiệm vụ cá nhân.',
    'Thể hiện sự tự tin và tư duy độc lập.',
    'Biết lắng nghe góp ý và điều chỉnh cảm xúc tốt.',
    'Quản lý thời gian và đồ dùng cá nhân ngăn nắp.',
    'Cần rèn luyện thêm tính kiên trì khi gặp bài toán khó.'
  ],
  XA_HOI: [
    'Tinh thần đồng đội cao, hòa đồng và thân thiện.',
    'Có năng khiếu điều phối và dẫn dắt nhóm hiệu quả.',
    'Tích cực lắng nghe và tôn trọng ý kiến khác biệt.',
    'Sẵn sàng hỗ trợ bạn bè trong các phần việc chung.',
    'Cần chủ động giao tiếp và tương tác nhiều hơn.'
  ],
  TU_NHIEN: [
    'Say mê tìm tòi, quan sát thiên nhiên nhạy bén.',
    'Có ý thức bảo vệ môi trường và giữ gìn cảnh quan.',
    'Kỹ năng thực hành, thí nghiệm khoa học khéo léo.',
    'Tư duy logic tốt, giải quyết vấn đề sáng tạo.',
    'Cần chú ý hơn đến quy tắc an toàn khi thực hành.'
  ],
  HUONG_NGHIEP: [
    'Hào hứng tìm hiểu và đặt câu hỏi sâu về ngành nghề.',
    'Có nhận thức thực tế tốt về yêu cầu công việc.',
    'Thể hiện tác phong nghiêm túc, chuyên nghiệp.',
    'Xác định rõ điểm mạnh của bản thân và mục tiêu phấn đấu.',
    'Cần tìm hiểu thêm về kỹ năng lập kế hoạch tài chính.'
  ]
};

// Thư viện Kế hoạch Sự kiện Mẫu (Activity Presets 1-Click)
export interface ActivityPreset {
  id: string;
  name: string;
  tag: string;
  strand: 'BAN_THAN' | 'XA_HOI' | 'TU_NHIEN' | 'HUONG_NGHIEP';
  activityTypeId: string;
  scale: string;
  description: string;
  objectives: string;
  evalMode: 'CRITERIA' | 'PARTICIPATION_ONLY';
  formulaType: 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT';
  criteria: CriterionConfig[];
  thresholds: ThresholdConfig;
}

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    id: 'PRESET_TET',
    name: 'Hội chợ Xuân - Tết Dân gian & Nét đẹp Văn hóa Việt',
    tag: 'Sự kiện Văn hóa / Lễ hội',
    strand: 'XA_HOI',
    activityTypeId: 'SU_KIEN',
    scale: 'CO_SO',
    description: 'Hoạt động trải nghiệm không gian văn hóa Tết cổ truyền, giao lưu ẩm thực truyền thống, trò chơi dân gian và gây quỹ từ thiện.',
    objectives: 'Bồi dưỡng tình yêu quê hương đất nước, nâng cao kỹ năng giao tiếp ứng xử văn minh và tinh thần chia sẻ vì cộng đồng.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_CHUDONG', name: 'Chủ động tham gia', description: 'Nhiệt tình tham gia chuẩn bị gian hàng và các hoạt động văn hóa Tết.', weight: 25, isRequired: false, order: 1 },
      { id: 'CRIT_HOPTAC', name: 'Hợp tác & Làm việc nhóm', description: 'Phối hợp nhịp nhàng với bạn bè trong trang trí và điều hành gian hàng.', weight: 25, isRequired: false, order: 2 },
      { id: 'CRIT_GIAOTIEP', name: 'Giao tiếp ứng xử văn minh', description: 'Lịch sự, hiếu khách, ứng xử đúng chuẩn mực với thầy cô, phụ huynh và bạn bè.', weight: 25, isRequired: false, order: 3 },
      { id: 'CRIT_KYLUAT', name: 'Kỷ luật & Giữ gìn vệ sinh', description: 'Tuân thủ nội quy an toàn, giữ gìn vệ sinh chung của gian hàng và sân trường.', weight: 25, isRequired: true, order: 4 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  },
  {
    id: 'PRESET_STEM',
    name: 'Ngày hội STEM & Sáng tạo Công nghệ Tương lai',
    tag: 'Khoa học / STEM',
    strand: 'TU_NHIEN',
    activityTypeId: 'STEM',
    scale: 'KHOI',
    description: 'Thiết kế, chế tạo mô hình khoa học, lập trình robot và trưng bày các sản phẩm sáng tạo giải quyết bài toán môi trường.',
    objectives: 'Phát triển tư duy logic, năng lực giải quyết vấn đề thực tế, khả năng nghiên cứu khoa học và ứng dụng công nghệ.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_VANDUNG', name: 'Vận dụng kiến thức khoa học', description: 'Ứng dụng kiến thức liên môn (Toán, Lý, Hóa, Tin) vào chế tạo sản phẩm.', weight: 25, isRequired: false, order: 1 },
      { id: 'CRIT_SANGTAO', name: 'Sáng tạo & Đổi mới', description: 'Ý tưởng độc đáo, giải pháp kỹ thuật có tính đột phá và thẩm mỹ.', weight: 25, isRequired: false, order: 2 },
      { id: 'CRIT_GIAIQUYET', name: 'Giải quyết vấn đề', description: 'Thử nghiệm, tinh chỉnh và khắc phục lỗi sản phẩm một cách kiên trì.', weight: 25, isRequired: false, order: 3 },
      { id: 'CRIT_THUYETTRINH', name: 'Thuyết trình sản phẩm', description: 'Tự tin trình bày nguyên lý hoạt động và trả lời phản biện của ban giám khảo.', weight: 25, isRequired: false, order: 4 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  },
  {
    id: 'PRESET_DANGOAI',
    name: 'Dã ngoại Trải nghiệm Sinh thái & Rèn luyện Kỹ năng Sống',
    tag: 'Dã ngoại / Sinh thái',
    strand: 'TU_NHIEN',
    activityTypeId: 'THAM_QUAN',
    scale: 'KHOI',
    description: 'Chuyến tham quan học tập thực địa tại khu bảo tồn sinh thái, tìm hiểu đa dạng sinh học và rèn luyện kỹ năng sinh tồn, tự lập.',
    objectives: 'Nâng cao ý thức bảo vệ môi trường tự nhiên, rèn luyện kỹ năng sinh tồn cơ bản, tính tự lập và kỷ luật an toàn tập thể.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_TULAP', name: 'Tự lập & Tự quản', description: 'Tự chăm sóc bản thân, quản lý quân tư trang và tuân thủ đúng giờ giấc.', weight: 25, isRequired: false, order: 1 },
      { id: 'CRIT_KYLUAT', name: 'Kỷ luật & An toàn dã ngoại', description: 'Tuyệt đối tuân thủ chỉ dẫn của giáo viên và hướng dẫn viên, không rời đoàn.', weight: 25, isRequired: true, order: 2 },
      { id: 'CRIT_HOPTAC', name: 'Hợp tác & Tinh thần đồng đội', description: 'Hỗ trợ bạn bè trong các chặng thử thách và hoạt động nhóm thực địa.', weight: 25, isRequired: false, order: 3 },
      { id: 'CRIT_NHIEMVU', name: 'Thu hoạch kiến thức tự nhiên', description: 'Tích cực quan sát, ghi chép và hoàn thành phiếu học tập dã ngoại.', weight: 25, isRequired: false, order: 4 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  },
  {
    id: 'PRESET_HUONGNGHIEP',
    name: 'Hành trình Hướng nghiệp: Khám phá Thế giới Doanh nghiệp',
    tag: 'Hướng nghiệp / Thực tế',
    strand: 'HUONG_NGHIEP',
    activityTypeId: 'HUONG_NGHIEP_TYPE',
    scale: 'KHOI',
    description: 'Tham quan thực tế tại các doanh nghiệp/nhà máy, giao lưu cùng chuyên gia và trải nghiệm các vai trò công việc thực tế.',
    objectives: 'Hình thành nhận thức nghề nghiệp sớm, hiểu rõ yêu cầu thị trường lao động và nuôi dưỡng định hướng nghề nghiệp tương lai.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_CHUDONG', name: 'Chủ động tìm hiểu & Đặt câu hỏi', description: 'Tích cực tương tác, đặt câu hỏi chuyên sâu với chuyên gia doanh nghiệp.', weight: 25, isRequired: false, order: 1 },
      { id: 'CRIT_GIAOTIEP', name: 'Tác phong chuyên nghiệp', description: 'Trang phục chỉnh tề, thái độ lắng nghe cầu thị và ghi chép nghiêm túc.', weight: 25, isRequired: false, order: 2 },
      { id: 'CRIT_NHIEMVU', name: 'Thu hoạch hồ sơ nghề nghiệp', description: 'Hoàn thành bài phân tích ngành nghề và định vị bản thân sau chuyến đi.', weight: 25, isRequired: false, order: 3 },
      { id: 'CRIT_VANDUNG', name: 'Kế hoạch phát triển cá nhân', description: 'Đề ra mục tiêu học tập và rèn luyện kỹ năng phù hợp với nghề quan tâm.', weight: 25, isRequired: false, order: 4 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  },
  {
    id: 'PRESET_DOCSACH',
    name: 'Ngày hội Văn hóa Đọc - Mỗi Cuốn sách Một Bài học',
    tag: 'Phát triển Bản thân',
    strand: 'BAN_THAN',
    activityTypeId: 'KY_NANG',
    scale: 'CO_SO',
    description: 'Giới thiệu sách yêu thích, thi kể chuyện theo sách, quyên góp sách cho tủ sách lớp học và lan tỏa văn hóa đọc.',
    objectives: 'Bồi dưỡng tình yêu sách, phát triển năng lực ngôn ngữ, tư duy phản biện và khả năng biểu đạt cảm xúc.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_CHUDONG', name: 'Chủ động đọc & Chia sẻ', description: 'Tự giác tham gia đọc sách và tích cực chuẩn bị bài giới thiệu sách.', weight: 30, isRequired: false, order: 1 },
      { id: 'CRIT_THUYETTRINH', name: 'Biểu đạt & Thuyết trình', description: 'Truyền cảm, tự tin truyền tải thông điệp ý nghĩa của cuốn sách.', weight: 40, isRequired: false, order: 2 },
      { id: 'CRIT_SANGTAO', name: 'Sáng tạo sản phẩm đọc', description: 'Làm poster tóm tắt, sơ đồ tư duy hoặc vẽ bìa sách độc đáo.', weight: 30, isRequired: false, order: 3 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  },
  {
    id: 'PRESET_THIENNGUYEN',
    name: 'Chiến dịch Thiện nguyện "Vòng tay Yêu thương - Chia sẻ Hơi ấm"',
    tag: 'Cộng đồng / Thiện nguyện',
    strand: 'XA_HOI',
    activityTypeId: 'THIEN_NGUYEN',
    scale: 'TOAN_HE_THONG',
    description: 'Quyên góp sách vở, đồ dùng học tập, tổ chức thăm hỏi và giao lưu cùng các bạn học sinh có hoàn cảnh khó khăn.',
    objectives: 'Nuôi dưỡng lòng trắc ẩn, thấu cảm, tinh thần sẻ chia và trách nhiệm với cộng đồng xã hội.',
    evalMode: 'CRITERIA',
    formulaType: 'EQUAL_WEIGHT',
    criteria: [
      { id: 'CRIT_TRACHNHIEM', name: 'Trách nhiệm & Tự giác', description: 'Tích cực tham gia gom góp, phân loại và đóng gói quà tặng cẩn thận.', weight: 35, isRequired: false, order: 1 },
      { id: 'CRIT_GIAOTIEP', name: 'Thân thiện & Tôn trọng', description: 'Giao tiếp ấm áp, hòa đồng, thể hiện sự đồng cảm sâu sắc.', weight: 35, isRequired: false, order: 2 },
      { id: 'CRIT_KYLUAT', name: 'Kỷ luật & Tác phong', description: 'Tuân thủ tuyệt đối quy định an toàn và hướng dẫn của đoàn thiện nguyện.', weight: 30, isRequired: true, order: 3 }
    ],
    thresholds: { outstanding: 85, good: 70, pass: 50 }
  }
];
