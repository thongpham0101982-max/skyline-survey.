import {
  NameplateColorPalette,
  NameplateColorThemeId,
  NameplatePrintConfig,
  NameplateTemplateDefinition,
  NameplateTemplateId,
} from './types';

/**
 * 06 Nhóm mẫu bảng tên theo cấp học & mẫu Linh vật Sky-Line bổ sung
 */
export const NAMEPLATE_TEMPLATES: Record<NameplateTemplateId, NameplateTemplateDefinition> = {
  MODEL_05_MASCOT: {
    id: 'MODEL_05_MASCOT',
    code: 'MAU_05',
    name: 'Mẫu 05 – Linh vật Chim Sky-Line & Khung QR (Mẫu Mới)',
    gradeRangeLabel: 'Tất cả khối lớp',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    targetGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    levelLabel: 'LIÊN CẤP',
    styleSummary: 'Linh vật Chim Sky-Line 3D ôm khung QR, 3 cột icon Lớp/Bậc học/Cơ sở & Chủ đề năm học.',
    styleDescription:
      'Thiết kế hiện đại với Linh vật Chim Sky-Line 3D vịn khung QR, khung ảnh học sinh viền đôi đính ngôi sao, 3 cột icon Lớp • Bậc học • Cơ sở, viên thuốc Chủ đề năm học lá xanh và kiến trúc trường kính Sky-Line.',
    motifs: 'Linh vật Chim Sky-Line 3D, máy bay giấy, trường kính hiện đại, lá mầm xanh',
    fontStyle: 'rounded',
    fontFamilyHeading: "'Quicksand', 'Nunito', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'MASCOT_MODERN',
  },
  MODEL_06_MASCOT_PHONE: {
    id: 'MODEL_06_MASCOT_PHONE',
    code: 'MAU_06',
    name: 'Mẫu 06 – Linh vật Sky-Line cầm Điện thoại Quét QR (Tương tác Số)',
    gradeRangeLabel: 'Tất cả khối lớp',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    targetGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    levelLabel: 'LIÊN CẤP',
    styleSummary: 'Linh vật Chim Sky-Line 3D cầm smartphone hiển thị QR kèm khung QR hồ sơ học tập.',
    styleDescription:
      'Biến thể sinh động với Linh vật Chim Sky-Line 3D mặc áo Polo xanh cầm điện thoại hướng dẫn Phụ huynh quét mã QR xem Hồ sơ học tập trên SSM.',
    motifs: 'Linh vật Chim Sky-Line cầm Smartphone QR, trường học hiện đại',
    fontStyle: 'rounded',
    fontFamilyHeading: "'Quicksand', 'Nunito', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'MASCOT_PHONE',
  },
  MODEL_01_G1: {
    id: 'MODEL_01_G1',
    code: 'MAU_01',
    name: 'Mẫu 01 – Khối 1 (Tiểu học Đầu cấp)',
    gradeRangeLabel: 'Khối 1',
    grades: [1],
    targetGrades: [1],
    levelLabel: 'TIỂU HỌC',
    styleSummary: 'Phong cách vui tươi, gần gũi, font tròn dễ đọc.',
    styleDescription:
      'Phong cách vui tươi, gần gũi. Minh họa học sinh nhỏ tuổi, font chữ tròn dễ đọc, họa tiết mây, ngôi sao, máy bay giấy và cây xanh.',
    motifs: 'Mây trắng, ngôi sao, máy bay giấy, cây xanh',
    fontStyle: 'rounded',
    fontFamilyHeading: "'Quicksand', 'Nunito', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'PLAYFUL_CLOUDS',
  },
  MODEL_02_G2_5: {
    id: 'MODEL_02_G2_5',
    code: 'MAU_02',
    name: 'Mẫu 02 – Khối 2 đến Khối 5 (Tiểu học)',
    gradeRangeLabel: 'Khối 2 – 5',
    grades: [2, 3, 4, 5],
    targetGrades: [2, 3, 4, 5],
    levelLabel: 'TIỂU HỌC',
    styleSummary: 'Phong cách năng động, sáng tạo, chuẩn thiết kế mẫu.',
    styleDescription:
      'Phong cách năng động, sáng tạo. Minh họa học sinh đúng lứa tuổi, họa tiết sách, máy bay giấy, quả địa cầu và biểu tượng học tập.',
    motifs: 'Sách, máy bay giấy, cánh chim Sky-Line, trường học',
    fontStyle: 'dynamic',
    fontFamilyHeading: "'Quicksand', 'Nunito', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'CREATIVE_PLANES',
  },
  MODEL_03_G6_9: {
    id: 'MODEL_03_G6_9',
    code: 'MAU_03',
    name: 'Mẫu 03 – Khối 6 đến Khối 9 (THCS)',
    gradeRangeLabel: 'Khối 6 – 9',
    grades: [6, 7, 8, 9],
    targetGrades: [6, 7, 8, 9],
    levelLabel: 'THCS',
    styleSummary: 'Phong cách hiện đại, trẻ trung, bố cục rõ ràng.',
    styleDescription:
      'Phong cách hiện đại, trẻ trung. Hạn chế họa tiết trẻ em, ưu tiên bố cục rõ ràng, chuyên nghiệp.',
    motifs: 'Sóng lượn hiện đại, máy bay giấy, kiến trúc trường',
    fontStyle: 'modern',
    fontFamilyHeading: "'Quicksand', 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'MODERN_GEOMETRIC',
  },
  MODEL_04_G10_12: {
    id: 'MODEL_04_G10_12',
    code: 'MAU_04',
    name: 'Mẫu 04 – Khối 10 đến Khối 12 (THPT)',
    gradeRangeLabel: 'Khối 10 – 12',
    grades: [10, 11, 12],
    targetGrades: [10, 11, 12],
    levelLabel: 'THPT',
    styleSummary: 'Phong cách tối giản, trưởng thành, thanh lịch.',
    styleDescription:
      'Phong cách tối giản, trưởng thành, thiết kế thanh lịch. Nhấn mạnh họ tên học sinh và hệ thống nhận diện Sky-Line.',
    motifs: 'Nhận diện thương hiệu Sky-Line thanh lịch',
    fontStyle: 'minimal',
    fontFamilyHeading: "'Quicksand', 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif",
    fontWeightHeading: 800,
    headerTaglineTop: 'GLOBAL MINDSET',
    headerTaglineBottom: 'BRIGHTER FUTURE',
    topRightSloganLine1: 'GLOBAL MINDSET',
    topRightSloganLine2: 'BRIGHTER FUTURE',
    backRightSlogan: ['LEARN', 'GROW', 'SHINE', 'TOGETHER'],
    decorativeStyle: 'MINIMAL_ELEGANT',
  },
};

