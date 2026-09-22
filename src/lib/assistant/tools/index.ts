import {
  getStudentGrades,
  getStudentCompetencies,
  getStudentGoalsAndPlans,
  getStudentTimetable,
  getStudentAdvisoryNotes
} from "./studentTools";

import {
  getClassGradebookStatus,
  getBenchmarkAlerts,
  getHomeroomAtRiskStudents,
  draftStudentEvaluationComment,
  getTeacherObservationStatus
} from "./teacherTools";

import {
  getParentChildren,
  getChildAcademicProgress,
  getChildGoalsAndTeacherNotes
} from "./parentTools";

import {
  getSchoolwideGradebookProgress,
  getDepartmentObservationStats,
  getSystemAtRiskOverview,
  getSchoolwideSurveyNPS
} from "./adminTools";

import { AssistantRole } from "../personas";

// ============================================================================
// 1. GEMINI FUNCTION DECLARATIONS THEO TỪNG VAI TRÒ
// ============================================================================

const STUDENT_FUNCTION_DECLARATIONS = [
  {
    name: "getStudentGrades",
    description: "Tra cứu bảng điểm chi tiết các môn học, điểm giữa kỳ, cuối kỳ của chính học sinh đang đăng nhập.",
    parameters: {
      type: "OBJECT",
      properties: {
        subjectNameFilter: { type: "STRING", description: "Tên môn học cần lọc (ví dụ: Toán, Văn, Tiếng Anh...)" },
        evaluationPeriod: { type: "STRING", description: "Kỳ đánh giá (ví dụ: GIUA_KY_1, CUOI_KY_1, HK1, HK2)" }
      }
    }
  },
  {
    name: "getStudentCompetencies",
    description: "Xem đánh giá năng lực môn học và dữ liệu Radar năng lực của học sinh.",
    parameters: {
      type: "OBJECT",
      properties: {
        subjectFilter: { type: "STRING", description: "Tên môn học muốn xem năng lực" }
      }
    }
  },
  {
    name: "getStudentGoalsAndPlans",
    description: "Tra cứu sổ mục tiêu SMART, các hành động cụ thể và kế hoạch 7 ngày gỡ khó của học sinh.",
    parameters: {
      type: "OBJECT",
      properties: {
        statusFilter: { type: "STRING", description: "Trạng thái mục tiêu (IN_PROGRESS, COMPLETED, ALL)" }
      }
    }
  },
  {
    name: "getStudentTimetable",
    description: "Xem thời khóa biểu học tập của học sinh hôm nay hoặc theo thứ trong tuần.",
    parameters: {
      type: "OBJECT",
      properties: {
        dayOfWeek: { type: "STRING", description: "Thứ trong tuần (ví dụ: Thứ Hai, Thứ Ba...)" }
      }
    }
  },
  {
    name: "getStudentAdvisoryNotes",
    description: "Xem lại nhật ký các buổi gặp gỡ với Thầy/Cô cố vấn học tập và phản hồi các yêu cầu trợ giúp.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];

const TEACHER_FUNCTION_DECLARATIONS = [
  {
    name: "getClassGradebookStatus",
    description: "Thống kê tiến độ nhập điểm, số lượng học sinh thiếu điểm và phổ điểm của lớp dạy môn học.",
    parameters: {
      type: "OBJECT",
      properties: {
        classCode: { type: "STRING", description: "Mã lớp học cần tra cứu (ví dụ: 10A1, 9B...)" },
        subjectCode: { type: "STRING", description: "Mã hoặc tên môn học" }
      }
    }
  },
  {
    name: "getBenchmarkAlerts",
    description: "Cảnh báo và liệt kê các học sinh có điểm trung bình dưới chuẩn benchmark môn học trong lớp.",
    parameters: {
      type: "OBJECT",
      properties: {
        classCode: { type: "STRING", description: "Mã lớp học" },
        subjectCode: { type: "STRING", description: "Môn học" }
      }
    }
  },
  {
    name: "getHomeroomAtRiskStudents",
    description: "Dành cho GVCN: Liệt kê danh sách học sinh lớp chủ nhiệm đang ở diện cảnh báo Vàng, Đỏ và yêu cầu trợ giúp đang chờ xử lý.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "draftStudentEvaluationComment",
    description: "Tạo dự thảo lời nhận xét học kỳ gợi ý cho học sinh dựa trên số liệu điểm, năng lực và mục tiêu thật.",
    parameters: {
      type: "OBJECT",
      properties: {
        studentIdentifier: { type: "STRING", description: "Tên hoặc mã số học sinh cần soạn nhận xét" }
      },
      required: ["studentIdentifier"]
    }
  },
  {
    name: "getTeacherObservationStatus",
    description: "Kiểm tra chỉ tiêu số tiết dự giờ cá nhân trong tháng và tra cứu nhận xét góp ý các tiết dạy của giáo viên.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];

const PARENT_FUNCTION_DECLARATIONS = [
  {
    name: "getParentChildren",
    description: "Lấy danh sách các con em được liên kết với tài khoản Phụ huynh hiện tại.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "getChildAcademicProgress",
    description: "Báo cáo chi tiết kết quả học tập và điểm số các môn của con em phụ huynh.",
    parameters: {
      type: "OBJECT",
      properties: {
        studentNameOrCode: { type: "STRING", description: "Tên hoặc mã con em cần tra cứu nếu phụ huynh có nhiều con" }
      }
    }
  },
  {
    name: "getChildGoalsAndTeacherNotes",
    description: "Xem các mục tiêu học tập con đã đăng ký, lời dặn của Thầy/Cô cố vấn và ghi nhận hỗ trợ gia đình.",
    parameters: {
      type: "OBJECT",
      properties: {
        studentNameOrCode: { type: "STRING", description: "Tên hoặc mã con em" }
      }
    }
  }
];

const ADMIN_FUNCTION_DECLARATIONS = [
  {
    name: "getSchoolwideGradebookProgress",
    description: "Thống kê tiến độ hoàn thành sổ điểm toàn trường, theo cơ sở hoặc theo khối.",
    parameters: {
      type: "OBJECT",
      properties: {
        campusCode: { type: "STRING", description: "Mã cơ sở (ví dụ: CS1, CS2...)" },
        grade: { type: "STRING", description: "Khối lớp (ví dụ: K1, K6, K10...)" }
      }
    }
  },
  {
    name: "getDepartmentObservationStats",
    description: "Thống kê hoạt động dạy và dự giờ của các Tổ chuyên môn trong trường.",
    parameters: {
      type: "OBJECT",
      properties: {
        deptName: { type: "STRING", description: "Tên tổ chuyên môn (ví dụ: Tổ Toán, Tổ Tự Nhiên...)" }
      }
    }
  },
  {
    name: "getSystemAtRiskOverview",
    description: "Tổng hợp số lượng và danh sách học sinh diện cảnh báo nguy cơ Xanh/Vàng/Đỏ trên toàn hệ thống.",
    parameters: {
      type: "OBJECT",
      properties: {
        campusCode: { type: "STRING", description: "Mã cơ sở cần lọc" }
      }
    }
  },
  {
    name: "getSchoolwideSurveyNPS",
    description: "Báo cáo chỉ số hài lòng Phụ huynh (NPS) và tỷ lệ phản hồi khảo sát định kỳ.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];

import {
  getTCMTeachers,
  getTCMSubjectQuality,
  getTCMObservationMonitoring
} from "./tcmTools";

const TCM_FUNCTION_DECLARATIONS = [
  {
    name: "getTCMTeachers",
    description: "Lấy danh sách giáo viên thuộc Tổ Chuyên Môn (TTCM) hoặc các TCM trong Bộ Phận (TBP).",
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: { type: "STRING", description: "Từ khóa tìm kiếm theo tên hoặc mã giáo viên" }
      }
    }
  },
  {
    name: "getTCMSubjectQuality",
    description: "Thống kê tiến độ vào điểm, điểm trung bình và học sinh dưới chuẩn benchmark của các bộ môn thuộc Tổ Chuyên Môn quản lý.",
    parameters: {
      type: "OBJECT",
      properties: {
        subjectQuery: { type: "STRING", description: "Tên hoặc mã môn học cần lọc" }
      }
    }
  },
  {
    name: "getTCMObservationMonitoring",
    description: "Giám sát tiến độ dạy và dự giờ của toàn bộ giáo viên trong Tổ Chuyên Môn (định mức 2 tiết/tháng, danh sách chưa hoàn thành).",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];

// ============================================================================
// 2. TRẢ VỀ CÁC TOOL PHÙ HỢP VỚI ROLE
// ============================================================================

export function getFunctionDeclarationsForRole(role: AssistantRole) {
  switch (role) {
    case "STUDENT":
      return STUDENT_FUNCTION_DECLARATIONS;
    case "TEACHER":
      return TEACHER_FUNCTION_DECLARATIONS;
    case "TTCM":
      return [...TEACHER_FUNCTION_DECLARATIONS, ...TCM_FUNCTION_DECLARATIONS];
    case "TBP":
      return [...TCM_FUNCTION_DECLARATIONS, ...ADMIN_FUNCTION_DECLARATIONS];
    case "PARENT":
      return PARENT_FUNCTION_DECLARATIONS;
    case "ADMIN":
      return [
        ...ADMIN_FUNCTION_DECLARATIONS,
        ...TCM_FUNCTION_DECLARATIONS,
        ...TEACHER_FUNCTION_DECLARATIONS
      ];
    default:
      return [];
  }
}

// ============================================================================
// 3. TOOL DISPATCHER CÓ PHÂN QUYỀN VÀ KIỂM TRA BẢO MẬT (SECURITY RBAC)
// ============================================================================

export interface AssistantSecurityContext {
  role: AssistantRole;
  userId?: string;
  studentId?: string;
  userName?: string;
  isSuperAdmin?: boolean;
  isHeadOfAcademic?: boolean; // Ban ĐHCM
  isTBP?: boolean;            // Trưởng Bộ Phận
  isTTCM?: boolean;           // Tổ Trưởng Chuyên Môn
  managedDivisions?: string[];// Bộ phận của TBP
  managedDepartmentIds?: string[]; // TCM của TTCM
  scopedDepartmentIds?: string[] | null; // null = Unrestricted (Ban ĐHCM/Admin)
  departmentName?: string;
  divisionNames?: string[];
  teacherId?: string;
}

export async function executeAssistantTool(
  toolName: string,
  args: any,
  context: AssistantSecurityContext
): Promise<any> {
  const role = context.role;
  const isGlobalAdmin = context.isSuperAdmin || context.isHeadOfAcademic || role === "ADMIN";

  // 1. Nhóm Học sinh (Chỉ cho phép STUDENT)
  if (
    [
      "getStudentGrades",
      "getStudentCompetencies",
      "getStudentGoalsAndPlans",
      "getStudentTimetable",
      "getStudentAdvisoryNotes"
    ].includes(toolName)
  ) {
    if (role !== "STUDENT" && !isGlobalAdmin) {
      return { error: "Bạn không có quyền truy cập công cụ học sinh cá nhân này." };
    }
    if (!context.studentId && !args?.studentId) {
      return { error: "Không xác định được danh tính học sinh." };
    }
    const targetStudentId = context.studentId || args?.studentId;

    if (toolName === "getStudentGrades") {
      return await getStudentGrades(targetStudentId, args?.subjectNameFilter, args?.evaluationPeriod);
    }
    if (toolName === "getStudentCompetencies") {
      return await getStudentCompetencies(targetStudentId, args?.subjectFilter);
    }
    if (toolName === "getStudentGoalsAndPlans") {
      return await getStudentGoalsAndPlans(targetStudentId, args?.statusFilter);
    }
    if (toolName === "getStudentTimetable") {
      return await getStudentTimetable(targetStudentId, args?.dayOfWeek);
    }
    if (toolName === "getStudentAdvisoryNotes") {
      return await getStudentAdvisoryNotes(targetStudentId);
    }
  }

  // 2. Nhóm Phụ huynh (BẢO MẬT: Chỉ truy cập con em mình)
  if (["getParentChildren", "getChildAcademicProgress", "getChildGoalsAndTeacherNotes"].includes(toolName)) {
    if (role !== "PARENT" && !isGlobalAdmin) {
      return { error: "Công cụ này chỉ dành cho tài khoản Phụ huynh học sinh." };
    }
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản phụ huynh." };

    if (toolName === "getParentChildren") {
      return await getParentChildren(context.userId);
    }
    if (toolName === "getChildAcademicProgress") {
      return await getChildAcademicProgress(context.userId, args?.studentNameOrCode);
    }
    if (toolName === "getChildGoalsAndTeacherNotes") {
      return await getChildGoalsAndTeacherNotes(context.userId, args?.studentNameOrCode);
    }
  }

  // 3. Nhóm Nghiệp vụ TCM (Dành cho TTCM, TBP, và Ban ĐHCM / Admin)
  if (["getTCMTeachers", "getTCMSubjectQuality", "getTCMObservationMonitoring"].includes(toolName)) {
    if (!["TTCM", "TBP", "ADMIN"].includes(role) && !isGlobalAdmin) {
      return { error: "Chức năng này chỉ dành cho Tổ Trưởng Chuyên Môn, Trưởng Bộ Phận hoặc Ban ĐHCM." };
    }
    const scopedDepts = isGlobalAdmin ? null : (context.scopedDepartmentIds ?? []);

    if (toolName === "getTCMTeachers") {
      return await getTCMTeachers(scopedDepts, args?.keyword);
    }
    if (toolName === "getTCMSubjectQuality") {
      return await getTCMSubjectQuality(scopedDepts, args?.subjectQuery);
    }
    if (toolName === "getTCMObservationMonitoring") {
      return await getTCMObservationMonitoring(scopedDepts);
    }
  }

  // 4. Nhóm Giáo viên (TEACHER, TTCM, TBP, ADMIN)
  if (
    [
      "getClassGradebookStatus",
      "getBenchmarkAlerts",
      "getHomeroomAtRiskStudents",
      "draftStudentEvaluationComment",
      "getTeacherObservationStatus"
    ].includes(toolName)
  ) {
    if (role === "STUDENT" || role === "PARENT") {
      return { error: "Tài khoản của bạn không có quyền truy cập dữ liệu sư phạm của giáo viên." };
    }
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };

    if (toolName === "getClassGradebookStatus") {
      return await getClassGradebookStatus(context.userId, args?.classCode, args?.subjectCode);
    }
    if (toolName === "getBenchmarkAlerts") {
      return await getBenchmarkAlerts(context.userId, args?.classCode, args?.subjectCode);
    }
    if (toolName === "getHomeroomAtRiskStudents") {
      return await getHomeroomAtRiskStudents(context.userId);
    }
    if (toolName === "draftStudentEvaluationComment") {
      return await draftStudentEvaluationComment(args?.studentIdentifier);
    }
    if (toolName === "getTeacherObservationStatus") {
      return await getTeacherObservationStatus(context.userId);
    }
  }

  // 5. Nhóm Ban ĐHCM & BGH (Toàn quyền hệ thống)
  if (
    [
      "getSchoolwideGradebookProgress",
      "getDepartmentObservationStats",
      "getSystemAtRiskOverview",
      "getSchoolwideSurveyNPS"
    ].includes(toolName)
  ) {
    if (!isGlobalAdmin && role !== "TBP") {
      return { error: "Chức năng báo cáo toàn trường chỉ dành cho Ban Điều Hành Chuyên Môn (Ban ĐHCM) và Ban Giám Hiệu." };
    }

    if (toolName === "getSchoolwideGradebookProgress") {
      return await getSchoolwideGradebookProgress(args?.campusCode, args?.grade);
    }
    if (toolName === "getDepartmentObservationStats") {
      return await getDepartmentObservationStats(args?.deptName);
    }
    if (toolName === "getSystemAtRiskOverview") {
      return await getSystemAtRiskOverview(args?.campusCode);
    }
    if (toolName === "getSchoolwideSurveyNPS") {
      return await getSchoolwideSurveyNPS();
    }
  }

  return { error: `Không tìm thấy công cụ "${toolName}" hoặc bạn chưa được cấp quyền.` };
}
