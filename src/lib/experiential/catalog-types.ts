export type CatalogEducationLevel = 'MN' | 'TIEU_HOC' | 'THCS' | 'THPT';

export type ProgramType = 'HE_S' | 'SONG_NGU' | 'QUOC_TE';

export type SheetCode = 
  | 'MN' 
  | 'TH_S' 
  | 'THCS_S' 
  | 'THPT_S' 
  | 'TH_QT' 
  | 'THCS_QT' 
  | 'THPT_QT';

export type CampusDispatchStatus = 'CHUA_TIEP_NHAN' | 'DA_TIEP_NHAN' | 'DA_TRIEN_KHAI';

export type ClassEvalStatus = 'DA_TIEP_NHAN' | 'DANG_DANH_GIA' | 'DA_DANH_GIA';

export interface CampusAllocationItem {
  campusId: string;
  campusCode: string;
  campusName: string;
  tlhnTeacherId?: string;
  tlhnTeacherName?: string;
  status: CampusDispatchStatus;
  receivedAt?: string;
  deployedAt?: string;
  assignedClassesCount?: number;
  recordId?: string; // Associated ActivityRecord id if created
}

export interface CTHSTeacherAssignment {
  id: string;
  teacherCode: string;
  teacherName: string;
  email?: string;
  phone?: string;
  campusCode?: string;
  campusName?: string;
  departmentName?: string;
  position?: string;
}

export interface CriterionItem {
  id: string;
  name: string;
  weight: number; // Trọng số (%)
  maxScore: number; // Điểm tối đa (mặc định 10)
  description?: string;
}

export type EvaluationMode = 'CRITERIA' | 'PASS_FAIL' | 'SCORE_10' | 'ROLE_BASED';

export interface ActivityEvaluationConfig {
  mode: EvaluationMode;
  modeTitle?: string;
  hasRoleAssessment?: boolean; // Đánh giá vai trò học sinh
  criteria?: CriterionItem[];
  formulaType?: 'AVERAGE' | 'WEIGHTED' | 'HIGHEST' | 'PASS_ALL';
  completionBenchmark?: string; // Ví dụ: "Điểm TB >= 5.0" hoặc "Đạt tất cả tiêu chí"
  rolesList?: string[];
}

export const EDUCATION_LEVEL_OPTIONS: { value: CatalogEducationLevel; label: string; shortLabel: string }[] = [
  { value: 'MN', label: 'Mầm non', shortLabel: 'MN' },
  { value: 'TIEU_HOC', label: 'Tiểu học', shortLabel: 'TH' },
  { value: 'THCS', label: 'Trung học cơ sở', shortLabel: 'THCS' },
  { value: 'THPT', label: 'Trung học phổ thông', shortLabel: 'THPT' },
];

export const PROGRAM_TYPE_OPTIONS: { value: ProgramType; label: string; shortLabel: string }[] = [
  { value: 'HE_S', label: 'Hệ Chất lượng cao (Hệ S)', shortLabel: 'Hệ S' },
  { value: 'SONG_NGU', label: 'Hệ Song ngữ', shortLabel: 'Song ngữ' },
  { value: 'QUOC_TE', label: 'Hệ Quốc tế', shortLabel: 'Quốc tế' },
];

export type CatalogActivityCategory = 'HOAT_DONG_SU_KIEN' | 'TRAI_NGHIEM_DU_AN';

export const ACTIVITY_CATEGORY_OPTIONS: { 
  value: CatalogActivityCategory; 
  label: string; 
  shortLabel: string;
  description: string; 
  badgeCls: string;
}[] = [
  { 
    value: 'HOAT_DONG_SU_KIEN', 
    label: 'Hoạt động sự kiện', 
    shortLabel: 'Sự kiện',
    description: 'Chỉ tính vai trò tham gia của học sinh & điểm danh (không chấm điểm rubric / tiêu chí)',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200/80'
  },
  { 
    value: 'TRAI_NGHIEM_DU_AN', 
    label: 'Trải nghiệm ngoại khóa / Dự án', 
    shortLabel: 'Trải nghiệm / Dự án',
    description: 'Có thiết lập danh sách tiêu chí đánh giá (Rubric, trọng số %, thang điểm, sản phẩm học tập)',
    badgeCls: 'bg-teal-50 text-teal-800 border-teal-200/80'
  }
];

