import crypto from "crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStudentSession } from "@/lib/student-session";
import { ensureNotificationCenterTables } from "./schemaInit";
import {
  AUTOMATED_EXAM_EVENTS,
  AutomatedExamEventType,
  BUILTIN_NOTIFICATION_TEMPLATES,
  NotificationCategoryCode,
  NotificationPriorityCode,
  NotificationSubTypeCode,
  NotificationWorkflowStatus,
  sanitizeNotificationHtml,
  validateNotificationAttachment,
} from "./constants";
import { dispatchToChannels, NotificationChannelType } from "./channelAdapters";

export class NotificationCenterError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "NotificationCenterError";
    this.code = code;
    this.status = status;
  }
}

export interface LinkedChildProfile {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  grade: string;
  campusId: string;
  campusName: string;
  relationship: string;
}

export interface SubjectTeachingScope {
  classId: string;
  className: string;
  grade: string;
  campusId: string;
  subjectId: string;
  subjectName: string;
}

export interface NotificationActorContext {
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isKTDBCL: boolean;
  isTeacher: boolean;
  isGVCN: boolean;
  isGVBM: boolean;
  isParent: boolean;
  isStudent: boolean;
  allowedCampusIds: string[];
  teacherId: string | null;
  homeroomClassIds: string[];
  subjectAssignments: SubjectTeachingScope[];
  parentId: string | null;
  linkedStudents: LinkedChildProfile[];
  studentProfile: LinkedChildProfile | null;
}