export const NAMEPLATE_TEMPLATE_LIST: NameplateTemplateDefinition[] = [
  NAMEPLATE_TEMPLATES.MODEL_05_MASCOT,
  NAMEPLATE_TEMPLATES.MODEL_06_MASCOT_PHONE,
  NAMEPLATE_TEMPLATES.MODEL_01_G1,
  NAMEPLATE_TEMPLATES.MODEL_02_G2_5,
  NAMEPLATE_TEMPLATES.MODEL_03_G6_9,
  NAMEPLATE_TEMPLATES.MODEL_04_G10_12,
];

/**
 * Hệ thống Bảng màu chuẩn theo Hệ đào tạo & Cơ sở trên SSM
 */
export const NAMEPLATE_COLOR_THEMES: Record<NameplateColorThemeId, NameplateColorPalette> = {
  GLOBAL_PURPLE: {
    id: 'GLOBAL_PURPLE',
    name: 'Hệ Global – Tím Chủ Đạo (Mẫu Global)',
    systemLabel: 'Hệ Global / Quốc tế',
    primaryDark: '#35186B',
    primaryMain: '#5B21B6',
    primaryAccent: '#7C3AED',
    secondaryLight: '#DDD6FE',
    surfaceTint: '#F5F3FF',
    badgeBg: '#EDE9FE',
    badgeBorder: '#DDD6FE',
    badgeText: '#431682',
    nameColor: '#35186B',
    subtitleColor: '#3B1E77',
    starColor: '#FBBF24',
    qrDarkColor: '#1E1040',
    gradientFront:
      'linear-gradient(115deg, #EAE4FC 0%, #F7F5FF 36%, #FFFFFF 60%, #EDE7FE 85%, #C4B5FD 100%)',
    gradientBack:
      'linear-gradient(115deg, #E8E1FC 0%, #F8F6FF 40%, #FFFFFF 65%, #E9E2FD 88%, #BFAEFB 100%)',
    wavePrimary: '#6D28D9',
    waveSecondary: '#A78BFA',
  },
  SKYLINE_TEAL: {
    id: 'SKYLINE_TEAL',
    name: 'Hệ Chất lượng cao / Hội nhập – Xanh Sky-Line (Mẫu Chuẩn)',
    systemLabel: 'Hệ Hội nhập / CLC',
    primaryDark: '#0A3663',
    primaryMain: '#0E869E',
    primaryAccent: '#18A5B8',
    secondaryLight: '#D5F1F6',
    surfaceTint: '#F2FAFC',
    badgeBg: '#DFF3F7',
    badgeBorder: '#C6EAF1',
    badgeText: '#0D778E',
    nameColor: '#0A3663',
    subtitleColor: '#1C4966',
    starColor: '#F59E0B',
    qrDarkColor: '#111827',
    gradientFront:
      'linear-gradient(115deg, #DCF3F8 0%, #F4FBFE 38%, #FFFFFF 62%, #E5F6FA 85%, #9ADCE8 100%)',
    gradientBack:
      'linear-gradient(115deg, #DCF3F8 0%, #F5FCFE 42%, #FFFFFF 66%, #E2F5F9 88%, #7CCCE0 100%)',
    wavePrimary: '#0E869E',
    waveSecondary: '#56C2D6',
  },
  CENTRAL_INDIGO: {
    id: 'CENTRAL_INDIGO',
    name: 'Hệ Song bằng / Central – Xanh Lam Chàm',
    systemLabel: 'Hệ Song bằng / CS2',
    primaryDark: '#1E1B4B',
    primaryMain: '#1D4ED8',
    primaryAccent: '#3B82F6',
    secondaryLight: '#DBEAFE',
    surfaceTint: '#EFF6FF',
    badgeBg: '#E0E7FF',
    badgeBorder: '#C7D2FE',
    badgeText: '#1E3A8A',
    nameColor: '#172554',
    subtitleColor: '#1E3A8A',
    starColor: '#FBBF24',
    qrDarkColor: '#172554',
    gradientFront:
      'linear-gradient(115deg, #E0E9FF 0%, #F5F8FF 38%, #FFFFFF 62%, #E8F0FE 85%, #BFDBFE 100%)',
    gradientBack:
      'linear-gradient(115deg, #E0E9FF 0%, #F7FAFF 42%, #FFFFFF 66%, #E5EDFF 88%, #93C5FD 100%)',
    wavePrimary: '#1D4ED8',
    waveSecondary: '#60A5FA',
  },
  HILL_GOLD: {
    id: 'HILL_GOLD',
    name: 'Sky-Line Hill – Xanh Sky-Line (CS4)',
    systemLabel: 'Sky-Line Hill (CS4)',
    primaryDark: '#0A3663',
    primaryMain: '#0E869E',
    primaryAccent: '#18A5B8',
    secondaryLight: '#D5F1F6',
    surfaceTint: '#F2FAFC',
    badgeBg: '#DFF3F7',
    badgeBorder: '#C6EAF1',
    badgeText: '#0D778E',
    nameColor: '#0A3663',
    subtitleColor: '#1C4966',
    starColor: '#F59E0B',
    qrDarkColor: '#111827',
    gradientFront:
      'linear-gradient(115deg, #DCF3F8 0%, #F4FBFE 38%, #FFFFFF 62%, #E5F6FA 85%, #9ADCE8 100%)',
    gradientBack:
      'linear-gradient(115deg, #DCF3F8 0%, #F5FCFE 42%, #FFFFFF 66%, #E2F5F9 88%, #7CCCE0 100%)',
    wavePrimary: '#0E869E',
    waveSecondary: '#56C2D6',
  },
  BEACH_BLUE: {
    id: 'BEACH_BLUE',
    name: 'Sky-Line Beach – Xanh Đại Dương (CS5)',
    systemLabel: 'Sky-Line Beach (CS5)',
    primaryDark: '#0A3663',
    primaryMain: '#0284C7',
    primaryAccent: '#0EA5E9',
    secondaryLight: '#E0F2FE',
    surfaceTint: '#F0F9FF',
    badgeBg: '#E0F2FE',
    badgeBorder: '#BAE6FD',
    badgeText: '#0369A1',
    nameColor: '#0A3663',
    subtitleColor: '#0369A1',
    starColor: '#FBBF24',
    qrDarkColor: '#0C4A6E',
    gradientFront:
      'linear-gradient(115deg, #DFF2FE 0%, #F5FBFF 38%, #FFFFFF 62%, #E6F5FE 85%, #BAE6FD 100%)',
    gradientBack:
      'linear-gradient(115deg, #DFF2FE 0%, #F5FBFF 42%, #FFFFFF 66%, #E1F3FE 88%, #7DD3FC 100%)',
    wavePrimary: '#0369A1',
    waveSecondary: '#38BDF8',
  },
};