export interface ActivityCatalogMeta {
  academicYearId?: string;
  activityCategory?: CatalogActivityCategory; // 'HOAT_DONG_SU_KIEN' | 'TRAI_NGHIEM_DU_AN'
  educationLevel: CatalogEducationLevel; // Bậc học chính (tương thích ngược)
  educationLevels?: CatalogEducationLevel[]; // Chọn 1 hay nhiều bậc học: MN, TIEU_HOC, THCS, THPT
  programType: ProgramType; // Hệ học chính (tương thích ngược)
  programTypes?: ProgramType[]; // Chọn 1 hay nhiều hệ học: HE_S, SONG_NGU, QUOC_TE
  sheetCode: SheetCode;
  grades: string[]; // ["1", "2"] hoặc ["Lớp 1", "Lớp 2"] hoặc ["Mầm non"]
  themeName: string; // Chủ đề giáo dục
  integratedSubjects: string; // Các môn tích hợp
  educationalContent: string; // Nội dung giáo dục
  learningOutcomes: string; // Yêu cầu cần đạt
  organizationFormat: string; // Hình thức tổ chức (Trải nghiệm, Tham quan, Hội thi, ...)
  timeFrame: string; // Thời gian (Tháng 10, Tháng 2, ...)
  semester: number; // 1 | 2
  expectedLocation: string; // Địa điểm (dự kiến)
  partners?: string; // Đối tác / Đơn vị phối hợp
  primarySubjectId?: string; // Môn chủ trì id
  primarySubjectName: string; // Môn chủ trì
  coopSubjectIds?: string[]; // Môn phối hợp ids
  coopSubjectNames?: string; // Môn phối hợp / TCM phối hợp
  deliverables?: string; // Sản phẩm học tập / Dự án
  notes?: string; // Ghi chú
  plainDescription?: string;
  cthsTeachers?: CTHSTeacherAssignment[]; // Danh sách 1 hoặc nhiều GV thuộc Tổ CTHS phụ trách
  cthsTeacherId?: string; // GV thuộc Tổ CTHS phụ trách (GV đại diện chính / tương thích ngược)
  cthsTeacherCode?: string; // Mã GV Tổ CTHS
  cthsTeacherName?: string; // Họ tên các GV Tổ CTHS phụ trách (dạng ghép ngăn cách dấu phẩy)
  cthsTeacherEmail?: string; // Email GV Tổ CTHS
  evaluationConfig?: ActivityEvaluationConfig; // Thiết lập Cấu hình & Tiêu chí đánh giá
  allocatedCampuses?: CampusAllocationItem[];
}

export interface ActivityCatalogItem {
  id: string;
  code: string;
  name: string;
  groupId: string;
  typeId: string;
  themeId?: string | null;
  level?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  meta: ActivityCatalogMeta;
}

export const SHEET_CONFIGS: {
  code: SheetCode;
  sheetName: string;
  title: string;
  level: CatalogEducationLevel;
  programType: ProgramType;
  defaultGrades: string[];
}[] = [
  { code: 'MN', sheetName: 'MN', title: 'Mầm non', level: 'MN', programType: 'HE_S', defaultGrades: ['Mầm non'] },
  { code: 'TH_S', sheetName: 'TH S', title: 'Tiểu học (Hệ S)', level: 'TIEU_HOC', programType: 'HE_S', defaultGrades: ['1', '2', '3', '4', '5'] },
  { code: 'TH_QT', sheetName: 'TH QT', title: 'Tiểu học (Song ngữ / QT)', level: 'TIEU_HOC', programType: 'SONG_NGU', defaultGrades: ['1', '2', '3', '4', '5'] },
  { code: 'THCS_S', sheetName: 'THCS S', title: 'THCS (Hệ S)', level: 'THCS', programType: 'HE_S', defaultGrades: ['6', '7', '8', '9'] },
  { code: 'THCS_QT', sheetName: 'THCS QT', title: 'THCS (Song ngữ / QT)', level: 'THCS', programType: 'SONG_NGU', defaultGrades: ['6', '7', '8', '9'] },
  { code: 'THPT_S', sheetName: 'THPT S', title: 'THPT (Hệ S)', level: 'THPT', programType: 'HE_S', defaultGrades: ['10', '11', '12'] },
  { code: 'THPT_QT', sheetName: 'THPT QT', title: 'THPT (Song ngữ / QT)', level: 'THPT', programType: 'SONG_NGU', defaultGrades: ['10', '11', '12'] }
];

// Cấu hình Danh mục Chủ đề Giáo dục riêng
export interface EducationalThemeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  badgeCls: string;
  borderCls: string;
  tagColor: string;
  isSystem?: boolean;
}

