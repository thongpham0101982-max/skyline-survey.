import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasModulePermission } from "@/lib/permissions";
import {
  isSuperAdminRole,
  isKtdbclEntranceRole,
  isGdcsOrBghEntranceRole,
  isGiaoVuEntranceRole,
  isCampusScopedEntranceRole,
} from "@/lib/entrance-progress/constants";
import { normalizeK12GradeNumber } from "./constants";

export interface PvdhActor {
  authenticated: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  teacherId: string | null;
  teacherPosition: string | null;
  campusIds: string[];
  campusCodes: string[];
  isSystemWideAdmin: boolean;
  canManageConfig: boolean;
  canCoordinate: boolean;
  canReviewAndLock: boolean;
  canReopenLocked: boolean;
  isParent: boolean;
}

export async function getAuthenticatedPvdhActor(): Promise<PvdhActor | null> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return null;

  const role = String(user.role || "").trim().toUpperCase();
  const isSuper = isSuperAdminRole(role);
  const isKtdbcl = isKtdbclEntranceRole(role);
  const isGdcsBgh = isGdcsOrBghEntranceRole(role);
  const isGiaoVu = isGiaoVuEntranceRole(role);
  const isParent = role === "PARENT" || role === "PHHS";

  const [teacher, campusAssignments, allCampuses, permConfig, permReview, permAssign] =
    await Promise.all([
      prisma.teacher
        .findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.email ? [{ email: user.email }] : []),
            ],
          },
          select: {
            id: true,
            teacherName: true,
            position: true,
            positions: true,
            campusId: true,
          },
        })
        .catch(() => null),
      prisma.userCampusAssignment
        .findMany({
          where: { userId: user.id },
          select: { campusId: true },
        })
        .catch(() => []),
      prisma.campus
        .findMany({
          select: { id: true, campusCode: true, campusName: true, managerId: true },
        })
        .catch(() => []),
      hasModulePermission(role, ["CAU_HINH_FILE_DIEM_KSDV"], "canUpdate").catch(() => false),
      hasModulePermission(role, ["XET_DUYET_KET_QUA", "XDKQ_K12"], "canUpdate").catch(() => false),
      hasModulePermission(role, ["PHAN_CONG_KHAO_SAT", "PCKS_K12"], "canUpdate").catch(() => false),
    ]);

  const campusIdSet = new Set<string>(
    Array.isArray(user.campusIds) ? user.campusIds.filter(Boolean) : []
  );
  for (const ca of campusAssignments || []) {
    if (ca?.campusId) campusIdSet.add(ca.campusId);
  }
  if (teacher?.campusId) {
    campusIdSet.add(teacher.campusId);
  }
  for (const c of allCampuses || []) {
    if (c.managerId === user.id) campusIdSet.add(c.id);
  }

  const campusIds = Array.from(campusIdSet);
  const campusCodes = (allCampuses || [])
    .filter((c) => campusIdSet.has(c.id))
    .map((c) => String(c.campusCode || "").toUpperCase())
    .filter(Boolean);

  const posCombined = `${teacher?.position || ""} ${teacher?.positions || ""} ${role}`.toUpperCase();
  const isDeptReviewerPos = ["QLCM", "TTCM", "TBP", "HT", "PHT"].some((k) =>
    posCombined.includes(k)
  );

  const isSystemWideAdmin = isSuper || isKtdbcl;
  const canManageConfig = isSystemWideAdmin || Boolean(permConfig);
  const canCoordinate = isSystemWideAdmin || isGdcsBgh || isGiaoVu || Boolean(permAssign);
  const canReviewAndLock =
    isSystemWideAdmin || isGdcsBgh || isDeptReviewerPos || Boolean(permReview);
  const canReopenLocked = isSystemWideAdmin || isGdcsBgh || Boolean(permReview);

  return {
    authenticated: true,
    userId: String(user.id),
    userName: String(teacher?.teacherName || user.name || user.fullName || user.email || "Cán bộ"),
    userEmail: String(user.email || ""),
    role,
    teacherId: teacher?.id || null,
    teacherPosition: teacher?.position || null,
    campusIds,
    campusCodes,
    isSystemWideAdmin,
    canManageConfig,
    canCoordinate,
    canReviewAndLock,
    canReopenLocked,
    isParent,
  };
}

/**
 * Kiểm tra xem học sinh khảo sát có thuộc phạm vi Cơ sở được cấp của Actor hay không
 */
