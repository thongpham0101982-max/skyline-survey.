import { prisma } from "@/lib/db";
import { getRolePermissions } from "@/lib/permissions";
import {
  ENTRANCE_OPERATIONS_ROLES,
  getResolvedAuthContext,
  type ResolvedAuthContext,
} from "@/lib/security-guard";
import { getCampusGiaovuEmail, normalizeCampusCode } from "@/lib/orientation/service";

export interface SimpleCampusInfo {
  id: string;
  campusCode: string;
  campusName: string;
}

export interface AssignmentSenderContext {
  auth: ResolvedAuthContext;
  userId: string;
  senderName: string;
  senderEmail: string;
  role: string;
  isSystemWide: boolean;
  allowedCampuses: SimpleCampusInfo[];
  allowedCampusIds: string[];
  primaryCampus: SimpleCampusInfo | null;
}

export interface AssignmentEmailBranding {
  campusCode: string;
  campusName: string;
  cleanCampusLabel: string;
  subjectPrefix: string;
  announcerPhrase: string;
  fromDisplayName: string;
  footerDeptLabel: string;
  replyTo: string;
  giaovuCcEmail: string;
}

export const SYSTEM_WIDE_ENTRANCE_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "ĐBCL",
  "DBCL",
  "BAN_DHCM",
  "TB_DHCM",
  "BGH",
  "BAN_GIAM_HIEU",
]);

export const K12_ASSIGNMENT_PERMISSION_MODULES = [
  "PHAN_CONG_K12",
  "PHAN_CONG_KHAO_SAT",
  "INPUT_ASSESSMENTS_ASSIGNMENTS",
  "INPUT_ASSESSMENTS",
];

export const PRESCHOOL_ASSIGNMENT_PERMISSION_MODULES = [
  "PCKS_MAM_NON",
  "PHAN_CONG_MAM_NON",
  "PHAN_CONG_KHAO_SAT",
  "PRESCHOOL_INPUT_ASSESSMENTS",
];

/**
 * Resolves the logged-in user/teacher, verifies they have permission for entrance assignment operations,
 * and loads their campus assignments (Teacher.campus, UserCampusAssignment, managedCampuses).
 */