export const DEFAULT_EDUCATIONAL_THEMES: EducationalThemeItem[] = [
  {
    id: 'theme_pham_chat',
    code: 'PHAM_CHAT_GIA_TRI_SONG',
    name: 'Phẩm chất – Giá trị sống',
    description: 'Giáo dục nhân cách, lòng biết ơn, trung thực, trách nhiệm, sự tử tế và các giá trị cốt lõi.',
    badgeCls: 'bg-rose-50 text-rose-800 border-rose-200/80',
    borderCls: 'border-rose-400',
    tagColor: '#e11d48',
    isSystem: true
  },
  {
    id: 'theme_van_hoa',
    code: 'VAN_HOA_TRUYEN_THONG',
    name: 'Văn hóa – Truyền thống',
    description: 'Tìm hiểu phong tục tập quán, lễ hội dân tộc, di sản văn hóa, lịch sử và tự hào dân tộc.',
    badgeCls: 'bg-amber-50 text-amber-900 border-amber-200/80',
    borderCls: 'border-amber-400',
    tagColor: '#d97706',
    isSystem: true
  },
  {
    id: 'theme_ky_nang_song',
    code: 'KY_NANG_SONG_XA_HOI',
    name: 'Kỹ năng sống – Xã hội',
    description: 'Kỹ năng giao tiếp, ứng xử, làm việc nhóm, quản lý cảm xúc, thích ứng và giải quyết vấn đề.',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200/80',
    borderCls: 'border-sky-400',
    tagColor: '#0284c7',
    isSystem: true
  },
  {
    id: 'theme_suc_khoe',
    code: 'SUC_KHOE_THE_CHAT',
    name: 'Sức khỏe – Thể chất',
    description: 'Rèn luyện thể thao, nâng cao thể lực, dinh dưỡng học đường và lối sống năng động khỏe mạnh.',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    borderCls: 'border-emerald-400',
    tagColor: '#059669',
    isSystem: true
  },
  {
    id: 'theme_an_toan',
    code: 'AN_TOAN_CONG_DAN',
    name: 'An toàn – Công dân',
    description: 'An toàn giao thông, an toàn không gian mạng, phòng chống bạo lực, ý thức và trách nhiệm công dân.',
    badgeCls: 'bg-orange-50 text-orange-900 border-orange-200/80',
    borderCls: 'border-orange-400',
    tagColor: '#ea580c',
    isSystem: true
  },
  {
    id: 'theme_moi_truong',
    code: 'MOI_TRUONG_BEN_VUNG',
    name: 'Môi trường – Bền vững',
    description: 'Bảo vệ thiên nhiên, ứng phó biến đổi khí hậu, phân loại rác thải, lối sống xanh và phát triển bền vững.',
    badgeCls: 'bg-teal-50 text-teal-800 border-teal-200/80',
    borderCls: 'border-teal-400',
    tagColor: '#0d9488',
    isSystem: true
  },
  {
    id: 'theme_khoa_hoc_stem',
    code: 'KHOA_HOC_STEM',
    name: 'Khoa học – STEM',
    description: 'Thực hành khoa học, công nghệ, kỹ thuật, toán học và ứng dụng công nghệ số sáng tạo.',
    badgeCls: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
    borderCls: 'border-cyan-400',
    tagColor: '#0891b2',
    isSystem: true
  },
  {
    id: 'theme_nghe_thuat',
    code: 'NGHE_THUAT_SANG_TAO',
    name: 'Nghệ thuật – Sáng tạo',
    description: 'Hội họa, âm nhạc, kịch nghệ, thủ công mỹ nghệ, cảm thụ thẩm mỹ và phát triển năng khiếu nghệ thuật.',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200/80',
    borderCls: 'border-purple-400',
    tagColor: '#9333ea',
    isSystem: true
  },
  {
    id: 'theme_hoc_tap',
    code: 'HOC_TAP_HOC_THUAT',
    name: 'Học tập – Học thuật',
    description: 'Phương pháp học tập tự chủ, tư duy phản biện, văn hóa đọc, nghiên cứu khoa học và tri thức chuyên sâu.',
    badgeCls: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    borderCls: 'border-indigo-400',
    tagColor: '#4f46e5',
    isSystem: true
  },
  {
    id: 'theme_huong_nghiep',
    code: 'HUONG_NGHIEP_TAI_CHINH',
    name: 'Hướng nghiệp – Tài chính',
    description: 'Khám phá thế giới nghề nghiệp, định hướng tương lai, kiến thức tài chính thông minh và tinh thần khởi nghiệp.',
    badgeCls: 'bg-violet-50 text-violet-800 border-violet-200/80',
    borderCls: 'border-violet-400',
    tagColor: '#7c3aed',
    isSystem: true
  },
  {
    id: 'theme_cong_dong',
    code: 'CONG_DONG_TRACH_NHIEM_XA_HOI',
    name: 'Cộng đồng – Trách nhiệm xã hội',
    description: 'Hoạt động thiện nguyện, phục vụ cộng đồng, lan tỏa yêu thương và trách nhiệm công dân đối với xã hội.',
    badgeCls: 'bg-pink-50 text-pink-800 border-pink-200/80',
    borderCls: 'border-pink-400',
    tagColor: '#db2777',
    isSystem: true
  },
  {
    id: 'theme_hoi_nhap',
    code: 'HOI_NHAP_QUOC_TE',
    name: 'Hội nhập quốc tế',
    description: 'Ngoại ngữ, giao lưu văn hóa quốc tế, phẩm chất công dân toàn cầu và năng lực hội nhập thế giới.',
    badgeCls: 'bg-blue-50 text-blue-900 border-blue-200/80',
    borderCls: 'border-blue-400',
    tagColor: '#2563eb',
    isSystem: true
  }
];

export function getEducationalThemeInfo(themeNameOrCode?: string): EducationalThemeItem | undefined {
  if (!themeNameOrCode) return undefined;
  const normalized = themeNameOrCode.trim().toLowerCase();
  
  return DEFAULT_EDUCATIONAL_THEMES.find(t => 
    t.name.toLowerCase() === normalized || 
    t.code.toLowerCase() === normalized ||
    t.name.toLowerCase().includes(normalized) ||
    normalized.includes(t.name.toLowerCase())
  );
}