export function isStudentInActorCampus(
  actor: PvdhActor,
  student: {
    admissionCampus?: string | null;
    registeredCampus?: string | null;
    campusId?: string | null;
    batch?: { campusId?: string | null; campus?: { id?: string; campusCode?: string | null } | null } | null;
    period?: { campusId?: string | null } | null;
  }
): boolean {
  if (actor.isSystemWideAdmin) return true;
  if (actor.campusIds.length === 0 && !isCampusScopedEntranceRole(actor.role)) {
    // Nếu không phải role giới hạn cơ sở nhưng là GV thì sẽ kiểm tra theo phân công cụ thể
    return false;
  }

  const candidateIds = [
    student.campusId,
    student.batch?.campusId,
    student.batch?.campus?.id,
    student.period?.campusId,
    student.admissionCampus,
    student.registeredCampus,
  ]
    .filter(Boolean)
    .map((x) => String(x).trim());

  const candidateCodes = [
    student.batch?.campus?.campusCode,
    student.admissionCampus,
    student.registeredCampus,
  ]
    .filter(Boolean)
    .map((x) => String(x).trim().toUpperCase());

  if (candidateIds.length === 0 && candidateCodes.length === 0) {
    // Hồ sơ chưa gắn cơ sở -> cho phép điều phối viên/kiểm tra được cấp quyền module
    return actor.canCoordinate || actor.canReviewAndLock;
  }

  for (const cid of candidateIds) {
    if (actor.campusIds.includes(cid)) return true;
  }
  for (const ccode of candidateCodes) {
    if (actor.campusCodes.some((ac) => ac === ccode || ccode.includes(ac))) return true;
  }
  return false;
}

export interface StudentPvdhAccessRights {
  allowedToRead: boolean;
  canEditStudentPart: boolean;
  canEditParentPart: boolean;
  canEditOrientationPart: boolean;
  canReviewLock: boolean;
  canReopen: boolean;
  canHandover: boolean;
  isGvcnViewer: boolean;
  canViewSensitiveHealth: boolean;
  denialReason?: string;
}

/**
 * Xác thực quyền truy cập mức bản ghi Hồ sơ phỏng vấn định hướng (Chống IDOR tuyệt đối)
 */
