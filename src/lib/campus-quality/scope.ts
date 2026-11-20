import { prisma } from "@/lib/db"
import { resolveThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"
import { hasModulePermission } from "@/lib/permissions"
import { CampusQualityAccessScope } from "./types"

const PSYCHOLOGY_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "TAM_LY",
  "CHUYEN_VIEN_TAM_LY",
  "PSYCHOLOGIST",
  "COUNSELOR",
  "GDCS",
  "GĐCS",
  "GD_CS",
  "GĐ_CS",
  "BGH",
  "BGH_CS",
]

/**
 * Resolves unified access scope for Campus Quality Governance Dashboard.
 * - Ban KT&ĐBCL / Admin: full system scope
 * - GĐCS / BGH cơ sở: restricted strictly to assigned campus(es)
 * - TTCM / GV: restricted to assigned classes/subjects/departments
 * - Psychology sub-module: separate permission gate (canViewPsychology)
 */
export async function resolveCampusQualityScope(
  userId?: string | null,
  roleCode?: string | null,
  academicYearId?: string | null
): Promise<CampusQualityAccessScope> {
  const baseScope = await resolveThkqAccessScope(userId, roleCode, academicYearId)
  const uid = String(userId || "").trim()
  const upperRole = String(roleCode || "").toUpperCase().trim()

  if (!uid && !upperRole) {
    return {
      ...baseScope,
      canViewPsychology: false,
      canExportExcel: false,
      defaultCampusId: "ALL",
      teacherId: null,
      assignedDepartmentIds: [],
    }
  }

  const [hasPsychPerm, hasDashboardPerm, teacher, psychAssignmentCount] = await Promise.all([
    hasModulePermission(upperRole, "KTDBCL_SUPPORT").catch(() => false),
    hasModulePermission(upperRole, "CAMPUS_QUALITY_GOVERNANCE").catch(() => false),
    uid
      ? prisma.teacher
          .findFirst({
            where: { userId: uid },
            select: {
              id: true,
              campusId: true,
              departmentId: true,
              departmentAssignments: { select: { departmentId: true } },
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
    uid
      ? prisma.learningSupportAssignment
          .count({
            where: {
              teacher: { userId: uid },
              target: { supportType: "PSYCHOLOGICAL" },
            },
          })
          .catch(() => 0)
      : Promise.resolve(0),
  ])

  const isPsychRole = PSYCHOLOGY_ROLES.some(
    (r) => upperRole === r || upperRole.includes("TAM_LY") || upperRole.includes("PSYCH")
  )
  const canViewPsychology = Boolean(
    isPsychRole || hasPsychPerm || (psychAssignmentCount && psychAssignmentCount > 0)
  )

  const canViewReport = Boolean(
    baseScope.canViewReport ||
      hasDashboardPerm ||
      baseScope.roleTier === "SYSTEM_QA_EXEC" ||
      baseScope.roleTier === "CAMPUS_MANAGER" ||
      baseScope.roleTier === "DEPARTMENT_HEAD" ||
      baseScope.roleTier === "TEACHER_SCOPED"
  )

  const canExportExcel = Boolean(
    baseScope.canExportSummary ||
      baseScope.canExportDetail ||
      baseScope.roleTier === "SYSTEM_QA_EXEC" ||
      baseScope.roleTier === "CAMPUS_MANAGER"
  )

  const assignedDepartmentIds = Array.from(
    new Set(
      [
        teacher?.departmentId || "",
        ...(teacher?.departmentAssignments?.map((d) => d.departmentId) || []),
      ].filter(Boolean)
    )
  )

  let defaultCampusId = "ALL"
  if (baseScope.isCampusRestricted && baseScope.allowedCampusIds.length > 0) {
    defaultCampusId = baseScope.allowedCampusIds[0]
  } else if (teacher?.campusId && baseScope.roleTier !== "SYSTEM_QA_EXEC") {
    defaultCampusId = teacher.campusId
  }

  return {
    ...baseScope,
    canViewReport,
    canViewPsychology,
    canExportExcel,
    defaultCampusId,
    teacherId: teacher?.id || null,
    assignedDepartmentIds,
  }
}

/**
 * Enforces campus restriction so a campus-restricted user cannot bypass scope via URL query params.
 */
export function resolveEffectiveCampusIds(
  requestedCampusId: string | undefined,
  scope: CampusQualityAccessScope
): { campusIdParam: string; allowedCampusFilter: string[] | null; forbidden: boolean } {
  const req = String(requestedCampusId || "").trim()

  if (scope.isCampusRestricted && scope.allowedCampusIds.length > 0) {
    if (req && req !== "ALL") {
      if (!scope.allowedCampusIds.includes(req)) {
        return {
          campusIdParam: scope.allowedCampusIds[0],
          allowedCampusFilter: scope.allowedCampusIds,
          forbidden: true,
        }
      }
      return {
        campusIdParam: req,
        allowedCampusFilter: [req],
        forbidden: false,
      }
    }
    return {
      campusIdParam: scope.allowedCampusIds.length === 1 ? scope.allowedCampusIds[0] : "ALL",
      allowedCampusFilter: scope.allowedCampusIds,
      forbidden: false,
    }
  }

  if (req && req !== "ALL") {
    return {
      campusIdParam: req,
      allowedCampusFilter: [req],
      forbidden: false,
    }
  }

  return {
    campusIdParam: "ALL",
    allowedCampusFilter: null,
    forbidden: false,
  }
}