function generateNotificationCode(prefix = "TB"): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function stripHtmlToPlainText(html: string, maxLength = 220): string {
  const plain = (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1)}…`;
}

/**
 * Resolves the authenticated actor context from NextAuth session or Student Portal session.
 */
export async function resolveNotificationActorContext(): Promise<NotificationActorContext> {
  await ensureNotificationCenterTables();

  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    const user = session.user as any;
    const userId = String(user.id);
    const userEmail = String(user.email || "");
    const userName = String(user.fullName || user.name || userEmail || "Người dùng SSM");
    const rawRole = String(user.role || "TEACHER").toUpperCase();

    const isSuperAdmin = rawRole === "SUPER_ADMIN";
    const isKTDBCL =
      isSuperAdmin ||
      rawRole === "KT_DBCL" ||
      rawRole === "KTDBCL" ||
      rawRole.includes("KTDBCL") ||
      rawRole.includes("KHAO_THI");
    const isAdmin =
      isSuperAdmin ||
      isKTDBCL ||
      rawRole === "ADMIN" ||
      rawRole === "BGH" ||
      rawRole === "GDCS" ||
      rawRole === "HIEU_TRUONG";
    const isParent = rawRole === "PARENT";
    const isTeacher = !isParent && (rawRole === "TEACHER" || rawRole === "GVCN" || rawRole === "GVBM" || isAdmin);

    let teacherId: string | null = null;
    const homeroomClassSet = new Set<string>();
    const subjectAssignments: SubjectTeachingScope[] = [];
    const allowedCampusSet = new Set<string>();

    if (isAdmin) {
      const campuses = await prisma.campus.findMany({ select: { id: true } }).catch(() => []);
      for (const c of campuses) allowedCampusSet.add(c.id);
    }

    const teacher = await prisma.teacher
      .findFirst({
        where: {
          OR: [{ userId }, ...(userEmail ? [{ email: userEmail }] : [])],
        },
      })
      .catch(() => null);

    if (teacher) {
      teacherId = teacher.id;
      if (teacher.campusId) allowedCampusSet.add(teacher.campusId);

      const [directHrClasses, assignedHrLinks, moetAssigns] = await Promise.all([
        prisma.class
          .findMany({
            where: { homeroomTeacherId: teacher.id },
            select: { id: true, campusId: true },
          })
          .catch(() => []),
        prisma.teacherClassAssignment
          .findMany({
            where: {
              teacherId: teacher.id,
              status: "ACTIVE",
              roleInClass: { in: ["GVCN", "HOMEROOM", "CHU_NHIEM"] },
            },
            select: { classId: true },
          })
          .catch(() => []),
        prisma.teachingAssignment
          .findMany({
            where: { teacherId: teacher.id },
            include: {
              class: { include: { campus: true } },
              subject: true,
            },
          })
          .catch(() => []),
      ]);

      for (const c of directHrClasses) {
        homeroomClassSet.add(c.id);
        if (c.campusId) allowedCampusSet.add(c.campusId);
      }
      for (const l of assignedHrLinks) {
        homeroomClassSet.add(l.classId);
      }
      for (const a of moetAssigns) {
        if (a.class && a.subject) {
          subjectAssignments.push({
            classId: a.classId,
            className: a.class.className,
            grade: a.class.grade,
            campusId: a.class.campusId,
            subjectId: a.subjectId,
            subjectName: a.subject.subjectName,
          });
          if (a.class.campusId) allowedCampusSet.add(a.class.campusId);
        }
      }
    }

    let parentId: string | null = null;
    const linkedStudents: LinkedChildProfile[] = [];

    if (isParent) {
      const parent = await prisma.parent
        .findFirst({
          where: {
            OR: [{ userId }, ...(userEmail ? [{ email: userEmail }] : [])],
          },
          include: {
            students: {
              where: { status: "ACTIVE" },
              include: {
                student: {
                  include: {
                    class: true,
                    campus: true,
                  },
                },
              },
            },
          },
        })
        .catch(() => null);

      if (parent) {
        parentId = parent.id;
        for (const link of parent.students || []) {
          if (!link.student) continue;
          linkedStudents.push({
            studentId: link.student.id,
            studentCode: link.student.studentCode,
            studentName: link.student.studentName,
            classId: link.student.classId,
            className: link.student.class?.className || "",
            grade: link.student.class?.grade || "",
            campusId: link.student.campusId,
            campusName: link.student.campus?.campusName || "",
            relationship: link.relationship || "PHHS",
          });
        }
      }
    }

    const homeroomClassIds = Array.from(homeroomClassSet);
    return {
      userId,
      userEmail,
      userName,
      role: isKTDBCL ? "KT_DBCL" : isAdmin ? "ADMIN" : isParent ? "PARENT" : homeroomClassIds.length > 0 ? "GVCN" : "GVBM",
      isSuperAdmin,
      isAdmin,
      isKTDBCL,
      isTeacher,
      isGVCN: homeroomClassIds.length > 0,
      isGVBM: subjectAssignments.length > 0,
      isParent,
      isStudent: false,
      allowedCampusIds: Array.from(allowedCampusSet),
      teacherId,
      homeroomClassIds,
      subjectAssignments,
      parentId,
      linkedStudents,
      studentProfile: null,
    };
  }

  // Fallback: Check Student Portal session (`hs_token`)
  const studentSess = await getStudentSession().catch(() => null);
  if (studentSess?.studentId) {
    const student = await prisma.student
      .findUnique({
        where: { id: studentSess.studentId },
        include: { class: true, campus: true },
      })
      .catch(() => null);

    const profile: LinkedChildProfile = {
      studentId: student?.id || studentSess.studentId,
      studentCode: student?.studentCode || studentSess.studentCode || "",
      studentName: student?.studentName || studentSess.studentName || "Học sinh",
      classId: student?.classId || "",
      className: student?.class?.className || studentSess.className || "",
      grade: student?.class?.grade || "",
      campusId: student?.campusId || "",
      campusName: student?.campus?.campusName || studentSess.campusName || "",
      relationship: "SELF",
    };

    return {
      userId: `STUDENT:${profile.studentId}`,
      userEmail: "",
      userName: profile.studentName,
      role: "STUDENT",
      isSuperAdmin: false,
      isAdmin: false,
      isKTDBCL: false,
      isTeacher: false,
      isGVCN: false,
      isGVBM: false,
      isParent: false,
      isStudent: true,
      allowedCampusIds: profile.campusId ? [profile.campusId] : [],
      teacherId: null,
      homeroomClassIds: [],
      subjectAssignments: [],
      parentId: null,
      linkedStudents: [profile],
      studentProfile: profile,
    };
  }

  throw new NotificationCenterError("UNAUTHORIZED", "Vui lòng đăng nhập để truy cập Trung tâm Thông báo.", 401);
}

/**
 * Validates that a sender has permission to create/publish a notification for the given category, subType, classes, and subject.
 */
export function assertSenderPermissions(
  ctx: NotificationActorContext,
  params: {
    category: NotificationCategoryCode;
    subType: NotificationSubTypeCode;
    classIds?: string[];
    subjectId?: string | null;
    action: "SAVE_DRAFT" | "SUBMIT_APPROVAL" | "PUBLISH" | "SCHEDULE";
  }
) {
  if (ctx.isParent || ctx.isStudent) {
    throw new NotificationCenterError(
      "FORBIDDEN_SENDER_ROLE",
      "Tài khoản Phụ huynh / Học sinh không có quyền phát hành thông báo.",
      403
    );
  }

  // Teachers (GVCN/GVBM) cannot publish official exam schedule changes or unapproved exam scores
  if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin) {
    const restrictedSubTypes: NotificationSubTypeCode[] = [
      "EXAM_SCHEDULE_CHANGE",
      "EXAM_MAKEUP",
      "EXAM_RESULT",
      "EXAM_ABSENT",
    ];
    if (params.category === "ACADEMIC_RESULT" || restrictedSubTypes.includes(params.subType)) {
      throw new NotificationCenterError(
        "FORBIDDEN_EXAM_AUTHORITY",
        "Giáo viên không được phép tự ý phát hành kết quả điểm kiểm tra hoặc thay đổi lịch kiểm tra chính thức.",
        403
      );
    }

    const requestedClasses = params.classIds || [];
    if (requestedClasses.length === 0) {
      throw new NotificationCenterError(
        "CLASS_SCOPE_REQUIRED",
        "Giáo viên cần chọn lớp học nằm trong phạm vi phân công giảng dạy hoặc chủ nhiệm.",
        400
      );
    }

    // Check if GVCN vs GVBM scope
    const isGvcnSubType = params.subType.startsWith("GVCN_");
    if (isGvcnSubType) {
      for (const cid of requestedClasses) {
        if (!ctx.homeroomClassIds.includes(cid)) {
          throw new NotificationCenterError(
            "FORBIDDEN_HOMEROOM_SCOPE",
            "Bạn chỉ được gửi thông báo chủ nhiệm đến lớp mình làm Giáo viên Chủ nhiệm.",
            403
          );
        }
      }
    } else {
      // GVBM or general teacher notification: must be either homeroom class OR assigned teaching class (+ matching subject if subjectId specified)
      for (const cid of requestedClasses) {
        const isHomeroom = ctx.homeroomClassIds.includes(cid);
        const matchesSubjectAssign = ctx.subjectAssignments.some(
          (a) => a.classId === cid && (!params.subjectId || a.subjectId === params.subjectId)
        );
        if (!isHomeroom && !matchesSubjectAssign) {
          throw new NotificationCenterError(
            "FORBIDDEN_TEACHING_SCOPE",
            "Giáo viên chỉ được gửi thông báo đến lớp và môn học nằm trong phạm vi phân công trên SSM.",
            403
          );
        }
      }
    }
  }
}

export interface CreateOrUpdateNotificationInput {
  id?: string;
  category: NotificationCategoryCode;
  subType?: NotificationSubTypeCode;
  title: string;
  summary?: string;
  contentHtml: string;
  priority?: NotificationPriorityCode;
  senderUnit?: string;
  academicYearId?: string | null;
  campusId?: string | null;
  gradeLevels?: string | null;
  classIds?: string[];
  studentIds?: string[];
  subjectId?: string | null;
  subjectName?: string | null;
  testingPeriodId?: string | null;
  testingSubjectExamId?: string | null;
  testingSessionId?: string | null;
  beforeChangeJson?: Record<string, any> | null;
  afterChangeJson?: Record<string, any> | null;
  deepLink?: string | null;
  targetRoles?: Array<"PARENT" | "STUDENT" | "TEACHER">;
  requireAcknowledge?: boolean;
  acknowledgeDeadline?: string | Date | null;
  allowReply?: boolean;
  requiresApproval?: boolean;
  scheduledAt?: string | Date | null;
  attachments?: Array<{
    fileName: string;
    fileType?: string;
    fileSize?: number;
    fileUrl: string;
  }>;
  action?: "SAVE_DRAFT" | "SUBMIT_APPROVAL" | "PUBLISH" | "SCHEDULE";
  channels?: NotificationChannelType[];
  simulateChannelFailure?: NotificationChannelType[];
  idempotencyKey?: string;
}

/**
 * Resolves the target recipients (Parents, Students, Teachers) from real SSM database relations
 * based on classIds, campusId, gradeLevels, or explicit studentIds.
 */
async function resolveTargetRecipients(params: {
  campusId?: string | null;
  gradeLevels?: string | null;
  classIds?: string[];
  studentIds?: string[];
  targetRoles: Array<"PARENT" | "STUDENT" | "TEACHER">;
  sessionRosterMetaMap?: Map<string, Record<string, any>>;
}) {
  const whereStudent: any = { status: "ACTIVE" };
  if (params.studentIds && params.studentIds.length > 0) {
    whereStudent.id = { in: params.studentIds };
  } else if (params.classIds && params.classIds.length > 0) {
    whereStudent.classId = { in: params.classIds };
  } else {
    if (params.campusId) whereStudent.campusId = params.campusId;
    if (params.gradeLevels) {
      const grades = params.gradeLevels
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      if (grades.length > 0) {
        whereStudent.class = { grade: { in: grades } };
      }
    }
  }

  const students = await prisma.student
    .findMany({
      where: whereStudent,
      include: {
        class: true,
        campus: true,
        parents: {
          where: { status: "ACTIVE" },
          include: {
            parent: true,
          },
        },
      },
    })
    .catch(() => []);

  const recipientRows: Array<{
    recipientUserId: string;
    recipientRole: "PARENT" | "STUDENT" | "TEACHER";
    recipientName: string;
    recipientEmail: string | null;
    studentId: string | null;
    studentName: string | null;
    studentCode: string | null;
    classId: string | null;
    className: string | null;
    gradeLevel: string | null;
    campusId: string | null;
    campusName: string | null;
    personalMetaJson: string | null;
  }> = [];

  const dedupKeySet = new Set<string>();

  for (const st of students) {
    const personalMeta = params.sessionRosterMetaMap?.get(st.id)
      ? JSON.stringify(params.sessionRosterMetaMap.get(st.id))
      : null;

    if (params.targetRoles.includes("PARENT")) {
      for (const pLink of st.parents || []) {
        const p = pLink.parent;
        if (!p || !p.userId) continue;
        const key = `${p.userId}::${st.id}`;
        if (dedupKeySet.has(key)) continue;
        dedupKeySet.add(key);

        recipientRows.push({
          recipientUserId: p.userId,
          recipientRole: "PARENT",
          recipientName: p.parentName,
          recipientEmail: p.email || null,
          studentId: st.id,
          studentName: st.studentName,
          studentCode: st.studentCode,
          classId: st.classId,
          className: st.class?.className || "",
          gradeLevel: st.class?.grade || "",
          campusId: st.campusId,
          campusName: st.campus?.campusName || "",
          personalMetaJson: personalMeta,
        });
      }
    }

    if (params.targetRoles.includes("STUDENT")) {
      const stuUserKey = `STUDENT:${st.id}`;
      const key = `${stuUserKey}::${st.id}`;
      if (!dedupKeySet.has(key)) {
        dedupKeySet.add(key);
        recipientRows.push({
          recipientUserId: stuUserKey,
          recipientRole: "STUDENT",
          recipientName: st.studentName,
          recipientEmail: (st as any).email || null,
          studentId: st.id,
          studentName: st.studentName,
          studentCode: st.studentCode,
          classId: st.classId,
          className: st.class?.className || "",
          gradeLevel: st.class?.grade || "",
          campusId: st.campusId,
          campusName: st.campus?.campusName || "",
          personalMetaJson: personalMeta,
        });
      }
    }
  }

  return recipientRows;
}

/**
 * Automatically pulls exam schedule, room, time, format, and LMS link from SSM Digital Testing tables.
 */
export async function pullExamScheduleMetadata(params: {
  testingPeriodId?: string | null;
  testingSubjectExamId?: string | null;
  testingSessionId?: string | null;
}) {
  let period: any = null;
  let subjectExam: any = null;
  let session: any = null;
  let subject: any = null;

  if (params.testingPeriodId) {
    period = await prisma.testingPeriod
      .findUnique({ where: { id: params.testingPeriodId } })
      .catch(() => null);
  }
  if (params.testingSubjectExamId) {
    subjectExam = await prisma.testingSubjectExam
      .findUnique({ where: { id: params.testingSubjectExamId } })
      .catch(() => null);
    if (subjectExam?.subjectId) {
      subject = await prisma.subject
        .findUnique({ where: { id: subjectExam.subjectId } })
        .catch(() => null);
    }
    if (!period && subjectExam?.periodId) {
      period = await prisma.testingPeriod
        .findUnique({ where: { id: subjectExam.periodId } })
        .catch(() => null);
    }
  }
  if (params.testingSessionId) {
    session = await prisma.testingSession
      .findUnique({ where: { id: params.testingSessionId } })
      .catch(() => null);
  } else if (subjectExam?.id) {
    session = await prisma.testingSession
      .findFirst({ where: { subjectExamId: subjectExam.id } })
      .catch(() => null);
  }

  if (!period && !subjectExam && !session) {
    return null;
  }

  const examFormat = subjectExam?.examFormat || "PAPER_OMR";
  const examFormatLabel =
    examFormat === "LMS_MOODLE"
      ? "Trực tuyến trên LMS Sky-Line"
      : examFormat === "HYBRID"
      ? "Kết hợp Trắc nghiệm LMS & Tự luận trên giấy"
      : "Làm bài trên Phiếu trả lời trắc nghiệm OMR / Giấy";

  const lmsUrl =
    subjectExam?.moodleQuizId || subjectExam?.moodleCmId
      ? `/hocsinh/portal?lmsQuizId=${subjectExam.moodleQuizId || subjectExam.moodleCmId}`
      : null;

  return {
    periodId: period?.id || null,
    periodCode: period?.code || "",
    periodName: period?.name || "Kỳ kiểm tra định kỳ",
    semester: period?.semester || "HK1",
    examType: period?.examType || "MIDTERM",
    isMakeup: Boolean(period?.isMakeup),
    subjectExamId: subjectExam?.id || null,
    subjectId: subjectExam?.subjectId || subject?.id || null,
    subjectName: subject?.subjectName || "Môn kiểm tra",
    gradeLevel: subjectExam?.gradeLevel || period?.gradeLevels || "",
    durationMinutes: subjectExam?.durationMinutes || 60,
    examFormat,
    examFormatLabel,
    lmsUrl,
    sessionId: session?.id || null,
    classId: session?.classId || null,
    roomName: session?.roomName || "Phòng kiểm tra theo danh sách niêm yết",
    examDate: session?.examDate ? new Date(session.examDate).toISOString() : period?.startDate ? new Date(period.startDate).toISOString() : null,
    startTime: session?.startTime || "07:30",
    endTime: session?.endTime || "08:30",
  };
}

/**
 * Creates or updates a notification draft, submits for approval, schedules, or publishes immediately.
 */
export async function createOrPublishNotification(
  ctx: NotificationActorContext,
  input: CreateOrUpdateNotificationInput
) {
  await ensureNotificationCenterTables();

  const subType: NotificationSubTypeCode =
    input.subType ||
    (input.category === "EXAM"
      ? "EXAM_SCHEDULE"
      : input.category === "TEACHER"
      ? ctx.isGVCN
        ? "GVCN_ANNOUNCEMENT"
        : "GVBM_STUDY_GUIDE"
      : input.category === "ACADEMIC_RESULT"
      ? "EXAM_RESULT"
      : "SYSTEM_ANNOUNCEMENT");

  const action = input.action || "SAVE_DRAFT";

  assertSenderPermissions(ctx, {
    category: input.category,
    subType,
    classIds: input.classIds,
    subjectId: input.subjectId,
    action,
  });

  const cleanTitle = sanitizeNotificationHtml(input.title || "").trim();
  const cleanHtml = sanitizeNotificationHtml(input.contentHtml || "").trim();

  if (!cleanTitle) {
    throw new NotificationCenterError("INVALID_TITLE", "Tiêu đề thông báo không được để trống.");
  }
  if (!cleanHtml) {
    throw new NotificationCenterError("INVALID_CONTENT", "Nội dung thông báo không được để trống.");
  }

  // Validate attachments for security
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      const check = validateNotificationAttachment(att);
      if (!check.valid) {
        throw new NotificationCenterError("UNSAFE_ATTACHMENT", check.reason || "Tệp đính kèm không hợp lệ.");
      }
    }
  }

  // Check idempotencyKey if provided
  if (input.idempotencyKey) {
    const existingByKey = await prisma.ssmNotification.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { attachments: true },
    });
    if (existingByKey) {
      return {
        notification: existingByKey,
        deduplicated: true,
      };
    }
  }

  const examMeta = await pullExamScheduleMetadata({
    testingPeriodId: input.testingPeriodId,
    testingSubjectExamId: input.testingSubjectExamId,
    testingSessionId: input.testingSessionId,
  });

  const classIds =
    input.classIds && input.classIds.length > 0
      ? input.classIds
      : examMeta?.classId
      ? [examMeta.classId]
      : [];

  const priority: NotificationPriorityCode = input.priority || "NORMAL";

  // Important/Urgent exam notifications require approval if configured or if submitted for approval
  const requiresApproval =
    input.requiresApproval ??
    (input.category === "EXAM" && (priority === "URGENT" || subType === "EXAM_SCHEDULE_CHANGE"));

  let targetStatus: NotificationWorkflowStatus = "DRAFT";
  if (action === "SUBMIT_APPROVAL") {
    targetStatus = "PENDING_APPROVAL";
  } else if (action === "SCHEDULE") {
    if (requiresApproval && !ctx.isKTDBCL && !ctx.isAdmin) {
      targetStatus = "PENDING_APPROVAL";
    } else {
      targetStatus = "SCHEDULED";
    }
  } else if (action === "PUBLISH") {
    if (requiresApproval && !ctx.isKTDBCL && !ctx.isAdmin && input.requiresApproval === true) {
      targetStatus = "PENDING_APPROVAL";
    } else {
      targetStatus = "PUBLISHED";
    }
  }

  const senderUnit =
    input.senderUnit ||
    (ctx.isKTDBCL
      ? "Ban KT&ĐBCL"
      : ctx.isAdmin
      ? "Ban Giám hiệu"
      : ctx.isGVCN
      ? "Giáo viên Chủ nhiệm"
      : "Giáo viên Bộ môn");

  const summary = (input.summary || "").trim() || stripHtmlToPlainText(cleanHtml, 200);
  const targetRoles = input.targetRoles && input.targetRoles.length > 0 ? input.targetRoles : ["PARENT", "STUDENT"];
  const now = new Date();

  const notificationId = input.id || crypto.randomUUID();
  const code = generateNotificationCode(input.category === "EXAM" ? "TBKT" : input.category === "TEACHER" ? "TBGV" : "TB");

  const deepLink =
    input.deepLink ||
    (input.category === "ACADEMIC_RESULT"
      ? "/parent/grades"
      : "/parent/thong-bao");

  const created = await prisma.ssmNotification.create({
    data: {
      id: notificationId,
      code,
      category: input.category,
      subType,
      title: cleanTitle,
      summary,
      contentHtml: cleanHtml,
      priority,
      senderUnit,
      senderUserId: ctx.userId,
      senderName: ctx.userName,
      senderRole: ctx.role,
      academicYearId: input.academicYearId || null,
      campusId: input.campusId || null,
      gradeLevels: input.gradeLevels || examMeta?.gradeLevel || null,
      classIdsJson: classIds.length > 0 ? JSON.stringify(classIds) : null,
      subjectId: input.subjectId || examMeta?.subjectId || null,
      subjectName: input.subjectName || examMeta?.subjectName || null,
      testingPeriodId: input.testingPeriodId || examMeta?.periodId || null,
      testingPeriodName: examMeta?.periodName || null,
      testingSubjectExamId: input.testingSubjectExamId || examMeta?.subjectExamId || null,
      testingSessionId: input.testingSessionId || examMeta?.sessionId || null,
      examScheduleMetaJson: examMeta ? JSON.stringify(examMeta) : null,
      beforeChangeJson: input.beforeChangeJson ? JSON.stringify(input.beforeChangeJson) : null,
      afterChangeJson: input.afterChangeJson ? JSON.stringify(input.afterChangeJson) : null,
      deepLink,
      targetRolesJson: JSON.stringify(targetRoles),
      status: targetStatus,
      requiresApproval,
      requireAcknowledge: Boolean(input.requireAcknowledge),
      acknowledgeDeadline: input.acknowledgeDeadline ? new Date(input.acknowledgeDeadline) : null,
      allowReply: Boolean(input.allowReply),
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      publishedAt: targetStatus === "PUBLISHED" ? now : null,
      idempotencyKey: input.idempotencyKey || null,
    },
  });

  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      await prisma.ssmNotificationAttachment.create({
        data: {
          id: crypto.randomUUID(),
          notificationId: created.id,
          fileName: att.fileName,
          fileType: att.fileType || "application/octet-stream",
          fileSize: att.fileSize || 0,
          fileUrl: att.fileUrl,
          uploadedByUserId: ctx.userId,
          isSafe: true,
        },
      });
    }
  }

  if (targetStatus === "PENDING_APPROVAL") {
    await prisma.ssmNotificationApproval.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: created.id,
        stepOrder: 1,
        approverRole: "KT_DBCL",
        status: "PENDING",
      },
    });
  }

  await prisma.ssmNotificationAuditLog.create({
    data: {
      id: crypto.randomUUID(),
      notificationId: created.id,
      actorUserId: ctx.userId,
      actorName: ctx.userName,
      actorRole: ctx.role,
      action: action === "PUBLISH" ? "PUBLISH" : action === "SUBMIT_APPROVAL" ? "SUBMIT_APPROVAL" : "CREATE_DRAFT",
      fromStatus: null,
      toStatus: targetStatus,
      afterJson: JSON.stringify({ title: cleanTitle, category: input.category, subType, classIds }),
    },
  });

  if (targetStatus === "PUBLISHED") {
    const dispatched = await distributePublishedNotification(created.id, {
      studentIds: input.studentIds,
      channels: input.channels,
      simulateChannelFailure: input.simulateChannelFailure,
    });
    return {
      notification: dispatched,
      deduplicated: false,
    };
  }

  return {
    notification: created,
    deduplicated: false,
  };
}

/**
 * Distributes a PUBLISHED notification to its resolved recipients and records per-channel deliveries.
 */
export async function distributePublishedNotification(
  notificationId: string,
  options?: {
    studentIds?: string[];
    sessionRosterMetaMap?: Map<string, Record<string, any>>;
    channels?: NotificationChannelType[];
    simulateChannelFailure?: NotificationChannelType[];
  }
) {
  const notif = await prisma.ssmNotification.findUnique({
    where: { id: notificationId },
  });
  if (!notif) {
    throw new NotificationCenterError("NOT_FOUND", "Không tìm thấy thông báo.", 404);
  }

  const classIds: string[] = notif.classIdsJson ? JSON.parse(notif.classIdsJson) : [];
  const targetRoles: Array<"PARENT" | "STUDENT" | "TEACHER"> = notif.targetRolesJson
    ? JSON.parse(notif.targetRolesJson)
    : ["PARENT", "STUDENT"];

  const recipients = await resolveTargetRecipients({
    campusId: notif.campusId,
    gradeLevels: notif.gradeLevels,
    classIds,
    studentIds: options?.studentIds,
    targetRoles,
    sessionRosterMetaMap: options?.sessionRosterMetaMap,
  });

  let sentSuccessCount = 0;
  let sentFailedCount = 0;
  let anyAuxChannelFailed = false;
  const now = new Date();

  for (const r of recipients) {
    const recipientId = crypto.randomUUID();
    const dispatchRes = await dispatchToChannels(
      {
        notificationId: notif.id,
        recipientId,
        recipientUserId: r.recipientUserId,
        recipientRole: r.recipientRole,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        studentId: r.studentId,
        studentName: r.studentName,
        title: notif.title,
        summary: notif.summary || notif.title,
        priority: notif.priority,
        category: notif.category,
        deepLink:
          r.recipientRole === "STUDENT"
            ? "/hocsinh/portal/thong-bao"
            : "/parent/thong-bao",
        simulateChannelFailure: options?.simulateChannelFailure,
      },
      options?.channels || ["IN_APP", "MOBILE_WEB"]
    );

    if (dispatchRes.anyChannelFailed) {
      anyAuxChannelFailed = true;
    }

    const deliveryStatus = dispatchRes.primaryDelivered ? "SENT" : "FAILED";
    if (deliveryStatus === "SENT") {
      sentSuccessCount++;
    } else {
      sentFailedCount++;
    }

    await prisma.ssmNotificationRecipient.create({
      data: {
        id: recipientId,
        notificationId: notif.id,
        recipientUserId: r.recipientUserId,
        recipientRole: r.recipientRole,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        studentId: r.studentId,
        studentName: r.studentName,
        studentCode: r.studentCode,
        classId: r.classId,
        className: r.className,
        gradeLevel: r.gradeLevel,
        campusId: r.campusId,
        campusName: r.campusName,
        deliveryStatus,
        deliveredAt: deliveryStatus === "SENT" ? now : null,
        isRead: false,
        isAcknowledged: false,
        personalMetaJson: r.personalMetaJson,
      },
    });
  }

  const finalStatus: NotificationWorkflowStatus =
    sentFailedCount > 0 || anyAuxChannelFailed ? "PARTIALLY_FAILED" : "PUBLISHED";

  return prisma.ssmNotification.update({
    where: { id: notif.id },
    data: {
      status: finalStatus,
      publishedAt: notif.publishedAt || now,
      totalRecipients: recipients.length,
      sentSuccessCount,
      sentFailedCount,
      updatedAt: now,
    },
  });
}

/**
 * Transitions a notification through workflow states:
 * SUBMIT_APPROVAL, APPROVE, REJECT, PUBLISH, CANCEL, RECALL, REMIND_UNREAD.
 */
export async function transitionNotificationWorkflow(
  ctx: NotificationActorContext,
  params: {
    notificationId: string;
    action: "SUBMIT_APPROVAL" | "APPROVE" | "REJECT" | "PUBLISH" | "CANCEL" | "RECALL" | "REMIND_UNREAD";
    comment?: string;
    amendedTitle?: string;
    amendedContentHtml?: string;
  }
) {
  await ensureNotificationCenterTables();

  const existing = await prisma.ssmNotification.findUnique({
    where: { id: params.notificationId },
  });
  if (!existing) {
    throw new NotificationCenterError("NOT_FOUND", "Không tìm thấy thông báo.", 404);
  }

  const now = new Date();

  if (params.action === "REMIND_UNREAD") {
    // Allow sender, KT&ĐBCL, Admin, or Homeroom teacher of the class to remind unread recipients
    const canRemind =
      ctx.isKTDBCL ||
      ctx.isAdmin ||
      existing.senderUserId === ctx.userId ||
      ctx.isGVCN;
    if (!canRemind) {
      throw new NotificationCenterError("FORBIDDEN", "Bạn không có quyền gửi nhắc nhở thông báo này.", 403);
    }

    const unreadFilter: any = {
      notificationId: existing.id,
      isRead: false,
    };
    if (!ctx.isKTDBCL && !ctx.isAdmin && ctx.isGVCN && existing.senderUserId !== ctx.userId) {
      unreadFilter.classId = { in: ctx.homeroomClassIds };
    }

    const unreadList = await prisma.ssmNotificationRecipient.findMany({
      where: unreadFilter,
    });

    for (const r of unreadList) {
      await prisma.ssmNotificationRecipient.update({
        where: { id: r.id },
        data: {
          remindedCount: (r.remindedCount || 0) + 1,
          lastRemindedAt: now,
        },
      });
    }

    await prisma.ssmNotificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: existing.id,
        actorUserId: ctx.userId,
        actorName: ctx.userName,
        actorRole: ctx.role,
        action: "REMIND_UNREAD",
        fromStatus: existing.status,
        toStatus: existing.status,
        note: `Đã gửi nhắc nhở cho ${unreadList.length} người nhận chưa đọc.`,
      },
    });

    return {
      notification: existing,
      remindedCount: unreadList.length,
    };
  }

  if (params.action === "APPROVE" || params.action === "REJECT") {
    if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin) {
      throw new NotificationCenterError(
        "FORBIDDEN_APPROVAL",
        "Chỉ Ban KT&ĐBCL hoặc Ban Giám hiệu mới có quyền phê duyệt thông báo.",
        403
      );
    }

    const nextStatus: NotificationWorkflowStatus =
      params.action === "APPROVE" ? "PUBLISHED" : "DRAFT";

    await prisma.ssmNotificationApproval.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: existing.id,
        stepOrder: 1,
        approverUserId: ctx.userId,
        approverName: ctx.userName,
        approverRole: ctx.role,
        status: params.action === "APPROVE" ? "APPROVED" : "REJECTED",
        comment: params.comment || null,
        decidedAt: now,
      },
    });

    await prisma.ssmNotificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: existing.id,
        actorUserId: ctx.userId,
        actorName: ctx.userName,
        actorRole: ctx.role,
        action: params.action,
        fromStatus: existing.status,
        toStatus: nextStatus,
        note: params.comment || null,
      },
    });

    if (params.action === "APPROVE") {
      await prisma.ssmNotification.update({
        where: { id: existing.id },
        data: { status: "PUBLISHED", publishedAt: now, updatedAt: now },
      });
      const distributed = await distributePublishedNotification(existing.id);
      return { notification: distributed };
    }

    const rejected = await prisma.ssmNotification.update({
      where: { id: existing.id },
      data: { status: "DRAFT", updatedAt: now },
    });
    return { notification: rejected };
  }

  if (params.action === "RECALL" || params.action === "CANCEL") {
    const canRecall =
      ctx.isKTDBCL ||
      ctx.isAdmin ||
      existing.senderUserId === ctx.userId;
    if (!canRecall) {
      throw new NotificationCenterError(
        "FORBIDDEN_RECALL",
        "Bạn không có quyền thu hồi hoặc hủy thông báo này.",
        403
      );
    }

    const nextStatus: NotificationWorkflowStatus =
      params.action === "RECALL" ? "RECALLED" : "CANCELLED";

    const updated = await prisma.ssmNotification.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        recalledAt: now,
        recallReason: params.comment || "Thu hồi / đính chính theo quy trình nghiệp vụ",
        title: params.amendedTitle ? sanitizeNotificationHtml(params.amendedTitle) : existing.title,
        contentHtml: params.amendedContentHtml
          ? sanitizeNotificationHtml(params.amendedContentHtml)
          : existing.contentHtml,
        updatedAt: now,
      },
    });

    await prisma.ssmNotificationRecipient.updateMany({
      where: { notificationId: existing.id },
      data: { deliveryStatus: "RECALLED", updatedAt: now },
    });

    await prisma.ssmNotificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: existing.id,
        actorUserId: ctx.userId,
        actorName: ctx.userName,
        actorRole: ctx.role,
        action: params.action,
        fromStatus: existing.status,
        toStatus: nextStatus,
        beforeJson: JSON.stringify({ title: existing.title, status: existing.status }),
        afterJson: JSON.stringify({
          title: updated.title,
          status: updated.status,
          recallReason: updated.recallReason,
        }),
        note: params.comment || "Thu hồi thông báo",
      },
    });

    return { notification: updated };
  }

  if (params.action === "PUBLISH") {
    if (existing.requiresApproval && !ctx.isKTDBCL && !ctx.isAdmin) {
      throw new NotificationCenterError(
        "APPROVAL_REQUIRED",
        "Thông báo này cần được phê duyệt trước khi phát hành.",
        403
      );
    }

    await prisma.ssmNotification.update({
      where: { id: existing.id },
      data: { status: "PUBLISHED", publishedAt: now, updatedAt: now },
    });
    const distributed = await distributePublishedNotification(existing.id);

    await prisma.ssmNotificationAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: existing.id,
        actorUserId: ctx.userId,
        actorName: ctx.userName,
        actorRole: ctx.role,
        action: "PUBLISH",
        fromStatus: existing.status,
        toStatus: distributed.status,
      },
    });

    return { notification: distributed };
  }

  const submitted = await prisma.ssmNotification.update({
    where: { id: existing.id },
    data: { status: "PENDING_APPROVAL", updatedAt: now },
  });
  return { notification: submitted };
}

/**
 * Triggers one of the 6 automated exam notification events with strict idempotency & approved-result guards.
 */
export async function triggerExamNotificationEvent(
  ctx: NotificationActorContext,
  params: {
    eventType: AutomatedExamEventType;
    testingPeriodId: string;
    testingSubjectExamId?: string;
    testingSessionId?: string;
    studentId?: string;
    reminderDaysBefore?: number;
    beforeChange?: Record<string, any>;
    afterChange?: Record<string, any>;
    idempotencyKey?: string;
  }
) {
  await ensureNotificationCenterTables();

  if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin) {
    throw new NotificationCenterError(
      "FORBIDDEN_EVENT_TRIGGER",
      "Chỉ Ban KT&ĐBCL hoặc Quản trị viên mới được kích hoạt sự kiện thông báo khảo thí tự động.",
      403
    );
  }

  const computedIdempotencyKey =
    params.idempotencyKey ||
    [
      params.eventType,
      params.testingPeriodId,
      params.testingSubjectExamId || "ALL_EXAMS",
      params.testingSessionId || "ALL_SESSIONS",
      params.studentId || "ALL_STUDENTS",
      params.reminderDaysBefore ? `D${params.reminderDaysBefore}` : "",
    ]
      .filter(Boolean)
      .join("::");

  // Check if event with this idempotencyKey was already processed
  const existingEvent = await prisma.ssmNotificationEvent.findUnique({
    where: { idempotencyKey: computedIdempotencyKey },
  });

  if (existingEvent && existingEvent.status === "PROCESSED" && existingEvent.notificationId) {
    const existingNotif = await prisma.ssmNotification.findUnique({
      where: { id: existingEvent.notificationId },
    });
    return {
      deduplicated: true,
      eventRecord: existingEvent,
      notification: existingNotif,
    };
  }

  const examMeta = await pullExamScheduleMetadata({
    testingPeriodId: params.testingPeriodId,
    testingSubjectExamId: params.testingSubjectExamId,
    testingSessionId: params.testingSessionId,
  });

  if (!examMeta) {
    throw new NotificationCenterError(
      "EXAM_METADATA_NOT_FOUND",
      "Không tìm thấy dữ liệu Kỳ kiểm tra / Lịch kiểm tra tương ứng.",
      404
    );
  }

  const eventDef = AUTOMATED_EXAM_EVENTS[params.eventType];
  let title = "";
  let contentHtml = "";
  let targetStudentIds: string[] | undefined = params.studentId ? [params.studentId] : undefined;
  let targetClassIds: string[] = examMeta.classId ? [examMeta.classId] : [];
  let deepLink = "/parent/thong-bao";

  if (params.eventType === "EVENT_EXAM_RESULT_PUBLISHED") {
    // Mandatory Security Rule: Do NOT publish results if candidate results are not yet APPROVED!
    const whereResults: any = {};
    if (params.testingSubjectExamId) {
      whereResults.subjectExamId = params.testingSubjectExamId;
    }
    const candidateResults = await prisma.testingCandidateResult
      .findMany({ where: whereResults })
      .catch(() => []);

    const approvedResults = candidateResults.filter((r: any) => r.approvalStatus === "APPROVED");
    if (candidateResults.length === 0 || approvedResults.length === 0) {
      throw new NotificationCenterError(
        "UNAPPROVED_EXAM_RESULTS",
        "Không thể công bố kết quả kiểm tra khi bảng điểm chưa được phê duyệt chính thức (approvalStatus != APPROVED).",
        400
      );
    }

    targetStudentIds = approvedResults.map((r: any) => r.studentId);
    targetClassIds = Array.from(new Set(approvedResults.map((r: any) => r.classId).filter(Boolean)));
    deepLink = "/parent/grades";

    // Mandatory Privacy Rule: Never include personal score numbers in push notification / summary!
    title = `[Kết quả Học tập] Đã công bố kết quả môn ${examMeta.subjectName} - ${examMeta.periodName}`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Kết quả bài kiểm tra môn <strong>${examMeta.subjectName}</strong> thuộc kỳ <strong>${examMeta.periodName}</strong> đã được Ban KT&amp;ĐBCL phê duyệt và công bố chính thức trên hệ thống SSM.</p>
<p>Vì lý do bảo mật thông tin cá nhân của học sinh, điểm số chi tiết không hiển thị trong nội dung thông báo chung. Quý Phụ huynh vui lòng nhấn nút <strong>Xem bảng điểm cá nhân</strong> bên dưới (đăng nhập tài khoản) để xem điểm số và nhận xét chi tiết của con.</p>`;
  } else if (params.eventType === "EVENT_EXAM_STUDENT_ABSENT") {
    // Only send to confirmed absent students in the session roster
    if (!params.studentId && params.testingSessionId) {
      const absentRosters = await prisma.testingSessionRoster
        .findMany({
          where: {
            sessionId: params.testingSessionId,
            attendanceStatus: { in: ["ABSENT", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"] },
          },
        })
        .catch(() => []);
      targetStudentIds = absentRosters.map((r: any) => r.studentId);
    }

    if (!targetStudentIds || targetStudentIds.length === 0) {
      throw new NotificationCenterError(
        "NO_ABSENT_STUDENTS",
        "Không có học sinh vắng kiểm tra được xác nhận trong ca thi này.",
        400
      );
    }

    title = `[Thông báo Khảo thí] Xác nhận học sinh vắng mặt ca kiểm tra môn ${examMeta.subjectName}`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh,</p>
<p>Ban KT&amp;ĐBCL thông báo học sinh vắng mặt tại ca kiểm tra môn <strong>${examMeta.subjectName}</strong> (${examMeta.periodName}) lúc <strong>${examMeta.startTime} - ${examMeta.endTime}</strong> tại phòng <strong>${examMeta.roomName}</strong>.</p>
<p>Quý Phụ huynh vui lòng xác nhận đã nhận thông báo và phối hợp với Giáo viên Chủ nhiệm để hoàn tất thủ tục xin phép / đăng ký kiểm tra bù theo quy chế.</p>`;
  } else if (params.eventType === "EVENT_EXAM_SCHEDULE_CHANGED") {
    const beforeStr = params.beforeChange
      ? `${params.beforeChange.examDate || ""} (${params.beforeChange.startTime || ""} - Phòng ${params.beforeChange.roomName || ""})`
      : "Lịch trước điều chỉnh";
    const afterStr = params.afterChange
      ? `${params.afterChange.examDate || examMeta.examDate || ""} (${params.afterChange.startTime || examMeta.startTime} - Phòng ${params.afterChange.roomName || examMeta.roomName})`
      : `${examMeta.startTime} - ${examMeta.endTime} tại ${examMeta.roomName}`;

    title = `[KHẨN - Thay đổi Lịch kiểm tra] Điều chỉnh lịch thi môn ${examMeta.subjectName} (${examMeta.periodName})`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh và Học sinh thuộc diện điều chỉnh lịch kiểm tra,</p>
<p>Ban KT&amp;ĐBCL thông báo điều chỉnh lịch kiểm tra chính thức môn <strong>${examMeta.subjectName}</strong>:</p>
<ul>
  <li><strong>Trước điều chỉnh:</strong> ${beforeStr}</li>
  <li><strong>Sau điều chỉnh (Chính thức):</strong> ${afterStr}</li>
  <li><strong>Hình thức:</strong> ${examMeta.examFormatLabel}</li>
</ul>
<p>Quý Phụ huynh vui lòng bấm <strong>Xác nhận đã xem</strong> để nhà trường ghi nhận.</p>`;
  } else if (params.eventType === "EVENT_EXAM_MAKEUP_SCHEDULED") {
    if (!targetStudentIds && params.testingSessionId) {
      const makeupRosters = await prisma.testingSessionRoster
        .findMany({
          where: {
            sessionId: params.testingSessionId,
            needsMakeup: true,
          },
        })
        .catch(() => []);
      if (makeupRosters.length > 0) {
        targetStudentIds = makeupRosters.map((r: any) => r.studentId);
      }
    }
    title = `[Lịch kiểm tra bù] Thông báo lịch kiểm tra bổ sung môn ${examMeta.subjectName} (${examMeta.periodName})`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh và Học sinh,</p>
<p>Ban KT&amp;ĐBCL thông báo lịch kiểm tra bổ sung / kiểm tra bù môn <strong>${examMeta.subjectName}</strong>:</p>
<ul>
  <li><strong>Khung giờ:</strong> ${examMeta.startTime} - ${examMeta.endTime}</li>
  <li><strong>Phòng thi:</strong> ${examMeta.roomName}</li>
  <li><strong>Hình thức:</strong> ${examMeta.examFormatLabel}</li>
</ul>`;
  } else if (params.eventType === "EVENT_EXAM_REMINDER") {
    const daysText = params.reminderDaysBefore ? `trước ${params.reminderDaysBefore} ngày` : "sắp diễn ra";
    title = `[Nhắc lịch Kiểm tra] Kỳ kiểm tra ${examMeta.periodName} - Môn ${examMeta.subjectName} (${daysText})`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Hệ thống SSM nhắc lịch kiểm tra môn <strong>${examMeta.subjectName}</strong> (${examMeta.periodName}) sẽ diễn ra vào khung giờ <strong>${examMeta.startTime} - ${examMeta.endTime}</strong> tại phòng <strong>${examMeta.roomName}</strong> (${examMeta.examFormatLabel}).</p>`;
  } else {
    // EVENT_EXAM_SCHEDULE_PUBLISHED
    title = `[Thông báo Khảo thí] Lịch kiểm tra chính thức ${examMeta.periodName} - Môn ${examMeta.subjectName}`;
    contentHtml = `<p>Kính gửi Quý Phụ huynh và các em Học sinh,</p>
<p>Ban KT&amp;ĐBCL thông báo lịch kiểm tra chính thức kỳ <strong>${examMeta.periodName}</strong>:</p>
<ul>
  <li><strong>Môn kiểm tra:</strong> ${examMeta.subjectName}</li>
  <li><strong>Khung giờ:</strong> ${examMeta.startTime} - ${examMeta.endTime} (${examMeta.durationMinutes} phút)</li>
  <li><strong>Phòng thi:</strong> ${examMeta.roomName}</li>
  <li><strong>Hình thức:</strong> ${examMeta.examFormatLabel}</li>
</ul>`;
  }

  const createdRes = await createOrPublishNotification(ctx, {
    category: eventDef.category,
    subType: eventDef.subType,
    title,
    contentHtml,
    priority: eventDef.defaultPriority,
    senderUnit: "Ban KT&ĐBCL (Tự động)",
    testingPeriodId: params.testingPeriodId,
    testingSubjectExamId: params.testingSubjectExamId,
    testingSessionId: params.testingSessionId,
    classIds: targetClassIds,
    studentIds: targetStudentIds,
    beforeChangeJson: params.beforeChange || null,
    afterChangeJson: params.afterChange || null,
    deepLink,
    requireAcknowledge: eventDef.requireAcknowledge,
    allowReply: false,
    action: "PUBLISH",
    idempotencyKey: computedIdempotencyKey,
  });

  const eventRecord = await prisma.ssmNotificationEvent.create({
    data: {
      id: crypto.randomUUID(),
      eventType: params.eventType,
      idempotencyKey: computedIdempotencyKey,
      sourceModule: "KHAO_THI_SO",
      sourceId: params.testingSubjectExamId || params.testingPeriodId,
      payloadJson: JSON.stringify(params),
      status: "PROCESSED",
      notificationId: createdRes.notification.id,
      triggeredByUserId: ctx.userId,
    },
  });

  return {
    deduplicated: false,
    eventRecord,
    notification: createdRes.notification,
  };
}

/**
 * Lists notifications for the Parent / Student Inbox (Mobile-first) or Admin / Teacher Management Workspace.
 * Enforces strict anti-IDOR so a parent only sees notifications for their linked children (`studentId`).
 */
export async function listNotificationsForViewer(
  ctx: NotificationActorContext,
  filters: {
    mode?: "INBOX" | "MANAGE";
    tab?: "ALL" | "EXAM" | "TEACHER" | "ACADEMIC_RESULT" | "UNREAD";
    category?: string;
    studentId?: string;
    testingPeriodId?: string;
    campusId?: string;
    classId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }
) {
  await ensureNotificationCenterTables();

  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize || 25)));
  const skip = (page - 1) * pageSize;

  // INBOX MODE (For Parents, Students, or Teachers viewing their received notifications)
  if (ctx.isParent || ctx.isStudent || filters.mode === "INBOX") {
    const allowedStudentIds = ctx.linkedStudents.map((s) => s.studentId);

    // Anti-IDOR check if parent passes a specific studentId filter
    if (filters.studentId && ctx.isParent && !allowedStudentIds.includes(filters.studentId)) {
      throw new NotificationCenterError(
        "FORBIDDEN_STUDENT_ACCESS",
        "Bạn không có quyền xem thông báo của học sinh không liên kết với tài khoản phụ huynh.",
        403
      );
    }

    const whereRecipient: any = {
      deliveryStatus: { not: "RECALLED" },
      notification: {
        status: { in: ["PUBLISHED", "PARTIALLY_FAILED"] },
      },
    };

    if (ctx.isStudent && ctx.studentProfile) {
      whereRecipient.studentId = ctx.studentProfile.studentId;
      whereRecipient.recipientRole = "STUDENT";
    } else if (ctx.isParent) {
      whereRecipient.recipientUserId = ctx.userId;
      if (filters.studentId) {
        whereRecipient.studentId = filters.studentId;
      } else if (allowedStudentIds.length > 0) {
        whereRecipient.studentId = { in: allowedStudentIds };
      }
    } else {
      whereRecipient.recipientUserId = ctx.userId;
    }

    if (filters.tab === "UNREAD") {
      whereRecipient.isRead = false;
    } else if (filters.tab === "EXAM") {
      whereRecipient.notification.category = "EXAM";
    } else if (filters.tab === "TEACHER") {
      whereRecipient.notification.category = "TEACHER";
    } else if (filters.tab === "ACADEMIC_RESULT") {
      whereRecipient.notification.category = "ACADEMIC_RESULT";
    }

    if (filters.category && filters.category !== "ALL") {
      whereRecipient.notification.category = filters.category;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      whereRecipient.notification.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
        { senderUnit: { contains: q } },
      ];
    }

    const [recipientRows, totalCount, unreadCount] = await Promise.all([
      prisma.ssmNotificationRecipient.findMany({
        where: whereRecipient,
        include: {
          notification: {
            include: {
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.ssmNotificationRecipient.count({ where: whereRecipient }),
      prisma.ssmNotificationRecipient.count({
        where: {
          ...whereRecipient,
          isRead: false,
        },
      }),
    ]);

    const items = recipientRows.map((r) => ({
      recipientId: r.id,
      notificationId: r.notification.id,
      code: r.notification.code,
      category: r.notification.category,
      subType: r.notification.subType,
      title: r.notification.title,
      summary: r.notification.summary,
      contentHtml: r.notification.contentHtml,
      priority: r.notification.priority,
      senderUnit: r.notification.senderUnit,
      senderName: r.notification.senderName,
      senderRole: r.notification.senderRole,
      publishedAt: r.notification.publishedAt || r.notification.createdAt,
      requireAcknowledge: r.notification.requireAcknowledge,
      acknowledgeDeadline: r.notification.acknowledgeDeadline,
      allowReply: r.notification.allowReply,
      deepLink: r.notification.deepLink,
      examScheduleMeta: r.notification.examScheduleMetaJson
        ? JSON.parse(r.notification.examScheduleMetaJson)
        : null,
      beforeChange: r.notification.beforeChangeJson ? JSON.parse(r.notification.beforeChangeJson) : null,
      afterChange: r.notification.afterChangeJson ? JSON.parse(r.notification.afterChangeJson) : null,
      attachments: r.notification.attachments || [],
      studentId: r.studentId,
      studentName: r.studentName,
      studentCode: r.studentCode,
      classId: r.classId,
      className: r.className,
      deliveryStatus: r.deliveryStatus,
      isRead: r.isRead,
      readAt: r.readAt,
      isAcknowledged: r.isAcknowledged,
      acknowledgedAt: r.acknowledgedAt,
      acknowledgeNote: r.acknowledgeNote,
      personalMeta: r.personalMetaJson ? JSON.parse(r.personalMetaJson) : null,
    }));

    return {
      mode: "INBOX" as const,
      items,
      totalCount,
      unreadCount,
      page,
      pageSize,
      children: ctx.linkedStudents,
    };
  }

  // MANAGEMENT MODE (For Ban KT&ĐBCL, Admin, GVCN, GVBM)
  const whereNotif: any = {};
  if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin) {
    whereNotif.senderUserId = ctx.userId;
  }
  if (filters.category && filters.category !== "ALL") {
    whereNotif.category = filters.category;
  }
  if (filters.testingPeriodId) {
    whereNotif.testingPeriodId = filters.testingPeriodId;
  }
  if (filters.campusId) {
    whereNotif.campusId = filters.campusId;
  }
  if (filters.status && filters.status !== "ALL") {
    whereNotif.status = filters.status;
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    whereNotif.OR = [
      { title: { contains: q } },
      { code: { contains: q } },
      { summary: { contains: q } },
    ];
  }

  const [notifications, totalCount] = await Promise.all([
    prisma.ssmNotification.findMany({
      where: whereNotif,
      include: {
        attachments: true,
        approvals: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.ssmNotification.count({ where: whereNotif }),
  ]);

  return {
    mode: "MANAGE" as const,
    items: notifications,
    totalCount,
    unreadCount: 0,
    page,
    pageSize,
    templates: BUILTIN_NOTIFICATION_TEMPLATES,
  };
}

/**
 * Records Read Receipt, Independent Acknowledgment, or Reply on a notification.
 * Strictly separates `isRead` (Đã đọc) from `isAcknowledged` (Đã xác nhận).
 */
export async function interactWithNotification(
  ctx: NotificationActorContext,
  params: {
    notificationId: string;
    recipientId?: string;
    studentId?: string;
    action: "MARK_READ" | "ACKNOWLEDGE" | "REPLY";
    acknowledgeNote?: string;
    replyContent?: string;
    parentResponseId?: string;
  }
) {
  await ensureNotificationCenterTables();

  const notif = await prisma.ssmNotification.findUnique({
    where: { id: params.notificationId },
  });
  if (!notif) {
    throw new NotificationCenterError("NOT_FOUND", "Không tìm thấy thông báo.", 404);
  }

  // Locate the recipient row for this viewer
  let recipient: any = null;
  if (params.recipientId) {
    recipient = await prisma.ssmNotificationRecipient.findUnique({
      where: { id: params.recipientId },
    });
  } else {
    const whereRecip: any = {
      notificationId: params.notificationId,
      recipientUserId: ctx.userId,
    };
    if (params.studentId) {
      whereRecip.studentId = params.studentId;
    }
    recipient = await prisma.ssmNotificationRecipient.findFirst({
      where: whereRecip,
    });
  }

  // Anti-IDOR verification: If viewer is Parent or Student, they must own the recipient record
  if (ctx.isParent || ctx.isStudent) {
    if (!recipient) {
      throw new NotificationCenterError(
        "FORBIDDEN_RECIPIENT_ACCESS",
        "Bạn không nằm trong danh sách người nhận của thông báo này.",
        403
      );
    }
    if (ctx.isParent) {
      const ownsStudent =
        !recipient.studentId ||
        ctx.linkedStudents.some((s) => s.studentId === recipient.studentId);
      if (recipient.recipientUserId !== ctx.userId || !ownsStudent) {
        throw new NotificationCenterError(
          "FORBIDDEN_STUDENT_ACCESS",
          "Bạn không có quyền truy cập thông báo của học sinh khác.",
          403
        );
      }
    } else if (ctx.isStudent && recipient.studentId !== ctx.studentProfile?.studentId) {
      throw new NotificationCenterError(
        "FORBIDDEN_STUDENT_ACCESS",
        "Học sinh không được phép xem hoặc xác nhận thông báo của học sinh khác.",
        403
      );
    }
  }

  const now = new Date();

  if (params.action === "MARK_READ") {
    if (!recipient) {
      return { success: true, alreadyRead: true };
    }

    const wasUnread = !recipient.isRead;
    const updatedRecipient = await prisma.ssmNotificationRecipient.update({
      where: { id: recipient.id },
      data: {
        isRead: true,
        readAt: recipient.readAt || now,
        // Note: isAcknowledged remains untouched (independent state!)
        updatedAt: now,
      },
    });

    if (wasUnread) {
      await prisma.ssmNotificationReadReceipt.create({
        data: {
          id: crypto.randomUUID(),
          notificationId: notif.id,
          recipientId: recipient.id,
          userId: ctx.userId,
          studentId: recipient.studentId,
          readAt: now,
        },
      });

      const currentReadCount = await prisma.ssmNotificationRecipient.count({
        where: { notificationId: notif.id, isRead: true },
      });
      await prisma.ssmNotification.update({
        where: { id: notif.id },
        data: { readCount: currentReadCount, updatedAt: now },
      });
    }

    return {
      success: true,
      recipient: updatedRecipient,
    };
  }

  if (params.action === "ACKNOWLEDGE") {
    if (!recipient) {
      throw new NotificationCenterError("RECIPIENT_NOT_FOUND", "Không tìm thấy bản ghi người nhận.", 404);
    }

    const updatedRecipient = await prisma.ssmNotificationRecipient.update({
      where: { id: recipient.id },
      data: {
        isRead: true,
        readAt: recipient.readAt || now,
        isAcknowledged: true,
        acknowledgedAt: recipient.acknowledgedAt || now,
        acknowledgeNote: params.acknowledgeNote
          ? sanitizeNotificationHtml(params.acknowledgeNote)
          : recipient.acknowledgeNote,
        updatedAt: now,
      },
    });

    await prisma.ssmNotificationReadReceipt.create({
      data: {
        id: crypto.randomUUID(),
        notificationId: notif.id,
        recipientId: recipient.id,
        userId: ctx.userId,
        studentId: recipient.studentId,
        readAt: updatedRecipient.readAt || now,
        acknowledgedAt: now,
        acknowledgeNote: updatedRecipient.acknowledgeNote,
      },
    });

    const [currentReadCount, currentAckCount] = await Promise.all([
      prisma.ssmNotificationRecipient.count({
        where: { notificationId: notif.id, isRead: true },
      }),
      prisma.ssmNotificationRecipient.count({
        where: { notificationId: notif.id, isAcknowledged: true },
      }),
    ]);

    await prisma.ssmNotification.update({
      where: { id: notif.id },
      data: {
        readCount: currentReadCount,
        acknowledgedCount: currentAckCount,
        updatedAt: now,
      },
    });

    return {
      success: true,
      recipient: updatedRecipient,
    };
  }

  // REPLY action
  if (!notif.allowReply && (ctx.isParent || ctx.isStudent)) {
    throw new NotificationCenterError(
      "REPLY_DISABLED",
      "Thông báo này là thông báo một chiều, không mở chức năng phản hồi.",
      400
    );
  }

  const cleanReply = sanitizeNotificationHtml(params.replyContent || "").trim();
  if (!cleanReply) {
    throw new NotificationCenterError("EMPTY_REPLY", "Nội dung phản hồi không được để trống.", 400);
  }

  const responseRecord = await prisma.ssmNotificationResponse.create({
    data: {
      id: crypto.randomUUID(),
      notificationId: notif.id,
      recipientId: recipient?.id || null,
      senderUserId: ctx.userId,
      senderName: ctx.userName,
      senderRole: ctx.role,
      studentId: recipient?.studentId || params.studentId || null,
      studentName: recipient?.studentName || null,
      classId: recipient?.classId || null,
      className: recipient?.className || null,
      content: cleanReply,
      parentResponseId: params.parentResponseId || null,
      status: ctx.isTeacher || ctx.isKTDBCL || ctx.isAdmin ? "ANSWERED" : "OPEN",
    },
  });

  if (params.parentResponseId && (ctx.isTeacher || ctx.isKTDBCL || ctx.isAdmin)) {
    await prisma.ssmNotificationResponse
      .update({
        where: { id: params.parentResponseId },
        data: {
          status: "ANSWERED",
          repliedByUserId: ctx.userId,
          repliedByName: ctx.userName,
          repliedAt: now,
        },
      })
      .catch(() => {});
  }

  const replyCount = await prisma.ssmNotificationResponse.count({
    where: { notificationId: notif.id },
  });
  await prisma.ssmNotification.update({
    where: { id: notif.id },
    data: { replyCount, updatedAt: now },
  });

  return {
    success: true,
    response: responseRecord,
  };
}

/**
 * Computes the 10 mandatory KPIs, Campus breakdown chart, Class breakdown chart,
 * Low-Read-Rate Classes alert list, and Unread Recipients list (scoped by role).
 */
export async function getNotificationDashboardMetrics(
  ctx: NotificationActorContext,
  filters: {
    academicYearId?: string;
    campusId?: string;
    classId?: string;
    testingPeriodId?: string;
    category?: string;
    senderUnit?: string;
    notificationId?: string;
  }
) {
  await ensureNotificationCenterTables();

  if (ctx.isParent || ctx.isStudent) {
    throw new NotificationCenterError(
      "FORBIDDEN_DASHBOARD",
      "Chỉ Ban KT&ĐBCL, Quản trị viên và Giáo viên mới được truy cập Dashboard thống kê thông báo.",
      403
    );
  }

  const whereNotif: any = {
    status: { in: ["PUBLISHED", "PARTIALLY_FAILED"] },
  };

  if (filters.notificationId) whereNotif.id = filters.notificationId;
  if (filters.academicYearId) whereNotif.academicYearId = filters.academicYearId;
  if (filters.campusId) whereNotif.campusId = filters.campusId;
  if (filters.testingPeriodId) whereNotif.testingPeriodId = filters.testingPeriodId;
  if (filters.category && filters.category !== "ALL") whereNotif.category = filters.category;
  if (filters.senderUnit && filters.senderUnit !== "ALL") whereNotif.senderUnit = filters.senderUnit;

  // Scope teacher to their own notifications or their assigned homeroom/teaching classes
  const whereRecipient: any = {
    notification: whereNotif,
  };

  if (filters.classId) {
    whereRecipient.classId = filters.classId;
  } else if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin) {
    const allowedClassIds = Array.from(
      new Set([
        ...ctx.homeroomClassIds,
        ...ctx.subjectAssignments.map((a) => a.classId),
      ])
    );
    if (allowedClassIds.length > 0) {
      whereRecipient.classId = { in: allowedClassIds };
    } else {
      whereNotif.senderUserId = ctx.userId;
    }
  }

  const [publishedNotifications, recipientRows] = await Promise.all([
    prisma.ssmNotification.findMany({
      where: whereNotif,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.ssmNotificationRecipient.findMany({
      where: whereRecipient,
      include: {
        notification: {
          select: {
            id: true,
            code: true,
            title: true,
            category: true,
            requireAcknowledge: true,
            publishedAt: true,
          },
        },
      },
    }),
  ]);

  const totalPublishedNotifications = publishedNotifications.length;
  const totalRecipients = recipientRows.length;
  const sentSuccessCount = recipientRows.filter((r) => r.deliveryStatus === "SENT").length;
  const sentFailedCount = recipientRows.filter((r) => r.deliveryStatus === "FAILED").length;
  const readCount = recipientRows.filter((r) => r.isRead).length;
  const unreadCount = totalRecipients - readCount;
  const acknowledgedCount = recipientRows.filter((r) => r.isAcknowledged).length;
  const unacknowledgedCount = totalRecipients - acknowledgedCount;

  const readRate =
    totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 1000) / 10 : 0;
  const acknowledgeRate =
    totalRecipients > 0 ? Math.round((acknowledgedCount / totalRecipients) * 1000) / 10 : 0;

  // Group by Campus
  const campusMap = new Map<
    string,
    {
      campusId: string;
      campusName: string;
      totalRecipients: number;
      sentSuccess: number;
      readCount: number;
      acknowledgedCount: number;
    }
  >();

  // Group by Class
  const classMap = new Map<
    string,
    {
      classId: string;
      className: string;
      campusName: string;
      totalRecipients: number;
      sentSuccess: number;
      readCount: number;
      acknowledgedCount: number;
    }
  >();

  for (const r of recipientRows) {
    const cId = r.campusId || "CAMPUS_ALL";
    const cName = r.campusName || "Toàn trường / Cơ sở chính";
    if (!campusMap.has(cId)) {
      campusMap.set(cId, {
        campusId: cId,
        campusName: cName,
        totalRecipients: 0,
        sentSuccess: 0,
        readCount: 0,
        acknowledgedCount: 0,
      });
    }
    const cStat = campusMap.get(cId)!;
    cStat.totalRecipients++;
    if (r.deliveryStatus === "SENT") cStat.sentSuccess++;
    if (r.isRead) cStat.readCount++;
    if (r.isAcknowledged) cStat.acknowledgedCount++;

    const clsId = r.classId || "CLASS_GENERAL";
    const clsName = r.className || "Chung";
    if (!classMap.has(clsId)) {
      classMap.set(clsId, {
        classId: clsId,
        className: clsName,
        campusName: cName,
        totalRecipients: 0,
        sentSuccess: 0,
        readCount: 0,
        acknowledgedCount: 0,
      });
    }
    const clsStat = classMap.get(clsId)!;
    clsStat.totalRecipients++;
    if (r.deliveryStatus === "SENT") clsStat.sentSuccess++;
    if (r.isRead) clsStat.readCount++;
    if (r.isAcknowledged) clsStat.acknowledgedCount++;
  }

  const byCampus = Array.from(campusMap.values()).map((c) => ({
    ...c,
    readRate: c.totalRecipients > 0 ? Math.round((c.readCount / c.totalRecipients) * 1000) / 10 : 0,
    acknowledgeRate:
      c.totalRecipients > 0 ? Math.round((c.acknowledgedCount / c.totalRecipients) * 1000) / 10 : 0,
  }));

  const byClass = Array.from(classMap.values())
    .map((cls) => ({
      ...cls,
      readRate:
        cls.totalRecipients > 0 ? Math.round((cls.readCount / cls.totalRecipients) * 1000) / 10 : 0,
      acknowledgeRate:
        cls.totalRecipients > 0
          ? Math.round((cls.acknowledgedCount / cls.totalRecipients) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => a.readRate - b.readRate);

  const lowReadRateClasses = byClass.filter((cls) => cls.readRate < 80);

  const unreadRecipients = recipientRows
    .filter((r) => !r.isRead)
    .slice(0, 150)
    .map((r) => ({
      recipientId: r.id,
      notificationId: r.notificationId,
      notificationCode: r.notification.code,
      notificationTitle: r.notification.title,
      recipientName: r.recipientName,
      recipientRole: r.recipientRole,
      studentName: r.studentName,
      studentCode: r.studentCode,
      className: r.className,
      campusName: r.campusName,
      deliveryStatus: r.deliveryStatus,
      remindedCount: r.remindedCount,
      lastRemindedAt: r.lastRemindedAt,
    }));

  return {
    kpis: {
      totalPublishedNotifications,
      totalRecipients,
      sentSuccessCount,
      sentFailedCount,
      readCount,
      unreadCount,
      acknowledgedCount,
      unacknowledgedCount,
      readRate,
      acknowledgeRate,
    },
    byCampus,
    byClass,
    lowReadRateClasses,
    unreadRecipients,
  };
}