export async function resolveStudentPvdhAccess(params: {
  actor: PvdhActor;
  student: any;
  existingRecord?: {
    studentInterviewerUserId?: string | null;
    parentInterviewerUserId?: string | null;
  } | null;
}): Promise<StudentPvdhAccessRights> {
  const { actor, student, existingRecord } = params;

  const deny = (reason: string): StudentPvdhAccessRights => ({
    allowedToRead: false,
    canEditStudentPart: false,
    canEditParentPart: false,
    canEditOrientationPart: false,
    canReviewLock: false,
    canReopen: false,
    canHandover: false,
    isGvcnViewer: false,
    canViewSensitiveHealth: false,
    denialReason: reason,
  });

  if (!actor?.authenticated) {
    return deny("Phiên đăng nhập không hợp lệ.");
  }
  if (actor.isParent) {
    return deny("Tài khoản PHHS không được truy cập trực tiếp biểu mẫu nghiệp vụ nội bộ.");
  }
  if (!student?.id) {
    return deny("Không tìm thấy hồ sơ dự tuyển.");
  }

  // 1. Quản trị toàn hệ thống / Ban KT&ĐBCL
  if (actor.isSystemWideAdmin) {
    return {
      allowedToRead: true,
      canEditStudentPart: true,
      canEditParentPart: true,
      canEditOrientationPart: true,
      canReviewLock: true,
      canReopen: true,
      canHandover: true,
      isGvcnViewer: false,
      canViewSensitiveHealth: true,
    };
  }

  const inCampus = isStudentInActorCampus(actor, student);

  // 2. GĐCS / BGH / QLCM / TTCM / Giáo vụ thuộc đúng Cơ sở của hồ sơ
  if (inCampus && (actor.canReviewAndLock || actor.canCoordinate)) {
    return {
      allowedToRead: true,
      canEditStudentPart: actor.canReviewAndLock,
      canEditParentPart: actor.canReviewAndLock,
      canEditOrientationPart: actor.canReviewAndLock,
      canReviewLock: actor.canReviewAndLock,
      canReopen: actor.canReopenLocked,
      canHandover: actor.canCoordinate || actor.canReviewAndLock,
      isGvcnViewer: false,
      canViewSensitiveHealth: true,
    };
  }

  // 3. Kiểm tra phân công trực tiếp trên bản ghi PVDH (phân công tách HS / PHHS)
  const isDirectStudentInterviewer = Boolean(
    existingRecord?.studentInterviewerUserId &&
      existingRecord.studentInterviewerUserId === actor.userId
  );
  const isDirectParentInterviewer = Boolean(
    existingRecord?.parentInterviewerUserId &&
      existingRecord.parentInterviewerUserId === actor.userId
  );

  // 4. Kiểm tra phân công trên bảng InputAssessmentTeacherAssignment / InputAssessmentSessionExaminer
  let isAssignedOrientationTeacher = false;
  if (student.periodId) {
    const stGrade = normalizeK12GradeNumber(student.grade);
    const assignments = await prisma.inputAssessmentTeacherAssignment
      .findMany({
        where: {
          periodId: student.periodId,
          userId: actor.userId,
          ...(student.batchId ? { OR: [{ batchId: student.batchId }, { batchId: null }] } : {}),
        },
        include: { subject: true },
      })
      .catch(() => []);

    for (const a of assignments) {
      const aGrade = normalizeK12GradeNumber(a.grade);
      const gradeMatch = !a.grade || a.grade === "ALL" || a.grade === "Tất cả" || !stGrade || aGrade === stGrade;
      if (!gradeMatch) continue;

      const sCode = String(a.subject?.code || "").toUpperCase();
      const sName = String(a.subject?.name || "").toLowerCase().normalize("NFC");
      if (
        sCode === "PDHDV" ||
        sCode === "PVDH" ||
        sCode.startsWith("PVDH") ||
        sName.includes("định hướng") ||
        sName.includes("phỏng vấn")
      ) {
        isAssignedOrientationTeacher = true;
        break;
      }
    }

    if (!isAssignedOrientationTeacher && student.batchId) {
      const examiners = await (prisma as any).inputAssessmentSessionExaminer
        ?.findMany({
          where: {
            userId: actor.userId,
            session: {
              periodId: student.periodId,
              batchId: student.batchId,
            },
          },
        })
        .catch(() => []);

      for (const ex of examiners || []) {
        const sc = String(ex?.subjectCode || "").toUpperCase();
        if (sc === "PDHDV" || sc === "PVDH" || sc.includes("DINH_HUONG")) {
          isAssignedOrientationTeacher = true;
          break;
        }
      }
    }
  }

  if (isDirectStudentInterviewer || isDirectParentInterviewer || isAssignedOrientationTeacher) {
    // Nếu có gán tách riêng 2 người khác nhau cho HS và PHHS: mỗi người sửa đúng phần của mình
    const hasSplitStudent = Boolean(existingRecord?.studentInterviewerUserId);
    const hasSplitParent = Boolean(existingRecord?.parentInterviewerUserId);

    const canEditStudent = hasSplitStudent
      ? isDirectStudentInterviewer
      : isAssignedOrientationTeacher || isDirectStudentInterviewer;

    const canEditParent = hasSplitParent
      ? isDirectParentInterviewer
      : isAssignedOrientationTeacher || isDirectParentInterviewer;

    return {
      allowedToRead: true,
      canEditStudentPart: canEditStudent,
      canEditParentPart: canEditParent,
      canEditOrientationPart: canEditStudent || canEditParent,
      canReviewLock: false,
      canReopen: false,
      canHandover: false,
      isGvcnViewer: false,
      canViewSensitiveHealth: true,
    };
  }

  // 5. Kiểm tra GVCN lớp nhập học của học sinh (chỉ được xem bản bàn giao của đúng lớp mình chủ nhiệm)
  if (actor.teacherId) {
    const enrolledClassIds = new Set<string>();
    if (student.enrollmentClassId) enrolledClassIds.add(String(student.enrollmentClassId));

    const codeToCheck = student.enrollmentCode || student.studentCode;
    if (codeToCheck) {
      const enrolledStu = await prisma.student
        .findFirst({
          where: { studentCode: String(codeToCheck) },
          select: { classId: true },
        })
        .catch(() => null);
      if (enrolledStu?.classId) enrolledClassIds.add(enrolledStu.classId);
    }

    if (enrolledClassIds.size > 0) {
      const classIdsArr = Array.from(enrolledClassIds);
      const classes = await prisma.class
        .findMany({
          where: { id: { in: classIdsArr } },
          include: { teachers: true },
        })
        .catch(() => []);

      const isHomeroomOfStudent = classes.some((cls) => {
        const hrIds = String(cls.homeroomTeacherId || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (hrIds.includes(actor.teacherId!) || hrIds.includes(actor.userId)) return true;
        return (cls.teachers || []).some(
          (t) =>
            t.teacherId === actor.teacherId &&
            ["HOMEROOM", "GVCN"].includes(String(t.roleInClass || "").toUpperCase())
        );
      });

      if (isHomeroomOfStudent) {
        return {
          allowedToRead: true,
          canEditStudentPart: false,
          canEditParentPart: false,
          canEditOrientationPart: false,
          canReviewLock: false,
          canReopen: false,
          canHandover: false,
          isGvcnViewer: true,
          canViewSensitiveHealth: true,
        };
      }
    }
  }

  return deny("Tài khoản không thuộc phân công khảo sát, cơ sở hoặc lớp chủ nhiệm của học sinh này.");
}

/**
 * Tách lọc dữ liệu nhạy cảm trên Server trước khi trả về Client theo quyền người xem
 */
export function sanitizePvdhRecordForViewer(
  record: Record<string, any> | null,
  rights: StudentPvdhAccessRights & { includeSensitiveInHandover?: boolean }
): Record<string, any> | null {
  if (!record) return null;
  const clone: Record<string, any> = { ...record };

  // Nếu người xem không có quyền xem thông tin nhạy cảm hoặc là bản bàn giao không tích chia sẻ nội bộ nhạy cảm
  if (!rights.canViewSensitiveHealth || (rights.isGvcnViewer && rights.includeSensitiveInHandover === false)) {
    delete clone.internalSensitiveNotes;
  }

  return clone;
}