export async function resolveAssignmentSenderContext(
  permissionModules: string[]
): Promise<AssignmentSenderContext | null> {
  const authCtx = await getResolvedAuthContext();
  if (!authCtx || authCtx.isParent) return null;

  const isSystemWide =
    SYSTEM_WIDE_ENTRANCE_ROLES.has(authCtx.role) ||
    authCtx.roles.some((r) => SYSTEM_WIDE_ENTRANCE_ROLES.has(r));

  let hasPermission =
    isSystemWide ||
    ENTRANCE_OPERATIONS_ROLES.has(authCtx.role) ||
    authCtx.roles.some((r) => ENTRANCE_OPERATIONS_ROLES.has(r));

  if (!hasPermission && authCtx.role) {
    try {
      const perms = await getRolePermissions(authCtx.role);
      hasPermission = perms.some(
        (p: any) =>
          permissionModules.includes(p.module) &&
          Boolean(p.canUpdate || p.canCreate)
      );
    } catch {
      hasPermission = false;
    }
  }

  if (!hasPermission) return null;

  const dbUser = await (prisma as any).user
    .findUnique({
      where: { id: authCtx.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        teacher: {
          select: {
            id: true,
            teacherName: true,
            email: true,
            campusId: true,
            campus: {
              select: { id: true, campusCode: true, campusName: true },
            },
          },
        },
        campusAssignments: {
          select: {
            campus: {
              select: { id: true, campusCode: true, campusName: true },
            },
          },
        },
        managedCampuses: {
          select: { id: true, campusCode: true, campusName: true },
        },
      },
    })
    .catch(() => null);

  const campusMap = new Map<string, SimpleCampusInfo>();
  const addCampus = (c?: any) => {
    if (!c?.id) return;
    if (!campusMap.has(c.id)) {
      campusMap.set(c.id, {
        id: String(c.id),
        campusCode: String(c.campusCode || "").trim(),
        campusName: String(c.campusName || "").trim(),
      });
    }
  };

  // Prioritize the logged-in Teacher's campus first, then managedCampuses, then UserCampusAssignments
  const teacherCampus = dbUser?.teacher?.campus || null;
  if (teacherCampus) addCampus(teacherCampus);
  for (const mc of dbUser?.managedCampuses || []) addCampus(mc);
  for (const ca of dbUser?.campusAssignments || []) addCampus(ca?.campus);

  // Also resolve any session.user.campusIds if not already loaded
  const sessionCampusIds: string[] = Array.isArray(authCtx.user?.campusIds)
    ? authCtx.user.campusIds
    : [];
  const missingIds = sessionCampusIds.filter((id) => id && !campusMap.has(id));
  if (missingIds.length > 0) {
    const extraCampuses = await (prisma as any).campus
      .findMany({
        where: { id: { in: missingIds } },
        select: { id: true, campusCode: true, campusName: true },
      })
      .catch(() => []);
    for (const c of extraCampuses) addCampus(c);
  }

  const allowedCampuses = Array.from(campusMap.values());
  const primaryCampus =
    (teacherCampus?.id ? campusMap.get(teacherCampus.id) : null) ||
    allowedCampuses[0] ||
    null;

  const senderName = String(
    dbUser?.teacher?.teacherName ||
      dbUser?.fullName ||
      authCtx.user?.name ||
      "Giáo vụ cơ sở"
  ).trim();

  const rawEmail = String(
    dbUser?.teacher?.email || dbUser?.email || authCtx.userEmail || ""
  ).trim();
  const senderEmail = rawEmail.includes("@") ? rawEmail : "";

  return {
    auth: authCtx,
    userId: authCtx.userId,
    senderName,
    senderEmail,
    role: authCtx.role,
    isSystemWide,
    allowedCampuses,
    allowedCampusIds: allowedCampuses.map((c) => c.id),
    primaryCampus,
  };
}

function matchesCampus(
  campus: SimpleCampusInfo,
  batch?: { campusId?: string | null; name?: string | null; campus?: SimpleCampusInfo | null } | null,
  periodName?: string | null
): boolean {
  if (!batch) return true;
  if (batch.campusId && batch.campusId === campus.id) return true;
  if (batch.campus?.id && batch.campus.id === campus.id) return true;

  const hint = `${batch.name || ""} ${periodName || ""}`.trim();
  if (!hint) return false;
  const upperHint = hint.toUpperCase();
  if (campus.campusCode && upperHint.includes(campus.campusCode.toUpperCase())) return true;
  if (campus.campusName && upperHint.includes(campus.campusName.toUpperCase())) return true;

  // Match standardized CS1..CS5 code if both sides resolve explicitly
  const hasExplicitCampusToken =
    /\bCS[1-5]\b|CƠ SỞ\s*[1-5]|RIVERSIDE|CENTRAL|INTERNATIONAL|GLOBAL|BEACH|HILL|HỘI AN|HOI AN/i.test(
      hint
    );
  if (hasExplicitCampusToken) {
    const campusStd = normalizeCampusCode(`${campus.campusCode} ${campus.campusName}`);
    const hintStd = normalizeCampusCode(hint);
    return campusStd === hintStd;
  }

  return false;
}

/**
 * Checks whether the logged-in user is authorized to send emails for a given batch.
 * System-wide roles can send for any batch; campus-scoped accounts can only send for batches in their campus(es).
 */
export function isBatchAllowedForSender(
  sender: AssignmentSenderContext,
  batch?: { campusId?: string | null; name?: string | null; campus?: SimpleCampusInfo | null } | null,
  periodName?: string | null
): boolean {
  if (sender.isSystemWide) return true;
  if (sender.allowedCampuses.length === 0) return true;
  if (!batch) return true;

  // If batch has an explicit campusId, require exact match with allowedCampuses
  if (batch.campusId) {
    return sender.allowedCampusIds.includes(batch.campusId);
  }

  return sender.allowedCampuses.some((c) => matchesCampus(c, batch, periodName));
}