export const NAMEPLATE_COLOR_THEME_LIST: NameplateColorPalette[] = [
  NAMEPLATE_COLOR_THEMES.SKYLINE_TEAL,
  NAMEPLATE_COLOR_THEMES.GLOBAL_PURPLE,
  NAMEPLATE_COLOR_THEMES.CENTRAL_INDIGO,
  NAMEPLATE_COLOR_THEMES.HILL_GOLD,
  NAMEPLATE_COLOR_THEMES.BEACH_BLUE,
];

export const DEFAULT_NAMEPLATE_CONFIG: NameplatePrintConfig = {
  templateId: 'MODEL_05_MASCOT',
  colorThemeId: 'SKYLINE_TEAL',
  illustrationMode: 'STUDENT_PHOTO',
  showCutLines: true,
  showFoldLine: true,
  rotateBackSide180: true,
  ecoInkMode: false,
  qrCaption: 'Xem hồ sơ học sinh',
  backTitle: 'Cảm ơn Quý phụ huynh',
  backSubtitle: 'đã đến tham dự buổi họp',
  backMotto: 'Vững Nội lực – Hướng tương lai',
};

export function isMascotTemplate(templateId?: NameplateTemplateId | string | null): boolean {
  return templateId === 'MODEL_05_MASCOT' || templateId === 'MODEL_06_MASCOT_PHONE';
}

