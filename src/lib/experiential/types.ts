export type ActivityStrand = 
  | 'BAN_THAN'      // Hướng vào bản thân
  | 'XA_HOI'        // Hướng đến xã hội
  | 'TU_NHIEN'      // Hướng đến tự nhiên
  | 'HUONG_NGHIEP'; // Hướng nghiệp

export type ActivityScale = 
  | 'LOP'           // Lớp
  | 'KHOI'          // Khối
  | 'CO_SO'         // Cơ sở
  | 'LIEN_CO_SO'    // Liên cơ sở
  | 'TOAN_HE_THONG';// Toàn hệ thống

export type ActivityStatus = 
  | 'DRAFT'         // Nháp
  | 'ASSIGNED'      // Đã giao
  | 'IN_PROGRESS'   // Đang đánh giá
  | 'COMPLETED'     // Hoàn thành
  | 'LOCKED';       // Đã khóa

export type EvalMode = 
  | 'PARTICIPATION_ONLY' // Chỉ ghi nhận tham gia
  | 'CRITERIA';          // Đánh giá theo tiêu chí

export type FormulaType = 
  | 'EQUAL_WEIGHT'  // Công thức A: Đồng trọng số
  | 'WEIGHTED';     // Công thức B: Theo trọng số

export type AttendanceStatus = 
  | 'PRESENT'       // Có mặt
  | 'EXCUSED'       // Vắng có phép
  | 'UNEXCUSED'     // Vắng không phép
  | 'NOT_ATTENDED'  // Không tham gia
  | 'EXEMPT';       // Miễn/Không áp dụng

export type EvalLevel = 1 | 2 | 3 | 4; // 1: Cần hỗ trợ, 2: Đạt, 3: Tốt, 4: Nổi bật

export type ResultRating = 
  | 'NOI_BAT'     // Nổi bật (>= 85%)
  | 'TOT'         // Tốt (70% - <85%)
  | 'DAT'         // Đạt (50% - <70%)
  | 'CAN_HO_TRO'  // Cần hỗ trợ (<50%)
  | 'THAM_GIA'    // Tham gia
  | 'KHONG_THAM_GIA' // Không tham gia
  | 'MIEN';       // Miễn

export interface CriterionConfig {
  id: string;
  name: string;
  description: string;
  weight: number; // 0 to 100
  isRequired: boolean; // Tiêu chí bắt buộc
  order: number;
}

export interface ThresholdConfig {
  outstanding: number; // default: 85
  good: number;        // default: 70
  pass: number;        // default: 50
}

export interface MandatoryRule {
  criterionId: string;
  criterionName?: string;
  conditionLevel: EvalLevel; // e.g., 1 (Cần hỗ trợ)
  maxAllowedResult: ResultRating; // e.g., 'DAT'
}

export interface AssignedClassItem {
  classId: string;
  className: string;
  campusId: string;
  campusCode: string;
  campusName: string;
  grade: string;
  level: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  homeroomTeacherCode?: string;
  homeroomTeacherEmail?: string;
  totalStudents: number;
  evaluatedStudents: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: string;
}

export interface StudentEvaluationItem {
  id?: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  gender?: string;
  classId: string;
  className: string;
  campusId?: string;
  attendance: AttendanceStatus;
  roles: string[]; // Trưởng nhóm, Thành viên,...
  criteriaScores: Record<string, EvalLevel>; // { [criterionId]: 1|2|3|4 }
  calculatedPercent: number; // 0 to 100
  finalResult: ResultRating;
  isMandatoryRestricted?: boolean;
  remarksQuick?: string[];
  remarksCustom?: string;
  note?: string;
}

export interface ExperientialActivityData {
  id?: string;
  code: string;
  name: string;
  academicYearId: string;
  academicYearName?: string;
  campusId?: string;
  campusCode?: string;
  campusName?: string;
  educationLevel: string;
  grades: string[];
  date: string;
  timeRange?: string;
  location?: string;
  teacherId: string;
  teacherName?: string;
  description?: string;
  objectives?: string;
  evidenceUrls?: string[];
  strand: ActivityStrand;
  activityTypeId: string;
  activityTypeName?: string;
  scale: ActivityScale;
  evalMode: EvalMode;
  criteria: CriterionConfig[];
  formulaType: FormulaType;
  thresholds: ThresholdConfig;
  mandatoryRules: MandatoryRule[];
  deadline?: string;
  status: ActivityStatus;
  assignedClasses: AssignedClassItem[];
  participantsCount?: number;
  totalClassesCount?: number;
  completedClassesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