function stripLeadingCampusWord(label: string): string {
  return label.replace(/^cơ\s*sở\s*/i, "").trim();
}

/**
 * Builds the standardized SSM email subject prefix, announcer phrase, sender name, and reply-to
 * tied to the logged-in Teacher/User's campus (falling back to the batch's campus for system-wide admins).
 */
export function resolveEmailCampusBranding(
  sender: Pick<
    AssignmentSenderContext,
    "primaryCampus" | "allowedCampuses" | "senderEmail" | "isSystemWide"
  >,
  batch?: { campusId?: string | null; name?: string | null; campus?: SimpleCampusInfo | null } | null,
  periodName?: string | null
): AssignmentEmailBranding {
  let chosenCampus: SimpleCampusInfo | null = null;

  // 1. If the logged-in user has multiple allowed campuses and the batch matches one of them, use that campus
  if (sender.allowedCampuses.length > 1 && batch) {
    chosenCampus =
      sender.allowedCampuses.find((c) => matchesCampus(c, batch, periodName)) || null;
  }

  // 2. Otherwise prioritize the logged-in Teacher/User's primary campus
  if (!chosenCampus && sender.primaryCampus) {
    chosenCampus = sender.primaryCampus;
  }

  // 3. Fallback for system-wide accounts without a personal campus: use the batch's campus
  if (!chosenCampus && batch?.campus?.id) {
    chosenCampus = batch.campus;
  }

  const fallbackHint = `${batch?.name || ""} ${periodName || ""}`.trim();
  const hasHintCampus =
    Boolean(fallbackHint) &&
    /\bCS[1-5]\b|CƠ SỞ\s*[1-5]|RIVERSIDE|CENTRAL|INTERNATIONAL|GLOBAL|BEACH|HILL|HỘI AN|HOI AN/i.test(
      fallbackHint
    );

  const campusCode = chosenCampus?.campusCode
    ? chosenCampus.campusCode
    : hasHintCampus
      ? normalizeCampusCode(fallbackHint)
      : "";

  const campusName = chosenCampus?.campusName
    ? chosenCampus.campusName
    : campusCode;

  const rawLabel = campusName || campusCode;
  const cleanCampusLabel = rawLabel ? stripLeadingCampusWord(rawLabel) : "";

  const subjectPrefix = cleanCampusLabel ? `[SSM - ${cleanCampusLabel}]` : "[SSM]";
  const announcerPhrase = cleanCampusLabel
    ? `Giáo vụ cơ sở ${cleanCampusLabel} trân trọng thông báo`
    : "Giáo vụ cơ sở trân trọng thông báo";
  const fromDisplayName = cleanCampusLabel
    ? `SSM - Giáo vụ cơ sở ${cleanCampusLabel}`
    : "SSM - Giáo vụ cơ sở";
  const footerDeptLabel = cleanCampusLabel
    ? `GIÁO VỤ CƠ SỞ ${cleanCampusLabel.toUpperCase()} • HỆ THỐNG SSM SKY-LINE`
    : "GIÁO VỤ CƠ SỞ • HỆ THỐNG SSM SKY-LINE";

  const giaovuCcEmail = getCampusGiaovuEmail(
    `${campusCode} ${campusName} ${fallbackHint}`.trim()
  );

  const replyTo =
    sender.senderEmail && sender.senderEmail.includes("@")
      ? sender.senderEmail
      : giaovuCcEmail || "ktdbcl@skylineschool.edu.vn";

  return {
    campusCode,
    campusName,
    cleanCampusLabel,
    subjectPrefix,
    announcerPhrase,
    fromDisplayName,
    footerDeptLabel,
    replyTo,
    giaovuCcEmail,
  };
}
