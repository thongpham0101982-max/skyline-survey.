export type NameplateTemplateId =
  | 'MODEL_01_G1'
  | 'MODEL_02_G2_5'
  | 'MODEL_03_G6_9'
  | 'MODEL_04_G10_12'
  | 'MODEL_05_MASCOT'
  | 'MODEL_06_MASCOT_PHONE';

export type NameplateColorThemeId =
  | 'GLOBAL_PURPLE'
  | 'SKYLINE_TEAL'
  | 'CENTRAL_INDIGO'
  | 'HILL_GOLD'
  | 'BEACH_BLUE';

export type CharacterIllustrationMode =
  | 'STUDENT_PHOTO'
  | 'STUDENT_PHOTO_FALLBACK'
  | 'AUTO_GENDER'
  | 'GIRL'
  | 'BOY'
  | 'CAMPUS_ONLY';

export type NameplateIllustrationMode = CharacterIllustrationMode;

export type PreviewViewMode =
  | 'FACES'
  | 'TENT_3D'
  | 'A4_SHEET'
  | 'INSPECT_SPECS';

export interface NameplatePrintConfig {
  templateId: NameplateTemplateId;
  colorThemeId: NameplateColorThemeId;
  illustrationMode: CharacterIllustrationMode;
  showCutLines: boolean;
  showFoldLine: boolean;
  rotateBackSide180: boolean;
  ecoInkMode: boolean;
  qrCaption: string;
  backTitle: string;
  backSubtitle: string;
  backMotto: string;
  academicYearName?: string;
}

export interface NameplateStudentItem {
  id: string;
  studentCode: string;
  studentName: string;
  code?: string;
  fullName?: string;
  englishName?: string | null;
  gender?: string | null;
  classId: string;
  className: string;
  grade: string;
  level: string;
  educationSystem: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  academicYearId: string;
  academicYearName: string;
  academicYearTheme?: string;
  qrStatus: 'ACTIVE' | 'DISABLED';
  qrToken?: string | null;
  verifyUrl: string;
  qrDataUrl?: string;
  hasPortalPhoto?: boolean;
  photoUrl?: string | null;
}

export interface NameplateTemplateDefinition {
  id: NameplateTemplateId;
  code: string;
  name: string;
  gradeRangeLabel: string;
  grades: number[];
  targetGrades: number[];
  levelLabel: string;
  styleSummary: string;
  styleDescription: string;
  motifs: string;
  fontStyle: 'rounded' | 'dynamic' | 'modern' | 'minimal';
  fontFamilyHeading: string;
  fontWeightHeading: number;
  headerTaglineTop: string;
  headerTaglineBottom: string;
  topRightSloganLine1: string;
  topRightSloganLine2: string;
  backRightSlogan: string[];
  decorativeStyle:
    | 'PLAYFUL_CLOUDS'
    | 'CREATIVE_PLANES'
    | 'MODERN_GEOMETRIC'
    | 'MINIMAL_ELEGANT'
    | 'MASCOT_MODERN'
    | 'MASCOT_PHONE';
}

export type NameplateTemplateMeta = NameplateTemplateDefinition;

export interface NameplateColorPalette {
  id: NameplateColorThemeId;
  name: string;
  systemLabel: string;
  primaryDark: string;
  primaryMain: string;
  primaryAccent: string;
  secondaryLight: string;
  surfaceTint: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  nameColor: string;
  subtitleColor: string;
  starColor: string;
  qrDarkColor: string;
  gradientFront: string;
  gradientBack: string;
  wavePrimary: string;
  waveSecondary: string;
}
