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

// Nhận xét nhanh (Quick Remarks)
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