export function extractGradeNumber(gradeOrClassName?: string | null): number {
  if (!gradeOrClassName) return 4;
  const s = String(gradeOrClassName).trim();
  const match = s.match(/(?:khối|lớp|k|g)?\s*(1[0-2]|[1-9])(?:\b|[^0-9])/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 12) return num;
  }
  return 4;
}

export function resolveTemplateByGrade(gradeOrClassName?: string | null): NameplateTemplateId {
  const grade = extractGradeNumber(gradeOrClassName);
  if (grade === 1) return 'MODEL_01_G1';
  if (grade >= 2 && grade <= 5) return 'MODEL_02_G2_5';
  if (grade >= 6 && grade <= 9) return 'MODEL_03_G6_9';
  return 'MODEL_04_G10_12';
}

export function resolveColorThemeBySystemAndCampus(
  educationSystem?: string | null,
  campusCodeOrName?: string | null,
  className?: string | null
): NameplateColorThemeId {
  const sys = String(educationSystem || '').toLowerCase().trim();
  const camp = String(campusCodeOrName || '').toLowerCase().trim();
  const cls = String(className || '').toLowerCase().trim();

  if (
    sys.includes('global') ||
    sys.includes('quốc tế') ||
    sys.includes('quoc te') ||
    sys.includes('hng') ||
    sys.includes('cambridge') ||
    sys.includes('gac') ||
    sys.includes('int') ||
    camp.includes('cs3') ||
    camp.includes('global') ||
    /\d+g\b/i.test(cls) ||
    cls.includes('global') ||
    cls.includes('int') ||
    cls.includes('cs3')
  ) {
    return 'GLOBAL_PURPLE';
  }

  if (
    sys.includes('sb') ||
    sys.includes('song bằng') ||
    sys.includes('song bang') ||
    camp.includes('cs2') ||
    camp.includes('central')
  ) {
    return 'CENTRAL_INDIGO';
  }

  if (camp.includes('cs4') || camp.includes('hill') || camp.includes('hội an') || camp.includes('hoi an')) {
    return 'HILL_GOLD';
  }

  if (camp.includes('cs5') || camp.includes('beach')) {
    return 'BEACH_BLUE';
  }

  return 'SKYLINE_TEAL';
}

