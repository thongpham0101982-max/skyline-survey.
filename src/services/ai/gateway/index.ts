/**
 * Central Permission Gateway for Enterprise SSM AI Assistant
 * Enforces Role-Based Access Control (RBAC) & Scope-Based Access Control (SBAC).
 */

import { AIUserContext } from "../types";
import { prisma } from "@/lib/db";

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  scope?: "GLOBAL" | "SCOPED" | "DENIED";
}

export interface TargetResource {
  campusId?: string;
  departmentId?: string;
  classId?: string;
  subjectId?: string;
  studentId?: string;
  teacherId?: string;
}

// Tool accessibility by Role
const TOOL_ALLOWED_ROLES: Record<string, string[]> = {
  searchKnowledge: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
  getCurrentUser: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
  getStudentExamAnalysis: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
  getClassExamAnalysis: ["ADMIN", "TBP", "TTCM", "TEACHER"],
  getSubjectAnalysis: ["ADMIN", "TBP", "TTCM"],
  getTeacherObservationAnalysis: ["ADMIN", "TBP", "TTCM", "TEACHER"],
  getStudentAdvisoryAnalysis: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"]
};

export async function authorizeAIAction(
  context: AIUserContext,
  toolName: string,
  target?: TargetResource
): Promise<AuthorizationResult> {
  // 1. Role validation (RBAC)
  const allowedRoles = TOOL_ALLOWED_ROLES[toolName];
  if (allowedRoles && !allowedRoles.includes(context.role)) {
    return {
      authorized: false,
      reason: `Vai trò ${context.role} không có thẩm quyền truy cập công cụ ${toolName}.`,
      scope: "DENIED"
    };
  }

  // 2. SuperAdmin / Head of Academic / Ban ĐHCM has global unrestricted access
  if (context.role === "ADMIN" || context.isHeadOfAcademic) {
    return { authorized: true, scope: "GLOBAL" };
  }

  // 3. Student isolation
  if (context.role === "STUDENT") {
    if (target?.studentId && target.studentId !== context.studentId) {
      return {
        authorized: false,
        reason: "Học sinh chỉ được phép truy xuất dữ liệu cá nhân của chính mình.",
        scope: "DENIED"
      };
    }
    return { authorized: true, scope: "SCOPED" };
  }

  // 4. Parent isolation
  if (context.role === "PARENT") {
    if (target?.studentId) {
      try {
        const link = await prisma.parentStudentLink.findFirst({
          where: {
            studentId: target.studentId,
            parent: { userId: context.userId }
          }
        });
        if (!link) {
          return {
            authorized: false,
            reason: "Phụ huynh chỉ được phép truy xuất kết quả học tập của con em mình.",
            scope: "DENIED"
          };
        }
      } catch (err) {
        console.error("Parent link check error:", err);
        return { authorized: false, reason: "Lỗi thẩm tra liên kết phụ huynh - học sinh.", scope: "DENIED" };
      }
    }
    return { authorized: true, scope: "SCOPED" };
  }

  // 5. TTCM (Tổ Trưởng Chuyên Môn) Scoping
  if (context.role === "TTCM" && target?.departmentId) {
    const isManaged = context.managedDepartmentIds?.includes(target.departmentId);
    if (!isManaged) {
      return {
        authorized: false,
        reason: "Tổ trưởng chuyên môn chỉ được phép truy cập dữ liệu trong Tổ mình phụ trách.",
        scope: "DENIED"
      };
    }
  }

  // 6. TBP (Trưởng Bộ Phận) Scoping
  if (context.role === "TBP" && target?.departmentId) {
    const isManaged = context.managedDepartmentIds?.includes(target.departmentId);
    if (!isManaged) {
      return {
        authorized: false,
        reason: "Trưởng bộ phận chỉ được phép truy cập các Tổ chuyên môn thuộc Bộ phận được phân công.",
        scope: "DENIED"
      };
    }
  }

  // 7. Teacher Scoping
  if (context.role === "TEACHER") {
    // Regular teachers cannot query schoolwide observation analytics
    if (toolName === "getTeacherObservationAnalysis" && target?.teacherId && target.teacherId !== context.teacherId) {
      return {
        authorized: false,
        reason: "Giáo viên chỉ được phép xem các tiết dạy hoặc phiếu dự giờ của chính mình.",
        scope: "DENIED"
      };
    }
  }

  return { authorized: true, scope: "SCOPED" };
}
