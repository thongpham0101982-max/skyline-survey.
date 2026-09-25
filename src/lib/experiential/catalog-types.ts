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

export interface ActivityCatalogMeta {
  academicYearId?: string;
  educationLevel: CatalogEducationLevel;
  programType: ProgramType;
  sheetCode: SheetCode;
  grades: string[]; // ["1", "2"] or ["Lớp 1", "Lớp 2"] or ["Mầm non"]
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