export function resolveLevelDisplayLabel(level?: string | null, gradeOrClassName?: string | null): string {
  const grade = extractGradeNumber(gradeOrClassName);
  if (grade >= 1 && grade <= 5) return 'TIỂU HỌC';
  if (grade >= 6 && grade <= 9) return 'THCS';
  if (grade >= 10 && grade <= 12) return 'THPT';

  const raw = String(level || '').toUpperCase();
  if (raw.includes('TIEU') || raw.includes('TIỂU') || raw.includes('PRIMARY')) return 'TIỂU HỌC';
  if (raw.includes('THCS') || raw.includes('SECONDARY') || raw.includes('MIDDLE')) return 'THCS';
  if (raw.includes('THPT') || raw.includes('HIGH')) return 'THPT';
  return 'TIỂU HỌC';
}

export function formatCleanClassName(rawClassName?: string | null): string {
  if (!rawClassName) return '4S';
  return String(rawClassName)
    .trim()
    .replace(/^lớp\s+/i, '')
    .replace(/[_-]\s*cs\d+$/i, '')
    .trim()
    .toUpperCase();
}

export function getAdaptiveStudentNameStyle(
  studentName: string,
  templateId: NameplateTemplateId
): {
  fontSizeMm: number;
  lineHeight: number;
  letterSpacing: string;
  fontWeight: number;
  allowWrap: boolean;
} {
  const clean = (studentName || '').trim();
  const len = clean.length;

  let baseMm = 9.0;
  if (templateId === 'MODEL_01_G1') baseMm = 9.2;
  if (templateId === 'MODEL_05_MASCOT' || templateId === 'MODEL_06_MASCOT_PHONE') baseMm = 9.3;
  if (templateId === 'MODEL_04_G10_12') baseMm = 8.8;

  if (len <= 14) {
    return {
      fontSizeMm: baseMm,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      fontWeight: 800,
      allowWrap: false,
    };
  }
  if (len <= 18) {
    return {
      fontSizeMm: baseMm - 0.5,
      lineHeight: 1.2,
      letterSpacing: '-0.015em',
      fontWeight: 800,
      allowWrap: false,
    };
  }
  if (len <= 22) {
    return {
      fontSizeMm: baseMm - 1.4,
      lineHeight: 1.18,
      letterSpacing: '-0.02em',
      fontWeight: 800,
      allowWrap: false,
    };
  }
  if (len <= 27) {
    return {
      fontSizeMm: baseMm - 2.4,
      lineHeight: 1.16,
      letterSpacing: '-0.025em',
      fontWeight: 800,
      allowWrap: false,
    };
  }
  if (len <= 33) {
    return {
      fontSizeMm: baseMm - 3.3,
      lineHeight: 1.15,
      letterSpacing: '-0.03em',
      fontWeight: 800,
      allowWrap: false,
    };
  }
  return {
    fontSizeMm: 5.2,
    lineHeight: 1.18,
    letterSpacing: '-0.02em',
    fontWeight: 800,
    allowWrap: true,
  };
}
