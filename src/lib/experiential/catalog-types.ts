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
