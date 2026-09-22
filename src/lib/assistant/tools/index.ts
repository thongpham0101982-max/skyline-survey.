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

// ============================================================================
// 2. TRẢ VỀ CÁC TOOL PHÙ HỢP VỚI ROLE
// ============================================================================

export function getFunctionDeclarationsForRole(role: AssistantRole) {
  switch (role) {
    case "STUDENT":
      return STUDENT_FUNCTION_DECLARATIONS;
    case "TEACHER":
      return TEACHER_FUNCTION_DECLARATIONS;
    case "PARENT":
      return PARENT_FUNCTION_DECLARATIONS;
    case "ADMIN":
      return ADMIN_FUNCTION_DECLARATIONS;
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
}

export async function executeAssistantTool(
  toolName: string,
  args: any,
  context: AssistantSecurityContext
): Promise<any> {
  // 1. Nhóm Học sinh
  if (toolName === "getStudentGrades") {
    if (!context.studentId) return { error: "Không xác định được danh tính học sinh. Vui lòng đăng nhập lại cổng học sinh." };
    return await getStudentGrades(context.studentId, args?.subjectNameFilter, args?.evaluationPeriod);
  }
  if (toolName === "getStudentCompetencies") {
    if (!context.studentId) return { error: "Không xác định được danh tính học sinh." };
    return await getStudentCompetencies(context.studentId, args?.subjectFilter);
  }
  if (toolName === "getStudentGoalsAndPlans") {
    if (!context.studentId) return { error: "Không xác định được danh tính học sinh." };
    return await getStudentGoalsAndPlans(context.studentId, args?.statusFilter);
  }
  if (toolName === "getStudentTimetable") {
    if (!context.studentId) return { error: "Không xác định được danh tính học sinh." };
    return await getStudentTimetable(context.studentId, args?.dayOfWeek);
  }
  if (toolName === "getStudentAdvisoryNotes") {
    if (!context.studentId) return { error: "Không xác định được danh tính học sinh." };
    return await getStudentAdvisoryNotes(context.studentId);
  }

  // 2. Nhóm Giáo viên
  if (toolName === "getClassGradebookStatus") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };
    return await getClassGradebookStatus(context.userId, args?.classCode, args?.subjectCode);
  }
  if (toolName === "getBenchmarkAlerts") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };
    return await getBenchmarkAlerts(context.userId, args?.classCode, args?.subjectCode);
  }
  if (toolName === "getHomeroomAtRiskStudents") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };
    return await getHomeroomAtRiskStudents(context.userId);
  }
  if (toolName === "draftStudentEvaluationComment") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };
    return await draftStudentEvaluationComment(args?.studentIdentifier);
  }
  if (toolName === "getTeacherObservationStatus") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản giáo viên." };
    return await getTeacherObservationStatus(context.userId);
  }

  // 3. Nhóm Phụ huynh
  if (toolName === "getParentChildren") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản phụ huynh." };
    return await getParentChildren(context.userId);
  }
  if (toolName === "getChildAcademicProgress") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản phụ huynh." };
    return await getChildAcademicProgress(context.userId, args?.studentNameOrCode);
  }
  if (toolName === "getChildGoalsAndTeacherNotes") {
    if (!context.userId) return { error: "Vui lòng đăng nhập tài khoản phụ huynh." };
    return await getChildGoalsAndTeacherNotes(context.userId, args?.studentNameOrCode);
  }

  // 4. Nhóm BGH & Admin
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

  return { error: `Không tìm thấy công cụ "${toolName}".` };
}
