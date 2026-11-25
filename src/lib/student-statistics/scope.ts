import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"
import { hasModulePermission } from "@/lib/permissions"
import { StudentStatisticsAccessScope } from "./types"

const SUMMARY_ONLY_ROLES = ["SUMMARY_VIEWER", "BAO_CAO_TONG_HOP", "VIEWER_SUMMARY"]

export async function resolveStudentStatisticsScope(
  userId?: string | null,
  roleCode?: string | null,
  academicYearId?: string | null
): Promise<StudentStatisticsAccessScope> {
  const uid = String(userId || "").trim()
  const upperRole = String(roleCode || "").toUpperCase().trim()

  if (!uid && !upperRole) {
    return {
      userId: "",
      roleCode: "",
      roleDisplayLabel: "Chưa đăng nhập",
      canViewReport: false,
      canViewAcademicTab: false,
      canViewPsychologyTab: false,
      canViewDetail: false,
      canViewPsychologyComments: false,
      canExportPdf: false,
      canExportDetailPdf: false,
      isSummaryOnly: true,
      isCampusRestricted: true,
      allowedCampusIds: [],
      defaultCampusId: "ALL",
      isClassRestricted: true,
      allowedClassIds: [],
      isSubjectRestricted: true,
      allowedSubjectIds: [],
      teacherId: null,
    }
  }

  const [cqScope, hasStatsPerm] = await Promise.all([
    resolveCampusQualityScope(uid, upperRole, academicYearId),
    hasModulePermission(upperRole, "STUDENT_STATISTICS_REPORT").catch(() => false),
  ])

  const isSummaryOnly =
    SUMMARY_ONLY_ROLES.includes(upperRole) || !cqScope.canViewDetail

  const canViewReport = Boolean(cqScope.canViewReport || hasStatsPerm)
  const canViewAcademicTab = canViewReport
  const canViewPsychologyTab = Boolean(canViewReport && cqScope.canViewPsychology)
  const canViewDetail = Boolean(canViewReport && cqScope.canViewDetail && !isSummaryOnly)
  const canViewPsychologyComments = Boolean(canViewPsychologyTab && canViewDetail)
  const canExportPdf = Boolean(
    canViewReport && (cqScope.canExportExcel || cqScope.canExportSummary || cqScope.canExportDetail)
  )
  const canExportDetailPdf = Boolean(canExportPdf && canViewDetail && cqScope.canExportDetail)

  return {
    userId: cqScope.userId,
    roleCode: cqScope.roleCode,
    roleDisplayLabel: cqScope.roleDisplayLabel,
    canViewReport,
    canViewAcademicTab,
    canViewPsychologyTab,
    canViewDetail,
    canViewPsychologyComments,
    canExportPdf,
    canExportDetailPdf,
    isSummaryOnly,
    isCampusRestricted: cqScope.isCampusRestricted,
    allowedCampusIds: cqScope.allowedCampusIds,
    defaultCampusId: cqScope.defaultCampusId,
    isClassRestricted: cqScope.isClassRestricted,
    allowedClassIds: cqScope.allowedClassIds,
    isSubjectRestricted: cqScope.isSubjectRestricted,
    allowedSubjectIds: cqScope.allowedSubjectIds,
    teacherId: cqScope.teacherId,
  }
}
