import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { calculateBusinessHoursSlaDue } from "@/lib/coordination/constants";
import { ensureParentMeetingTables } from "./schemaInit";
import {
    ATTENDEE_ROLES,
    AttendeeRoleCode,
    FEEDBACK_BUSINESS_STATUS,
    FEEDBACK_TOPIC_GROUPS,
    FeedbackBusinessStatusCode,
    FeedbackStageCode,
    FeedbackTopicGroupCode,
    FeedbackVisibilityCode,
    isFeedbackOverdue,
    isTaskOverdue,
    ManualCheckInReasonCode,
    MeetingStatusCode,
    MeetingTaskPriorityCode,
    MeetingTaskStatusCode,
    MeetingTypeCode,
    MinutesStatusCode,
    RsvpStatusCode,
} from "./constants";
import {
    generateQrCodeDataUrl,
    signParentMeetingQrToken,
    verifyParentMeetingQrToken,
} from "./qrSecurity";

export class ParentMeetingError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.name = "ParentMeetingError";
        this.code = code;
        this.status = status;
    }
}

export interface ParentLinkedStudentInfo {
    studentId: string;
    studentCode: string;
    studentName: string;
    classId: string;
    className: string;
    grade: string;
    campusId: string;
    relationship: string;
}

export interface ParentMeetingActorContext {
    userId: string;
    userEmail: string;
    userName: string;
    role: string;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isKTDBCL: boolean;
    isGDCS: boolean;
    isTeacher: boolean;
    isParent: boolean;
    allowedCampusIds: string[];
    parentId: string | null;
    linkedStudents: ParentLinkedStudentInfo[];
    teacherId: string | null;
    homeroomClassIds: string[];
    subjectClassIds: string[];
}

function generateShortId(prefix: string): string {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
        now.getDate()
    ).padStart(2, "0")}`;
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `${prefix}-${ymd}-${rand}`;
}

export async function recordMeetingAuditLog(params: {
    meetingId?: string | null;
    classId?: string | null;
    actor: Pick<ParentMeetingActorContext, "userId" | "userName" | "userEmail" | "role">;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}): Promise<void> {
    try {
        await ensureParentMeetingTables();
        const sanitizedMeta = params.metadata ? JSON.stringify(params.metadata) : null;
        await prisma.parentMeetingAuditLog.create({
            data: {
                id: crypto.randomUUID(),
                meetingId: params.meetingId || null,
                classId: params.classId || null,
                actorUserId: params.actor.userId,
                actorName: params.actor.userName || params.actor.userEmail || "User",
                actorRole: params.actor.role,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId,
                metadataJson: sanitizedMeta,
                ipAddress: params.ipAddress || null,
            },
        });
        await logActivity(
            params.actor.userId,
            params.actor.userEmail,
            `PARENT_MEETING_${params.action}`,
            params.targetType,
            params.targetId,
            null,
            params.metadata || null,
            params.ipAddress
        );
    } catch (e) {
        console.error("[ParentMeetingAuditLog] Failed to write audit log:", e);
    }
}

/**
 * Resolves the actor's role, campus scope, homeroom/subject classes, or parent-student links from database.
 */
export async function resolveParentMeetingActorContext(sessionUser: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
    campusIds?: string[] | null;
}): Promise<ParentMeetingActorContext> {
    await ensureParentMeetingTables();

    const userId = sessionUser.id;
    const role = (sessionUser.role || "TEACHER").toUpperCase();
    const isSuperAdmin = role === "SUPER_ADMIN";
    const isAdmin = role === "ADMIN" || isSuperAdmin;
    const isKTDBCL = role === "KT_DBCL";
    const isGDCS = role === "GDCS";

    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            campusAssignments: { select: { campusId: true } },
            parent: {
                include: {
                    students: {
                        include: {
                            student: {
                                include: {
                                    class: true,
                                },
                            },
                        },
                    },
                },
            },
            teacher: {
                include: {
                    classes: { select: { classId: true, roleInClass: true } },
                    TeachingAssignment: { select: { classId: true } },
                },
            },
        },
    });

    const userName = dbUser?.fullName || sessionUser.name || sessionUser.email || "Người dùng";
    const userEmail = dbUser?.email || sessionUser.email || "";

    const allowedCampusIds = Array.from(
        new Set([
            ...(sessionUser.campusIds || []),
            ...(dbUser?.campusAssignments.map((c) => c.campusId) || []),
            ...(dbUser?.teacher?.campusId ? [dbUser.teacher.campusId] : []),
        ])
    );

    const linkedStudents: ParentLinkedStudentInfo[] = [];
    let parentId: string | null = null;

    if (dbUser?.parent) {
        parentId = dbUser.parent.id;
        for (const link of dbUser.parent.students) {
            if (link.student) {
                linkedStudents.push({
                    studentId: link.student.id,
                    studentCode: link.student.studentCode,
                    studentName: link.student.studentName,
                    classId: link.student.classId,
                    className: link.student.class?.className || "",
                    grade: link.student.class?.grade || "",
                    campusId: link.student.campusId,
                    relationship: link.relationship || "PHU_HUYNH",
                });
            }
        }
    }

    let teacherId: string | null = null;
    const homeroomClassSet = new Set<string>();
    const subjectClassSet = new Set<string>();

    if (dbUser?.teacher) {
        teacherId = dbUser.teacher.id;
        const hrClasses = await prisma.class.findMany({
            where: { homeroomTeacherId: teacherId },
            select: { id: true },
        });
        for (const hc of hrClasses) {
            homeroomClassSet.add(hc.id);
        }
        for (const ca of dbUser.teacher.classes) {
            if (ca.roleInClass === "GVCN" || ca.roleInClass === "HOMEROOM") {
                homeroomClassSet.add(ca.classId);
            } else {
                subjectClassSet.add(ca.classId);
            }
        }
        for (const ta of dbUser.teacher.TeachingAssignment) {
            subjectClassSet.add(ta.classId);
        }
    }

    return {
        userId,
        userEmail,
        userName,
        role,
        isSuperAdmin,
        isAdmin,
        isKTDBCL,
        isGDCS,
        isTeacher: role === "TEACHER" || Boolean(teacherId),
        isParent: role === "PARENT" || Boolean(parentId),
        allowedCampusIds,
        parentId,
        linkedStudents,
        teacherId,
        homeroomClassIds: Array.from(homeroomClassSet),
        subjectClassIds: Array.from(subjectClassSet),
    };
}

export function assertParentOwnsStudent(
    ctx: ParentMeetingActorContext,
    studentId: string
): ParentLinkedStudentInfo {
    const match = ctx.linkedStudents.find((s) => s.studentId === studentId);
    if (!match) {
        throw new ParentMeetingError(
            "FORBIDDEN_STUDENT_ACCESS",
            "Bạn không có quyền truy cập hồ sơ học sinh này.",
            403
        );
    }
    return match;
}

export function assertCanManageClassMeeting(
    ctx: ParentMeetingActorContext,
    classId: string,
    campusId?: string
): void {
    if (ctx.isSuperAdmin || ctx.isAdmin || ctx.isKTDBCL) return;
    if (ctx.isGDCS) {
        if (campusId && ctx.allowedCampusIds.length > 0 && !ctx.allowedCampusIds.includes(campusId)) {
            throw new ParentMeetingError(
                "FORBIDDEN_CAMPUS_ACCESS",
                "Bạn không có quyền quản lý cuộc họp thuộc cơ sở khác.",
                403
            );
        }
        return;
    }
    if (ctx.homeroomClassIds.includes(classId)) {
        return;
    }
    throw new ParentMeetingError(
        "FORBIDDEN_CLASS_ACCESS",
        "Bạn không phải Giáo viên chủ nhiệm của lớp này nên không có quyền thực hiện thao tác.",
        403
    );
}

/**
 * Computes attendance metrics for a meeting (and optionally a specific class),
 * strictly separating:
 * - presentStudentCount: Number of students with at least 1 representative present
 * - actualAttendeeCount: Total number of actual attendees present (e.g. Father + Mother = 2)
 */
export async function computeMeetingAttendanceStats(
    meetingId: string,
    classId?: string
): Promise<{
    totalStudents: number;
    invitedCount: number;
    confirmedCount: number;
    absentRsvpCount: number;
    pendingRsvpCount: number;
    presentStudentCount: number;
    actualAttendeeCount: number;
    unattendedStudentCount: number;
    attendanceRate: number;
    rsvpRate: number;
}> {
    await ensureParentMeetingTables();

    const classWhere = classId ? { meetingId, classId } : { meetingId };

    const [meetingClasses, invitations, attendances] = await Promise.all([
        prisma.parentMeetingClass.findMany({ where: classWhere }),
        prisma.parentMeetingInvitation.findMany({ where: classWhere }),
        prisma.parentMeetingAttendance.findMany({
            where: {
                ...classWhere,
                attendanceStatus: { in: ["PRESENT", "LATE"] },
            },
        }),
    ]);

    const uniqueInvitedStudents = new Set(invitations.map((i) => i.studentId));
    const classStudentsSum = meetingClasses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
    const totalStudents = Math.max(classStudentsSum, uniqueInvitedStudents.size);

    const invitedCount = invitations.length;
    const confirmedStudents = new Set(
        invitations
            .filter((i) => i.rsvpStatus === "CONFIRMED" || i.rsvpStatus === "DELEGATED")
            .map((i) => i.studentId)
    );
    const confirmedCount = confirmedStudents.size;
    const absentRsvpCount = invitations.filter((i) => i.rsvpStatus === "ABSENT").length;
    const pendingRsvpCount = invitations.filter((i) => i.rsvpStatus === "PENDING").length;

    const presentStudentSet = new Set<string>();
    let actualAttendeeCount = 0;

    for (const att of attendances) {
        presentStudentSet.add(att.studentId);
        actualAttendeeCount += Math.max(1, att.attendeeCount || 1);
    }

    const presentStudentCount = presentStudentSet.size;
    const unattendedStudentCount = Math.max(0, totalStudents - presentStudentCount);
    const attendanceRate =
        totalStudents > 0 ? Number(((presentStudentCount / totalStudents) * 100).toFixed(1)) : 0;
    const rsvpRate =
        totalStudents > 0 ? Number(((confirmedCount / totalStudents) * 100).toFixed(1)) : 0;

    return {
        totalStudents,
        invitedCount,
        confirmedCount,
        absentRsvpCount,
        pendingRsvpCount,
        presentStudentCount,
        actualAttendeeCount,
        unattendedStudentCount,
        attendanceRate,
        rsvpRate,
    };
}

/**
 * MODULE 1: Create or Clone a Parent Meeting and automatically populate invitations
 * from existing Student & ParentStudentLink records without duplicating master data.
 */
export async function createOrCloneParentMeeting(
    ctx: ParentMeetingActorContext,
    input: {
        title: string;
        meetingType?: MeetingTypeCode;
        academicYearId: string;
        semester?: string;
        campusId: string;
        grade?: string;
        level?: string;
        startTime: string | Date;
        endTime: string | Date;
        location?: string;
        onlineLink?: string;
        agenda?: string;
        contentSummary?: string;
        hostUserId?: string;
        hostName?: string;
        status?: MeetingStatusCode;
        rsvpOpenAt?: string | Date | null;
        rsvpCloseAt?: string | Date | null;
        checkInOpenAt?: string | Date | null;
        checkInCloseAt?: string | Date | null;
        allowPreQuestions?: boolean;
        classIds: string[];
        roomOverrides?: Record<string, string>;
        clonedFromId?: string;
    }
) {
    await ensureParentMeetingTables();

    if (!input.title || !input.title.trim()) {
        throw new ParentMeetingError("INVALID_INPUT", "Tên cuộc họp không được để trống.");
    }
    if (!input.classIds || input.classIds.length === 0) {
        throw new ParentMeetingError("INVALID_CLASSES", "Phải gán ít nhất một lớp học cho cuộc họp.");
    }

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
        throw new ParentMeetingError(
            "INVALID_TIME_RANGE",
            "Thời gian kết thúc phải lớn hơn thời gian bắt đầu."
        );
    }

    // Verify permissions for each assigned class
    for (const cid of input.classIds) {
        assertCanManageClassMeeting(ctx, cid, input.campusId);
    }

    const dbClasses = await prisma.class.findMany({
        where: { id: { in: input.classIds } },
        include: {
            teachers: {
                include: { teacher: true },
            },
            students: {
                where: { status: "ACTIVE" },
                include: {
                    parents: {
                        include: {
                            parent: true,
                        },
                    },
                },
            },
        },
    });

    if (dbClasses.length === 0) {
        throw new ParentMeetingError("CLASSES_NOT_FOUND", "Không tìm thấy dữ liệu lớp học hợp lệ.");
    }

    const hrTeacherIds = dbClasses
        .map((c) => c.homeroomTeacherId)
        .filter((tid): tid is string => Boolean(tid));
    const hrTeachers =
        hrTeacherIds.length > 0
            ? await prisma.teacher.findMany({ where: { id: { in: hrTeacherIds } } })
            : [];
    const hrTeacherMap = new Map(hrTeachers.map((t) => [t.id, t]));

    const meetingId = crypto.randomUUID();
    const meetingCode = generateShortId("HPH");
    const initialStatus: MeetingStatusCode = input.status || "DRAFT";

    // Default check-in window: 2 hours before start until 4 hours after end
    const checkInOpenAt = input.checkInOpenAt
        ? new Date(input.checkInOpenAt)
        : new Date(startTime.getTime() - 2 * 60 * 60 * 1000);
    const checkInCloseAt = input.checkInCloseAt
        ? new Date(input.checkInCloseAt)
        : new Date(endTime.getTime() + 4 * 60 * 60 * 1000);

    const rsvpOpenAt = input.rsvpOpenAt ? new Date(input.rsvpOpenAt) : new Date();
    const rsvpCloseAt = input.rsvpCloseAt ? new Date(input.rsvpCloseAt) : startTime;

    const meeting = await prisma.parentMeeting.create({
        data: {
            id: meetingId,
            meetingCode,
            title: input.title.trim(),
            meetingType: input.meetingType || "DINH_KY",
            academicYearId: input.academicYearId,
            semester: input.semester || "HK1",
            campusId: input.campusId || dbClasses[0].campusId,
            grade: input.grade || dbClasses[0].grade,
            level: input.level || dbClasses[0].level,
            startTime,
            endTime,
            location: input.location || null,
            onlineLink: input.onlineLink || null,
            agenda: input.agenda || null,
            contentSummary: input.contentSummary || null,
            hostUserId: input.hostUserId || ctx.userId,
            hostName: input.hostName || ctx.userName,
            plannerUserId: ctx.userId,
            plannerName: ctx.userName,
            status: initialStatus,
            rsvpOpenAt,
            rsvpCloseAt,
            checkInOpenAt,
            checkInCloseAt,
            allowPreQuestions: input.allowPreQuestions ?? true,
            publishedAt: initialStatus === "PUBLISHED" ? new Date() : null,
            clonedFromId: input.clonedFromId || null,
        },
    });

    let totalInvitationsCreated = 0;

    for (const cls of dbClasses) {
        const hrTeacher = cls.homeroomTeacherId
            ? hrTeacherMap.get(cls.homeroomTeacherId)
            : cls.teachers.find((t) => t.roleInClass === "GVCN" || t.roleInClass === "HOMEROOM")
                  ?.teacher;

        await prisma.parentMeetingClass.create({
            data: {
                id: crypto.randomUUID(),
                meetingId,
                classId: cls.id,
                className: cls.className,
                grade: cls.grade,
                campusId: cls.campusId,
                homeroomTeacherId: cls.homeroomTeacherId || hrTeacher?.id || null,
                homeroomTeacherName: hrTeacher?.teacherName || null,
                roomOverride: input.roomOverrides?.[cls.id] || input.location || null,
                onlineLinkOverride: input.onlineLink || null,
                totalStudents: cls.students.length,
            },
        });

        for (const student of cls.students) {
            if (student.parents && student.parents.length > 0) {
                for (const link of student.parents) {
                    if (!link.parent) continue;
                    await prisma.parentMeetingInvitation.upsert({
                        where: {
                            meetingId_studentId_parentId: {
                                meetingId,
                                studentId: student.id,
                                parentId: link.parent.id,
                            },
                        },
                        update: {},
                        create: {
                            id: crypto.randomUUID(),
                            meetingId,
                            classId: cls.id,
                            studentId: student.id,
                            studentCode: student.studentCode,
                            studentName: student.studentName,
                            parentId: link.parent.id,
                            parentUserId: link.parent.userId,
                            parentName: link.parent.parentName,
                            parentPhone: link.parent.phone || null,
                            parentEmail: link.parent.email || null,
                            relationship: link.relationship || "PHU_HUYNH",
                            rsvpStatus: "PENDING",
                            expectedHeadcount: 1,
                        },
                    });
                    totalInvitationsCreated++;
                }
            } else {
                const fallbackParentId = `guardian_${student.id}`;
                await prisma.parentMeetingInvitation.upsert({
                    where: {
                        meetingId_studentId_parentId: {
                            meetingId,
                            studentId: student.id,
                            parentId: fallbackParentId,
                        },
                    },
                    update: {},
                    create: {
                        id: crypto.randomUUID(),
                        meetingId,
                        classId: cls.id,
                        studentId: student.id,
                        studentCode: student.studentCode,
                        studentName: student.studentName,
                        parentId: fallbackParentId,
                        parentUserId: null,
                        parentName: `PHHS em ${student.studentName}`,
                        parentPhone: null,
                        parentEmail: null,
                        relationship: "PHU_HUYNH",
                        rsvpStatus: "PENDING",
                        expectedHeadcount: 1,
                    },
                });
                totalInvitationsCreated++;
            }
        }
    }

    if (initialStatus === "PUBLISHED") {
        await notifyMeetingParticipants(meetingId, "PUBLISH");
    }

    await recordMeetingAuditLog({
        meetingId,
        actor: ctx,
        action: input.clonedFromId ? "CLONE_MEETING" : "CREATE_MEETING",
        targetType: "ParentMeeting",
        targetId: meetingId,
        metadata: {
            meetingCode,
            title: meeting.title,
            classCount: dbClasses.length,
            invitationsCount: totalInvitationsCreated,
            status: initialStatus,
        },
    });

    return {
        meeting,
        classCount: dbClasses.length,
        invitationsCount: totalInvitationsCreated,
    };
}

/**
 * Sends in-app notifications to invited parents when a meeting is published, rescheduled, or cancelled.
 */
export async function notifyMeetingParticipants(
    meetingId: string,
    eventType: "PUBLISH" | "UPDATE" | "CANCEL"
): Promise<number> {
    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: meetingId },
        include: { invitations: true },
    });
    if (!meeting) return 0;

    const parentUserIds = Array.from(
        new Set(
            meeting.invitations
                .map((inv) => inv.parentUserId)
                .filter((uid): uid is string => Boolean(uid))
        )
    );

    const titleMap = {
        PUBLISH: `[Họp Phụ huynh] Thư mời: ${meeting.title}`,
        UPDATE: `[Họp Phụ huynh] Cập nhật lịch họp: ${meeting.title}`,
        CANCEL: `[Họp Phụ huynh] Thông báo hủy lịch họp: ${meeting.title}`,
    };

    const bodyMap = {
        PUBLISH: `Nhà trường trân trọng kính mời Quý Phụ huynh tham dự "${meeting.title}". Vui lòng xác nhận tham dự và nhận mã QR điểm danh trên Cổng Phụ huynh.`,
        UPDATE: `Thông tin cuộc họp "${meeting.title}" vừa được cập nhật. Quý Phụ huynh vui lòng kiểm tra lại thời gian/địa điểm.`,
        CANCEL: `Cuộc họp "${meeting.title}" đã được tạm hoãn/hủy. Lý do: ${meeting.cancelReason || "Theo kế hoạch điều chỉnh của Nhà trường"}.`,
    };

    let notifiedCount = 0;
    for (const uid of parentUserIds) {
        try {
            await prisma.notification.create({
                data: {
                    userId: uid,
                    title: titleMap[eventType],
                    message: bodyMap[eventType],
                    type: "PARENT_MEETING",
                    link: `/parent/hop-phu-huynh?meetingId=${meetingId}`,
                },
            });
            notifiedCount++;
        } catch {
            // Continue if individual notification fails
        }
    }

    await prisma.parentMeetingInvitation.updateMany({
        where: { meetingId },
        data: { notifiedAt: new Date() },
    });

    return notifiedCount;
}

/**
 * MODULE 1: Update meeting information, status transitions (DRAFT -> PENDING_APPROVAL -> PUBLISHED -> IN_PROGRESS -> COMPLETED / CANCELLED),
 * or class preparation content.
 */
export async function updateParentMeeting(
    ctx: ParentMeetingActorContext,
    meetingId: string,
    input: {
        title?: string;
        meetingType?: MeetingTypeCode;
        startTime?: string | Date;
        endTime?: string | Date;
        location?: string;
        onlineLink?: string;
        agenda?: string;
        contentSummary?: string;
        status?: MeetingStatusCode;
        cancelReason?: string;
        rsvpOpenAt?: string | Date | null;
        rsvpCloseAt?: string | Date | null;
        checkInOpenAt?: string | Date | null;
        checkInCloseAt?: string | Date | null;
        allowPreQuestions?: boolean;
        classIdForPrep?: string;
        preparationNotes?: string;
        roomOverride?: string;
        onlineLinkOverride?: string;
    }
) {
    await ensureParentMeetingTables();

    const existing = await prisma.parentMeeting.findUnique({
        where: { id: meetingId },
        include: { classes: true },
    });

    if (!existing) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    if (input.classIdForPrep) {
        assertCanManageClassMeeting(ctx, input.classIdForPrep, existing.campusId);
        await prisma.parentMeetingClass.updateMany({
            where: { meetingId, classId: input.classIdForPrep },
            data: {
                preparationNotes: input.preparationNotes ?? undefined,
                roomOverride: input.roomOverride ?? undefined,
                onlineLinkOverride: input.onlineLinkOverride ?? undefined,
                updatedAt: new Date(),
            },
        });
    } else {
        // Check permission on at least one class or campus
        const canManageAny =
            ctx.isSuperAdmin ||
            ctx.isAdmin ||
            ctx.isKTDBCL ||
            (ctx.isGDCS &&
                (ctx.allowedCampusIds.length === 0 ||
                    ctx.allowedCampusIds.includes(existing.campusId))) ||
            existing.plannerUserId === ctx.userId ||
            existing.hostUserId === ctx.userId ||
            existing.classes.some((c) => ctx.homeroomClassIds.includes(c.classId));

        if (!canManageAny) {
            throw new ParentMeetingError(
                "FORBIDDEN_MEETING_UPDATE",
                "Bạn không có quyền chỉnh sửa cuộc họp này.",
                403
            );
        }
    }

    const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.meetingType !== undefined) updateData.meetingType = input.meetingType;
    if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
    if (input.endTime !== undefined) updateData.endTime = new Date(input.endTime);
    if (input.location !== undefined) updateData.location = input.location;
    if (input.onlineLink !== undefined) updateData.onlineLink = input.onlineLink;
    if (input.agenda !== undefined) updateData.agenda = input.agenda;
    if (input.contentSummary !== undefined) updateData.contentSummary = input.contentSummary;
    if (input.allowPreQuestions !== undefined) updateData.allowPreQuestions = input.allowPreQuestions;
    if (input.rsvpOpenAt !== undefined)
        updateData.rsvpOpenAt = input.rsvpOpenAt ? new Date(input.rsvpOpenAt) : null;
    if (input.rsvpCloseAt !== undefined)
        updateData.rsvpCloseAt = input.rsvpCloseAt ? new Date(input.rsvpCloseAt) : null;
    if (input.checkInOpenAt !== undefined)
        updateData.checkInOpenAt = input.checkInOpenAt ? new Date(input.checkInOpenAt) : null;
    if (input.checkInCloseAt !== undefined)
        updateData.checkInCloseAt = input.checkInCloseAt ? new Date(input.checkInCloseAt) : null;

    if (input.status !== undefined && input.status !== existing.status) {
        updateData.status = input.status;
        if (input.status === "PUBLISHED") {
            updateData.publishedAt = new Date();
            if (ctx.isAdmin || ctx.isGDCS || ctx.isKTDBCL) {
                updateData.approvedByUserId = ctx.userId;
                updateData.approvedByName = ctx.userName;
                updateData.approvedAt = new Date();
            }
        }
        if (input.status === "CANCELLED") {
            updateData.cancelReason = input.cancelReason || "Hủy theo điều chỉnh kế hoạch";
            // Revoke all active QR sessions when a meeting is cancelled
            await prisma.parentMeetingQrSession.updateMany({
                where: { meetingId, status: "ACTIVE" },
                data: { status: "REVOKED", updatedAt: new Date() },
            });
        }
    }

    const updated = await prisma.parentMeeting.update({
        where: { id: meetingId },
        data: updateData,
    });

    if (input.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        await notifyMeetingParticipants(meetingId, "PUBLISH");
    } else if (input.status === "CANCELLED" && existing.status !== "CANCELLED") {
        await notifyMeetingParticipants(meetingId, "CANCEL");
    } else if (input.startTime || input.location || input.onlineLink) {
        if (updated.status === "PUBLISHED" || updated.status === "IN_PROGRESS") {
            await notifyMeetingParticipants(meetingId, "UPDATE");
        }
    }

    await recordMeetingAuditLog({
        meetingId,
        classId: input.classIdForPrep || null,
        actor: ctx,
        action: input.status ? `CHANGE_STATUS_${input.status}` : "UPDATE_MEETING",
        targetType: "ParentMeeting",
        targetId: meetingId,
        metadata: {
            previousStatus: existing.status,
            newStatus: updated.status,
            cancelReason: input.cancelReason || null,
        },
    });

    return updated;
}

/**
 * MODULE 2: Parent RSVP Confirmation / Absence / Substitute Representative
 */
export async function submitParentRsvp(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        studentId: string;
        rsvpStatus: RsvpStatusCode;
        attendeeRole?: AttendeeRoleCode;
        attendeeName?: string;
        attendeePhone?: string;
        delegateRelationship?: string;
        absenceReason?: string;
        expectedHeadcount?: number;
        rsvpNote?: string;
    }
) {
    await ensureParentMeetingTables();

    const studentInfo = assertParentOwnsStudent(ctx, params.studentId);
    if (!ctx.parentId) {
        throw new ParentMeetingError("PARENT_NOT_FOUND", "Không tìm thấy hồ sơ phụ huynh.", 403);
    }

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
    });

    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    if (meeting.status === "CANCELLED" || meeting.status === "COMPLETED") {
        throw new ParentMeetingError(
            "MEETING_CLOSED_FOR_RSVP",
            `Cuộc họp hiện ở trạng thái "${meeting.status}" nên không thể cập nhật xác nhận tham dự.`
        );
    }

    const roleConfig = params.attendeeRole ? ATTENDEE_ROLES[params.attendeeRole] : undefined;
    const defaultHeadcount = roleConfig?.defaultHeadcount || 1;
    const expectedHeadcount =
        params.rsvpStatus === "ABSENT"
            ? 0
            : Math.max(1, Math.min(4, params.expectedHeadcount ?? defaultHeadcount));

    const invitation = await prisma.parentMeetingInvitation.upsert({
        where: {
            meetingId_studentId_parentId: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: ctx.parentId,
            },
        },
        update: {
            rsvpStatus: params.rsvpStatus,
            attendeeRole: params.attendeeRole || "BO",
            attendeeName: params.attendeeName || ctx.userName,
            attendeePhone: params.attendeePhone || null,
            delegateRelationship: params.delegateRelationship || null,
            absenceReason: params.absenceReason || null,
            expectedHeadcount,
            rsvpNote: params.rsvpNote || null,
            rsvpUpdatedAt: new Date(),
            updatedAt: new Date(),
        },
        create: {
            id: crypto.randomUUID(),
            meetingId: params.meetingId,
            classId: studentInfo.classId,
            studentId: params.studentId,
            studentCode: studentInfo.studentCode,
            studentName: studentInfo.studentName,
            parentId: ctx.parentId,
            parentUserId: ctx.userId,
            parentName: ctx.userName,
            relationship: studentInfo.relationship,
            rsvpStatus: params.rsvpStatus,
            attendeeRole: params.attendeeRole || "BO",
            attendeeName: params.attendeeName || ctx.userName,
            attendeePhone: params.attendeePhone || null,
            delegateRelationship: params.delegateRelationship || null,
            absenceReason: params.absenceReason || null,
            expectedHeadcount,
            rsvpNote: params.rsvpNote || null,
            rsvpUpdatedAt: new Date(),
        },
    });

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: studentInfo.classId,
        actor: ctx,
        action: `RSVP_${params.rsvpStatus}`,
        targetType: "ParentMeetingInvitation",
        targetId: invitation.id,
        metadata: {
            studentId: params.studentId,
            rsvpStatus: params.rsvpStatus,
            attendeeRole: params.attendeeRole,
            expectedHeadcount,
        },
    });

    return invitation;
}

/**
 * MODULE 2 & 3: Issue or Refresh a Secure QR Session for an authorized Parent + Student + Meeting.
 */
export async function issueParentMeetingQr(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        studentId: string;
        forceRefresh?: boolean;
    }
) {
    await ensureParentMeetingTables();

    const studentInfo = assertParentOwnsStudent(ctx, params.studentId);
    if (!ctx.parentId) {
        throw new ParentMeetingError("PARENT_NOT_FOUND", "Không tìm thấy hồ sơ phụ huynh.", 403);
    }

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
        include: { classes: true },
    });

    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    if (meeting.status === "CANCELLED") {
        throw new ParentMeetingError(
            "MEETING_CANCELLED",
            "Cuộc họp đã bị hủy nên không thể phát hành mã QR."
        );
    }

    if (meeting.status === "DRAFT" || meeting.status === "PENDING_APPROVAL") {
        throw new ParentMeetingError(
            "MEETING_NOT_PUBLISHED",
            "Cuộc họp chưa được công bố chính thức."
        );
    }

    const assignedClassIds = meeting.classes.map((c) => c.classId);
    if (!assignedClassIds.includes(studentInfo.classId)) {
        throw new ParentMeetingError(
            "STUDENT_CLASS_NOT_IN_MEETING",
            "Lớp của học sinh không thuộc danh sách tham dự cuộc họp này.",
            403
        );
    }

    const existingAttendance = await prisma.parentMeetingAttendance.findUnique({
        where: {
            meetingId_studentId_parentId: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: ctx.parentId,
            },
        },
    });

    const invitation = await prisma.parentMeetingInvitation.findUnique({
        where: {
            meetingId_studentId_parentId: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: ctx.parentId,
            },
        },
    });

    const now = new Date();
    const defaultExpiry = new Date(
        Math.max(
            meeting.endTime.getTime() + 4 * 60 * 60 * 1000,
            now.getTime() + 12 * 60 * 60 * 1000
        )
    );
    const expiresAt = meeting.checkInCloseAt && meeting.checkInCloseAt > now
        ? meeting.checkInCloseAt
        : defaultExpiry;

    if (!params.forceRefresh) {
        const activeSession = await prisma.parentMeetingQrSession.findFirst({
            where: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: ctx.parentId,
                status: "ACTIVE",
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: "desc" },
        });

        if (activeSession) {
            const qrDataUrl = await generateQrCodeDataUrl(activeSession.qrToken);
            return {
                qrSession: activeSession,
                qrDataUrl,
                student: studentInfo,
                meeting,
                invitation,
                attendance: existingAttendance,
            };
        }
    } else {
        await prisma.parentMeetingQrSession.updateMany({
            where: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: ctx.parentId,
                status: "ACTIVE",
            },
            data: { status: "REVOKED", updatedAt: now },
        });
    }

    const sessionId = crypto.randomUUID();
    const { qrToken, tokenHash, nonce } = signParentMeetingQrToken({
        sessionId,
        meetingId: params.meetingId,
        classId: studentInfo.classId,
        studentId: params.studentId,
        parentId: ctx.parentId,
        expiresAt,
        issuedAt: now,
    });

    const qrSession = await prisma.parentMeetingQrSession.create({
        data: {
            id: sessionId,
            tokenHash,
            qrToken,
            meetingId: params.meetingId,
            classId: studentInfo.classId,
            studentId: params.studentId,
            parentId: ctx.parentId,
            issuedToUserId: ctx.userId,
            attendeeRole: invitation?.attendeeRole || studentInfo.relationship || "PHU_HUYNH",
            attendeeName: invitation?.attendeeName || ctx.userName,
            status: "ACTIVE",
            expiresAt,
            nonce,
        },
    });

    const qrDataUrl = await generateQrCodeDataUrl(qrToken);

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: studentInfo.classId,
        actor: ctx,
        action: "ISSUE_QR_TOKEN",
        targetType: "ParentMeetingQrSession",
        targetId: qrSession.id,
        metadata: {
            studentId: params.studentId,
            expiresAt: expiresAt.toISOString(),
        },
    });

    return {
        qrSession,
        qrDataUrl,
        student: studentInfo,
        meeting,
        invitation,
        attendance: existingAttendance,
    };
}

/**
 * MODULE 3: Verify & Record QR Attendance with Anti-Replay, Expiration Check, Cross-Class RBAC,
 * and Idempotent Concurrency Control (preventing duplicate records when 2 teachers scan simultaneously).
 */
export async function verifyAndCheckInQrToken(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        qrToken: string;
        mode?: "PREVIEW" | "CONFIRM";
        attendeeRole?: AttendeeRoleCode;
        attendeeName?: string;
        attendeeCount?: number;
        relationshipNote?: string;
        referenceNow?: Date;
    }
) {
    await ensureParentMeetingTables();
    const now = params.referenceNow || new Date();
    const mode = params.mode || "CONFIRM";

    // 1. Cryptographic signature, meetingId match, and expiration verification
    const verifyResult = verifyParentMeetingQrToken(params.qrToken, params.meetingId, now);
    if (!verifyResult.valid) {
        throw new ParentMeetingError(verifyResult.errorCode, verifyResult.messageVi, 400);
    }

    const { payload, tokenHash } = verifyResult;

    // 2. Verify scanner has permission for the student's class in this meeting
    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: payload.mid },
        include: { classes: true },
    });

    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    if (meeting.status === "CANCELLED") {
        throw new ParentMeetingError(
            "MEETING_CANCELLED",
            "Cuộc họp này đã bị hủy, không thể thực hiện điểm danh.",
            400
        );
    }

    const meetingClass = meeting.classes.find((c) => c.classId === payload.cid);
    if (!meetingClass) {
        throw new ParentMeetingError(
            "CLASS_NOT_IN_MEETING",
            "Lớp học trong mã QR không thuộc cuộc họp này.",
            400
        );
    }

    // Strict RBAC check: GVCN of another class cannot scan this class
    assertCanManageClassMeeting(ctx, payload.cid, meeting.campusId);

    // 3. Look up QR session in DB
    const qrSession = await prisma.parentMeetingQrSession.findUnique({
        where: { tokenHash },
    });

    if (!qrSession) {
        throw new ParentMeetingError(
            "QR_SESSION_NOT_FOUND",
            "Phiên mã QR không tồn tại trên hệ thống.",
            404
        );
    }

    if (qrSession.status === "REVOKED" || qrSession.status === "EXPIRED") {
        throw new ParentMeetingError(
            "TOKEN_EXPIRED",
            "Phiên mã QR đã bị thu hồi hoặc hết hiệu lực.",
            400
        );
    }

    if (now.getTime() > qrSession.expiresAt.getTime()) {
        await prisma.parentMeetingQrSession.update({
            where: { id: qrSession.id },
            data: { status: "EXPIRED", updatedAt: now },
        });
        throw new ParentMeetingError(
            "TOKEN_EXPIRED",
            "Mã QR đã quá thời hạn hiệu lực.",
            400
        );
    }

    const [student, parent, invitation, existingAttendance] = await Promise.all([
        prisma.student.findUnique({ where: { id: payload.stid } }),
        prisma.parent.findUnique({ where: { id: payload.pid } }),
        prisma.parentMeetingInvitation.findUnique({
            where: {
                meetingId_studentId_parentId: {
                    meetingId: payload.mid,
                    studentId: payload.stid,
                    parentId: payload.pid,
                },
            },
        }),
        prisma.parentMeetingAttendance.findUnique({
            where: {
                meetingId_studentId_parentId: {
                    meetingId: payload.mid,
                    studentId: payload.stid,
                    parentId: payload.pid,
                },
            },
        }),
    ]);

    if (mode === "PREVIEW") {
        return {
            mode: "PREVIEW",
            alreadyCheckedIn: Boolean(existingAttendance),
            student: {
                id: payload.stid,
                studentCode: student?.studentCode || invitation?.studentCode || "",
                fullName: student?.studentName || invitation?.studentName || "Học sinh",
                classId: payload.cid,
                className: meetingClass.className,
            },
            parent: {
                id: payload.pid,
                fullName: parent?.parentName || invitation?.parentName || qrSession.attendeeName || "Phụ huynh",
                phone: parent?.phone || invitation?.parentPhone || "",
                relationship: invitation?.relationship || qrSession.attendeeRole || "PHU_HUYNH",
            },
            invitation,
            existingAttendance,
        };
    }

    // Mode === CONFIRM: Handle replay & concurrent scan idempotently
    if (existingAttendance || qrSession.status === "USED") {
        if (existingAttendance) {
            await prisma.parentMeetingQrSession.update({
                where: { id: qrSession.id },
                data: {
                    status: "USED",
                    scanCount: { increment: 1 },
                    lastScannedAt: now,
                    lastScannedByUserId: ctx.userId,
                    updatedAt: now,
                },
            });

            return {
                mode: "CONFIRM",
                alreadyCheckedIn: true,
                messageVi: "Phụ huynh của học sinh này đã được điểm danh trước đó (Không tạo bản ghi trùng).",
                attendance: existingAttendance,
                student: {
                    id: payload.stid,
                    fullName: student?.studentName || invitation?.studentName || "Học sinh",
                    className: meetingClass.className,
                },
            };
        }
    }

    const chosenRole: AttendeeRoleCode =
        params.attendeeRole ||
        (invitation?.attendeeRole as AttendeeRoleCode) ||
        (qrSession.attendeeRole as AttendeeRoleCode) ||
        "BO";
    const defaultHeadcount = ATTENDEE_ROLES[chosenRole]?.defaultHeadcount || 1;
    const attendeeCount = Math.max(1, Math.min(4, params.attendeeCount ?? defaultHeadcount));
    const attendeeName =
        params.attendeeName ||
        invitation?.attendeeName ||
        parent?.parentName ||
        qrSession.attendeeName ||
        "Phụ huynh";

    const isLate = now.getTime() > meeting.startTime.getTime() + 15 * 60 * 1000;
    const idempotencyKey = `qr_${payload.mid}_${payload.stid}_${payload.pid}`;

    let attendanceRecord;
    let wasAlreadyCreatedByConcurrentScan = false;

    try {
        attendanceRecord = await prisma.parentMeetingAttendance.create({
            data: {
                id: crypto.randomUUID(),
                meetingId: payload.mid,
                classId: payload.cid,
                studentId: payload.stid,
                studentName: student?.studentName || invitation?.studentName || "Học sinh",
                parentId: payload.pid,
                qrSessionId: qrSession.id,
                checkInMethod: "QR_SCAN",
                attendanceStatus: isLate ? "LATE" : "PRESENT",
                attendeeName,
                attendeeRole: chosenRole,
                attendeeCount,
                relationshipNote: params.relationshipNote || null,
                isLate,
                checkedInAt: now,
                verifiedByUserId: ctx.userId,
                verifiedByName: ctx.userName,
                idempotencyKey,
            },
        });
    } catch {
        // Unique constraint hit due to concurrent scan by another teacher at the exact same millisecond
        wasAlreadyCreatedByConcurrentScan = true;
        attendanceRecord = await prisma.parentMeetingAttendance.findUnique({
            where: {
                meetingId_studentId_parentId: {
                    meetingId: payload.mid,
                    studentId: payload.stid,
                    parentId: payload.pid,
                },
            },
        });
    }

    await prisma.parentMeetingQrSession.update({
        where: { id: qrSession.id },
        data: {
            status: "USED",
            scanCount: { increment: 1 },
            firstScannedAt: qrSession.firstScannedAt || now,
            lastScannedAt: now,
            lastScannedByUserId: ctx.userId,
            updatedAt: now,
        },
    });

    await recordMeetingAuditLog({
        meetingId: payload.mid,
        classId: payload.cid,
        actor: ctx,
        action: wasAlreadyCreatedByConcurrentScan ? "QR_CHECKIN_CONCURRENT_DEDUP" : "QR_CHECKIN_SUCCESS",
        targetType: "ParentMeetingAttendance",
        targetId: attendanceRecord?.id || idempotencyKey,
        metadata: {
            studentId: payload.stid,
            parentId: payload.pid,
            attendeeRole: chosenRole,
            attendeeCount,
            isLate,
        },
    });

    return {
        mode: "CONFIRM",
        alreadyCheckedIn: wasAlreadyCreatedByConcurrentScan,
        messageVi: wasAlreadyCreatedByConcurrentScan
            ? "Phụ huynh đã được ghi nhận điểm danh đồng thời (Không tạo bản ghi trùng)."
            : "Điểm danh QR thành công!",
        attendance: attendanceRecord,
        student: {
            id: payload.stid,
            fullName: student?.studentName || invitation?.studentName || "Học sinh",
            className: meetingClass.className,
        },
    };
}

/**
 * MODULE 3: Manual Check-In with Mandatory Reason & Verifier (Handles No Phone, Broken QR,
 * Offline, Two Guardians Attending, Substitute Representative, Late Arrival).
 */
export async function recordManualAttendance(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        classId: string;
        studentId: string;
        parentId?: string;
        attendeeName: string;
        attendeeRole: AttendeeRoleCode;
        attendeeCount?: number;
        manualReason: ManualCheckInReasonCode;
        relationshipNote?: string;
        isLate?: boolean;
    }
) {
    await ensureParentMeetingTables();

    if (!params.manualReason) {
        throw new ParentMeetingError(
            "MANUAL_REASON_REQUIRED",
            "Điểm danh thủ công bắt buộc phải chọn lý do ngoại lệ."
        );
    }

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
    });
    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }
    if (meeting.status === "CANCELLED") {
        throw new ParentMeetingError(
            "MEETING_CANCELLED",
            "Cuộc họp đã bị hủy, không thể điểm danh.",
            400
        );
    }

    assertCanManageClassMeeting(ctx, params.classId, meeting.campusId);

    const student = await prisma.student.findUnique({ where: { id: params.studentId } });
    const resolvedParentId = params.parentId || `manual_guardian_${params.studentId}`;
    const defaultHeadcount =
        params.manualReason === "TWO_GUARDIANS" || params.attendeeRole === "CA_BO_VA_ME"
            ? 2
            : ATTENDEE_ROLES[params.attendeeRole]?.defaultHeadcount || 1;
    const attendeeCount = Math.max(1, Math.min(4, params.attendeeCount ?? defaultHeadcount));
    const now = new Date();
    const isLate =
        params.isLate ??
        (params.manualReason === "LATE_ARRIVAL" ||
            now.getTime() > meeting.startTime.getTime() + 15 * 60 * 1000);
    const idempotencyKey = `manual_${params.meetingId}_${params.studentId}_${resolvedParentId}`;

    const attendance = await prisma.parentMeetingAttendance.upsert({
        where: {
            meetingId_studentId_parentId: {
                meetingId: params.meetingId,
                studentId: params.studentId,
                parentId: resolvedParentId,
            },
        },
        update: {
            checkInMethod: "MANUAL",
            attendanceStatus: isLate ? "LATE" : "PRESENT",
            attendeeName: params.attendeeName.trim(),
            attendeeRole: params.attendeeRole,
            attendeeCount,
            manualReason: params.manualReason,
            relationshipNote: params.relationshipNote || null,
            isLate,
            verifiedByUserId: ctx.userId,
            verifiedByName: ctx.userName,
            updatedAt: now,
        },
        create: {
            id: crypto.randomUUID(),
            meetingId: params.meetingId,
            classId: params.classId,
            studentId: params.studentId,
            studentName: student?.studentName || "Học sinh",
            parentId: resolvedParentId,
            checkInMethod: "MANUAL",
            attendanceStatus: isLate ? "LATE" : "PRESENT",
            attendeeName: params.attendeeName.trim(),
            attendeeRole: params.attendeeRole,
            attendeeCount,
            manualReason: params.manualReason,
            relationshipNote: params.relationshipNote || null,
            isLate,
            checkedInAt: now,
            verifiedByUserId: ctx.userId,
            verifiedByName: ctx.userName,
            idempotencyKey,
        },
    });

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: params.classId,
        actor: ctx,
        action: "MANUAL_CHECKIN",
        targetType: "ParentMeetingAttendance",
        targetId: attendance.id,
        metadata: {
            studentId: params.studentId,
            parentId: resolvedParentId,
            manualReason: params.manualReason,
            attendeeRole: params.attendeeRole,
            attendeeCount,
            verifiedByName: ctx.userName,
        },
    });

    return attendance;
}

/**
 * MODULE 5: Create Feedback / Opinion (Pre-Meeting, During-Meeting, Post-Meeting),
 * seamlessly bridging with CommunicationThread & CommunicationCase in Module Trao đổi & Đồng hành.
 */
export async function createParentMeetingFeedback(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        classId?: string;
        studentId: string;
        stage: FeedbackStageCode;
        topicGroup: FeedbackTopicGroupCode;
        title?: string;
        content: string;
        attachments?: Array<{ fileName: string; fileUrl: string; fileType?: string; fileSize?: number }>;
        visibilityScope?: FeedbackVisibilityCode;
        allowShareInSummary?: boolean;
        dueAt?: string | Date;
    }
) {
    await ensureParentMeetingTables();

    if (!params.content || !params.content.trim()) {
        throw new ParentMeetingError("EMPTY_FEEDBACK", "Nội dung ý kiến không được để trống.");
    }

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
        include: { classes: true },
    });
    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    let resolvedClassId = params.classId || "";
    let resolvedStudentName = "";
    let resolvedParentId = ctx.parentId || "";
    let resolvedParentName = ctx.userName;

    if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
        const studentInfo = assertParentOwnsStudent(ctx, params.studentId);
        resolvedClassId = studentInfo.classId;
        resolvedStudentName = studentInfo.studentName;
        resolvedParentId = ctx.parentId || `parent_${ctx.userId}`;
    } else {
        // Teacher or Admin recording direct feedback during meeting on behalf of a parent
        const student = await prisma.student.findUnique({
            where: { id: params.studentId },
            include: { parents: { include: { parent: true } } },
        });
        if (!student) {
            throw new ParentMeetingError("STUDENT_NOT_FOUND", "Không tìm thấy học sinh.", 404);
        }
        resolvedClassId = params.classId || student.classId;
        assertCanManageClassMeeting(ctx, resolvedClassId, meeting.campusId);
        resolvedStudentName = student.studentName;
        const primaryParent = student.parents[0]?.parent;
        resolvedParentId = primaryParent?.id || `guardian_${student.id}`;
        resolvedParentName = primaryParent?.parentName || `PHHS em ${student.studentName}`;
    }

    // Resolve class GVCN as default receiver and assignee
    const classRecord = await prisma.class.findUnique({
        where: { id: resolvedClassId },
    });
    const hrTeacher = classRecord?.homeroomTeacherId
        ? await prisma.teacher.findUnique({ where: { id: classRecord.homeroomTeacherId } })
        : null;

    const receiverUserId = hrTeacher?.userId || meeting.hostUserId || ctx.userId;
    const receiverName = hrTeacher?.teacherName || meeting.hostName || "GVCN";
    const receiverTeacherId = hrTeacher?.id || null;

    const topicConfig = FEEDBACK_TOPIC_GROUPS[params.topicGroup] || FEEDBACK_TOPIC_GROUPS.KET_QUA_HOC_TAP;
    const dueAt = params.dueAt
        ? new Date(params.dueAt)
        : calculateBusinessHoursSlaDue(new Date(), topicConfig.slaHours);

    const feedbackTitle =
        params.title?.trim() || `[${meeting.meetingCode}] ${topicConfig.labelVi} - ${resolvedStudentName}`;

    // Bridge with CommunicationThread & CommunicationCase (Trao đổi & Đồng hành)
    const threadId = crypto.randomUUID();
    const caseId = crypto.randomUUID();
    const feedbackCode = generateShortId("YKPH");
    const caseCode = generateShortId("THPH");

    await prisma.communicationThread.create({
        data: {
            id: threadId,
            threadCode: feedbackCode,
            threadType: "PARENT_GVCN",
            academicYearId: meeting.academicYearId,
            campusId: meeting.campusId,
            classId: resolvedClassId,
            studentId: params.studentId,
            parentId: resolvedParentId,
            teacherId: receiverTeacherId || "HOMEROOM_DEFAULT",
            topic: topicConfig.coordinationTopicCode,
            subjectTitle: feedbackTitle,
            priority: "NORMAL",
            status: "NEW",
            visibility: params.visibilityScope || "PRIVATE",
            slaDueAt: dueAt,
            createdByUserId: ctx.userId,
            lastMessageAt: new Date(),
            lastMessagePreview: params.content.trim().slice(0, 160),
        },
    });

    await prisma.communicationMessage.create({
        data: {
            id: crypto.randomUUID(),
            threadId,
            senderUserId: ctx.userId,
            senderRole: ctx.isParent ? "PARENT" : "GVCN",
            senderName: ctx.userName,
            messageType: "TEXT",
            content: params.content.trim(),
            isInternalNote: false,
            readByJson: JSON.stringify([ctx.userId]),
        },
    });

    await prisma.communicationCase.create({
        data: {
            id: caseId,
            caseCode,
            threadId,
            academicYearId: meeting.academicYearId,
            campusId: meeting.campusId,
            classId: resolvedClassId,
            studentId: params.studentId,
            parentId: resolvedParentId,
            teacherId: receiverTeacherId,
            createdByUserId: ctx.userId,
            requesterRole: ctx.isParent ? "PARENT" : "GVCN",
            assignedToUserId: receiverUserId,
            assignedToName: receiverName,
            assignedRole: "GVCN",
            category: topicConfig.coordinationTopicCode,
            title: feedbackTitle,
            description: params.content.trim(),
            priority: "NORMAL",
            status: "NEW",
            slaTargetHours: topicConfig.slaHours,
            slaDueAt: dueAt,
        },
    });

    const feedbackLink = await prisma.parentMeetingFeedbackLink.create({
        data: {
            id: crypto.randomUUID(),
            feedbackCode,
            meetingId: params.meetingId,
            classId: resolvedClassId,
            campusId: meeting.campusId,
            academicYearId: meeting.academicYearId,
            studentId: params.studentId,
            studentName: resolvedStudentName,
            parentId: resolvedParentId,
            parentName: resolvedParentName,
            threadId,
            caseId,
            stage: params.stage || "PRE_MEETING",
            topicGroup: params.topicGroup || "KET_QUA_HOC_TAP",
            title: feedbackTitle,
            content: params.content.trim(),
            attachmentsJson: params.attachments ? JSON.stringify(params.attachments) : null,
            visibilityScope: params.visibilityScope || "PRIVATE",
            isAnonymousInMinutes: true,
            allowShareInSummary: params.allowShareInSummary ?? false,
            receiverUserId,
            receiverName,
            assigneeUserId: receiverUserId,
            assigneeName: receiverName,
            assigneeRole: "GVCN",
            dueAt,
            businessStatus: "NEW",
        },
    });

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: resolvedClassId,
        actor: ctx,
        action: "CREATE_FEEDBACK",
        targetType: "ParentMeetingFeedbackLink",
        targetId: feedbackLink.id,
        metadata: {
            feedbackCode,
            stage: params.stage,
            topicGroup: params.topicGroup,
            visibilityScope: feedbackLink.visibilityScope,
        },
    });

    return feedbackLink;
}

/**
 * MODULE 5: Multi-turn Reply, Forward to GVBM/CVHT/Department, Update Business Status, or Submit CSAT Rating.
 */
export async function interactWithMeetingFeedback(
    ctx: ParentMeetingActorContext,
    params: {
        feedbackId: string;
        action: "REPLY" | "FORWARD" | "UPDATE_STATUS" | "RATE_CSAT";
        messageContent?: string;
        newStatus?: FeedbackBusinessStatusCode;
        targetAssigneeUserId?: string;
        targetAssigneeName?: string;
        targetAssigneeRole?: string;
        dueAt?: string | Date;
        allowShareInSummary?: boolean;
        visibilityScope?: FeedbackVisibilityCode;
        csatScore?: number;
        csatComment?: string;
    }
) {
    await ensureParentMeetingTables();

    const feedback = await prisma.parentMeetingFeedbackLink.findUnique({
        where: { id: params.feedbackId },
    });
    if (!feedback) {
        throw new ParentMeetingError("FEEDBACK_NOT_FOUND", "Không tìm thấy ý kiến góp ý.", 404);
    }

    // Check access permissions
    if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
        assertParentOwnsStudent(ctx, feedback.studentId);
    } else if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
        const isHomeroom = ctx.homeroomClassIds.includes(feedback.classId);
        const isAssignee =
            feedback.assigneeUserId === ctx.userId || feedback.receiverUserId === ctx.userId;
        if (!isHomeroom && !isAssignee) {
            throw new ParentMeetingError(
                "FORBIDDEN_FEEDBACK_ACCESS",
                "Bạn không có quyền xử lý ý kiến thuộc lớp khác hoặc chưa được phân công.",
                403
            );
        }
    }

    const now = new Date();

    if (params.action === "RATE_CSAT") {
        assertParentOwnsStudent(ctx, feedback.studentId);
        const score = Math.max(1, Math.min(5, Number(params.csatScore || 5)));

        const updated = await prisma.parentMeetingFeedbackLink.update({
            where: { id: feedback.id },
            data: {
                csatScore: score,
                csatComment: params.csatComment || null,
                csatRatedAt: now,
                businessStatus: "COMPLETED",
                updatedAt: now,
            },
        });

        if (feedback.caseId) {
            await prisma.communicationCase.update({
                where: { id: feedback.caseId },
                data: { status: "COMPLETED", completedAt: now, parentConfirmedAt: now, updatedAt: now },
            });
            await prisma.communicationSatisfaction.upsert({
                where: { caseId: feedback.caseId },
                update: {
                    csatScore: score,
                    comment: params.csatComment || null,
                },
                create: {
                    id: crypto.randomUUID(),
                    caseId: feedback.caseId,
                    threadId: feedback.threadId,
                    parentId: feedback.parentId,
                    studentId: feedback.studentId,
                    academicYearId: feedback.academicYearId,
                    campusId: feedback.campusId,
                    classId: feedback.classId,
                    csatScore: score,
                    comment: params.csatComment || null,
                    isResolvedConfirmed: true,
                },
            });
        }

        return updated;
    }

    if (params.action === "FORWARD") {
        if (!params.targetAssigneeUserId || !params.targetAssigneeName) {
            throw new ParentMeetingError(
                "INVALID_ASSIGNEE",
                "Vui lòng chọn người nhận chuyển tiếp xử lý."
            );
        }

        const updated = await prisma.parentMeetingFeedbackLink.update({
            where: { id: feedback.id },
            data: {
                assigneeUserId: params.targetAssigneeUserId,
                assigneeName: params.targetAssigneeName,
                assigneeRole: params.targetAssigneeRole || "GVBM",
                businessStatus: "WAITING_COORDINATION",
                dueAt: params.dueAt ? new Date(params.dueAt) : feedback.dueAt,
                updatedAt: now,
            },
        });

        if (feedback.threadId && params.messageContent) {
            await prisma.communicationMessage.create({
                data: {
                    id: crypto.randomUUID(),
                    threadId: feedback.threadId,
                    senderUserId: ctx.userId,
                    senderRole: ctx.role,
                    senderName: ctx.userName,
                    messageType: "SYSTEM_FORWARD",
                    content: `[Chuyển xử lý tới ${params.targetAssigneeName} (${params.targetAssigneeRole || "GVBM"})]: ${params.messageContent}`,
                    isInternalNote: true,
                },
            });
        }

        if (feedback.caseId) {
            await prisma.communicationCase.update({
                where: { id: feedback.caseId },
                data: {
                    assignedToUserId: params.targetAssigneeUserId,
                    assignedToName: params.targetAssigneeName,
                    assignedRole: params.targetAssigneeRole || "GVBM",
                    status: "ASSIGNED",
                    updatedAt: now,
                },
            });
        }

        await recordMeetingAuditLog({
            meetingId: feedback.meetingId,
            classId: feedback.classId,
            actor: ctx,
            action: "FORWARD_FEEDBACK",
            targetType: "ParentMeetingFeedbackLink",
            targetId: feedback.id,
            metadata: {
                toAssigneeUserId: params.targetAssigneeUserId,
                toAssigneeName: params.targetAssigneeName,
                toAssigneeRole: params.targetAssigneeRole,
            },
        });

        return updated;
    }

    // REPLY or UPDATE_STATUS
    const nextStatus: FeedbackBusinessStatusCode =
        params.newStatus ||
        (params.action === "REPLY"
            ? ctx.isParent
                ? "IN_PROGRESS"
                : "RESPONDED"
            : (feedback.businessStatus as FeedbackBusinessStatusCode));

    if (feedback.threadId && params.messageContent && params.messageContent.trim()) {
        await prisma.communicationMessage.create({
            data: {
                id: crypto.randomUUID(),
                threadId: feedback.threadId,
                senderUserId: ctx.userId,
                senderRole: ctx.isParent ? "PARENT" : ctx.role,
                senderName: ctx.userName,
                messageType: "TEXT",
                content: params.messageContent.trim(),
            },
        });

        await prisma.communicationThread.update({
            where: { id: feedback.threadId },
            data: {
                lastMessageAt: now,
                firstRespondedAt: !ctx.isParent ? now : undefined,
                status: FEEDBACK_BUSINESS_STATUS[nextStatus]?.coordinationStatus || "IN_PROGRESS",
                updatedAt: now,
            },
        });
    }

    const updated = await prisma.parentMeetingFeedbackLink.update({
        where: { id: feedback.id },
        data: {
            businessStatus: nextStatus,
            resolutionSummary:
                !ctx.isParent && params.messageContent
                    ? params.messageContent.trim()
                    : feedback.resolutionSummary,
            allowShareInSummary:
                params.allowShareInSummary !== undefined
                    ? params.allowShareInSummary
                    : feedback.allowShareInSummary,
            visibilityScope: params.visibilityScope || feedback.visibilityScope,
            updatedAt: now,
        },
    });

    if (feedback.caseId) {
        await prisma.communicationCase.update({
            where: { id: feedback.caseId },
            data: {
                status: FEEDBACK_BUSINESS_STATUS[nextStatus]?.coordinationStatus || "IN_PROGRESS",
                firstResponseAt: !ctx.isParent ? now : undefined,
                resolvedAt: nextStatus === "RESPONDED" || nextStatus === "COMPLETED" ? now : undefined,
                resolutionSummary: updated.resolutionSummary,
                updatedAt: now,
            },
        });
    }

    return updated;
}

/**
 * MODULE 5: List Meeting Feedback with strict privacy isolation and dynamic Overdue warning calculation.
 */
export async function listMeetingFeedback(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId?: string;
        classId?: string;
        studentId?: string;
        topicGroup?: string;
        businessStatus?: string;
        onlyOverdue?: boolean;
        referenceNow?: Date;
    }
) {
    await ensureParentMeetingTables();
    const now = params.referenceNow || new Date();

    const whereClause: Record<string, unknown> = {};
    if (params.meetingId) whereClause.meetingId = params.meetingId;
    if (params.classId) whereClause.classId = params.classId;
    if (params.topicGroup && params.topicGroup !== "ALL") whereClause.topicGroup = params.topicGroup;
    if (params.businessStatus && params.businessStatus !== "ALL") {
        whereClause.businessStatus = params.businessStatus;
    }

    const rawItems = await prisma.parentMeetingFeedbackLink.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
    });

    const filteredItems = [];

    for (const item of rawItems) {
        const isOverdue = isFeedbackOverdue(item.businessStatus, item.dueAt, now);
        if (params.onlyOverdue && !isOverdue) continue;

        if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
            const ownsStudent = ctx.linkedStudents.some((s) => s.studentId === item.studentId);
            if (params.studentId && item.studentId !== params.studentId) {
                if (
                    !(
                        item.visibilityScope === "CLASS_SHARED_ANONYMOUS" &&
                        item.allowShareInSummary
                    )
                ) {
                    continue;
                }
            }
            if (ownsStudent) {
                filteredItems.push({ ...item, isOverdue, isOwnFeedback: true });
            } else if (
                item.visibilityScope === "CLASS_SHARED_ANONYMOUS" &&
                item.allowShareInSummary &&
                ctx.linkedStudents.some((s) => s.classId === item.classId)
            ) {
                // Mask personal student & parent identity for anonymous class-shared feedback
                filteredItems.push({
                    ...item,
                    studentId: "ANONYMOUS",
                    studentName: "Phụ huynh trong lớp (Ẩn danh)",
                    parentId: "ANONYMOUS",
                    parentName: "Phụ huynh (Ẩn danh)",
                    isOverdue,
                    isOwnFeedback: false,
                });
            }
            continue;
        }

        // Teacher / Admin scoping
        if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
            const isHomeroom = ctx.homeroomClassIds.includes(item.classId);
            const isAssignedToMe =
                item.assigneeUserId === ctx.userId || item.receiverUserId === ctx.userId;
            if (!isHomeroom && !isAssignedToMe) {
                continue;
            }
        } else if (ctx.isGDCS && ctx.allowedCampusIds.length > 0) {
            if (!ctx.allowedCampusIds.includes(item.campusId)) continue;
        }

        filteredItems.push({ ...item, isOverdue, isOwnFeedback: false });
    }

    // Load messages from CommunicationMessage for threads that the user can view
    const threadIds = filteredItems
        .map((f) => f.threadId)
        .filter((tid): tid is string => Boolean(tid));

    const messagesByThread = new Map<string, Array<Record<string, unknown>>>();
    if (threadIds.length > 0) {
        const msgs = await prisma.communicationMessage.findMany({
            where: { threadId: { in: threadIds } },
            orderBy: { createdAt: "asc" },
        });
        for (const m of msgs) {
            if (ctx.isParent && m.isInternalNote) continue;
            const list = messagesByThread.get(m.threadId) || [];
            list.push(m);
            messagesByThread.set(m.threadId, list);
        }
    }

    return filteredItems.map((item) => ({
        ...item,
        messages: item.threadId ? messagesByThread.get(item.threadId) || [] : [],
    }));
}

/**
 * MODULE 6: Digital Meeting Minutes (Save Draft, Submit for Approval, Approve, Publish, Versioning)
 * Enforces privacy: Never leaks PRIVATE feedback into collective minutes, and hides unapproved minutes from parents.
 */
export async function saveOrTransitionMeetingMinutes(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        classId: string;
        action: "SAVE_DRAFT" | "SUBMIT_APPROVAL" | "APPROVE" | "REJECT" | "PUBLISH";
        attendeeSummary?: string;
        presentationContent?: string;
        discussionIssues?: string;
        generalFeedbackSummary?: string;
        conclusions?: string;
        agreedActions?: string;
        nextTasksSummary?: string;
        approvalNote?: string;
        changeSummary?: string;
    }
) {
    await ensureParentMeetingTables();

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
        include: { classes: true },
    });
    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    const meetingClass = meeting.classes.find((c) => c.classId === params.classId);
    if (!meetingClass) {
        throw new ParentMeetingError("CLASS_NOT_IN_MEETING", "Lớp học không thuộc cuộc họp này.", 404);
    }

    if (params.action === "APPROVE" || params.action === "REJECT") {
        const canApprove =
            ctx.isSuperAdmin ||
            ctx.isAdmin ||
            ctx.isKTDBCL ||
            (ctx.isGDCS &&
                (ctx.allowedCampusIds.length === 0 ||
                    ctx.allowedCampusIds.includes(meeting.campusId)));
        if (!canApprove) {
            throw new ParentMeetingError(
                "FORBIDDEN_MINUTES_APPROVAL",
                "Chỉ Ban Giám hiệu / Quản lý cơ sở / Admin mới có quyền phê duyệt biên bản.",
                403
            );
        }
    } else {
        assertCanManageClassMeeting(ctx, params.classId, meeting.campusId);
    }

    const stats = await computeMeetingAttendanceStats(params.meetingId, params.classId);

    // Auto-build safe anonymized feedback summary if not explicitly provided
    let safeGeneralFeedback = params.generalFeedbackSummary;
    if (safeGeneralFeedback === undefined) {
        const sharedFeedbacks = await prisma.parentMeetingFeedbackLink.findMany({
            where: {
                meetingId: params.meetingId,
                classId: params.classId,
                visibilityScope: { not: "PRIVATE" },
                allowShareInSummary: true,
            },
        });
        if (sharedFeedbacks.length > 0) {
            safeGeneralFeedback = sharedFeedbacks
                .map(
                    (f, idx) =>
                        `${idx + 1}. [${FEEDBACK_TOPIC_GROUPS[f.topicGroup as FeedbackTopicGroupCode]?.labelVi || f.topicGroup}]: ${f.content}`
                )
                .join("\n");
        }
    }

    const existing = await prisma.parentMeetingMinutes.findUnique({
        where: {
            meetingId_classId: {
                meetingId: params.meetingId,
                classId: params.classId,
            },
        },
    });

    const statusTransitionMap: Record<typeof params.action, MinutesStatusCode> = {
        SAVE_DRAFT: existing?.status === "APPROVED" ? "APPROVED" : "DRAFT",
        SUBMIT_APPROVAL: "PENDING_APPROVAL",
        APPROVE: "APPROVED",
        REJECT: "REJECTED",
        PUBLISH: "PUBLISHED",
    };

    const nextStatus = statusTransitionMap[params.action];
    const nextVersion = existing ? existing.version + 1 : 1;
    const now = new Date();

    const minutesRecord = await prisma.parentMeetingMinutes.upsert({
        where: {
            meetingId_classId: {
                meetingId: params.meetingId,
                classId: params.classId,
            },
        },
        update: {
            version: nextVersion,
            status: nextStatus,
            totalStudents: stats.totalStudents,
            invitedCount: stats.invitedCount,
            confirmedCount: stats.confirmedCount,
            presentStudentCount: stats.presentStudentCount,
            actualAttendeeCount: stats.actualAttendeeCount,
            attendanceRate: stats.attendanceRate,
            attendeeSummary: params.attendeeSummary ?? existing?.attendeeSummary,
            presentationContent: params.presentationContent ?? existing?.presentationContent,
            discussionIssues: params.discussionIssues ?? existing?.discussionIssues,
            generalFeedbackSummary: safeGeneralFeedback ?? existing?.generalFeedbackSummary,
            conclusions: params.conclusions ?? existing?.conclusions,
            agreedActions: params.agreedActions ?? existing?.agreedActions,
            nextTasksSummary: params.nextTasksSummary ?? existing?.nextTasksSummary,
            approverUserId:
                params.action === "APPROVE" || params.action === "PUBLISH"
                    ? ctx.userId
                    : existing?.approverUserId,
            approverName:
                params.action === "APPROVE" || params.action === "PUBLISH"
                    ? ctx.userName
                    : existing?.approverName,
            approvedAt:
                params.action === "APPROVE" ||
                (params.action === "PUBLISH" && !existing?.approvedAt)
                    ? now
                    : existing?.approvedAt,
            approvalNote: params.approvalNote ?? existing?.approvalNote,
            publishedAt: params.action === "PUBLISH" ? now : existing?.publishedAt,
            updatedAt: now,
        },
        create: {
            id: crypto.randomUUID(),
            meetingId: params.meetingId,
            classId: params.classId,
            className: meetingClass.className,
            campusId: meeting.campusId,
            academicYearId: meeting.academicYearId,
            version: 1,
            status: nextStatus,
            totalStudents: stats.totalStudents,
            invitedCount: stats.invitedCount,
            confirmedCount: stats.confirmedCount,
            presentStudentCount: stats.presentStudentCount,
            actualAttendeeCount: stats.actualAttendeeCount,
            attendanceRate: stats.attendanceRate,
            attendeeSummary:
                params.attendeeSummary ||
                `Tổng số HS: ${stats.totalStudents} | Đại diện HS có mặt: ${stats.presentStudentCount}/${stats.totalStudents} (${stats.attendanceRate}%) | Tổng số người thực tế tham dự: ${stats.actualAttendeeCount}`,
            presentationContent: params.presentationContent || meeting.agenda || "",
            discussionIssues: params.discussionIssues || "",
            generalFeedbackSummary: safeGeneralFeedback || "",
            conclusions: params.conclusions || "",
            agreedActions: params.agreedActions || "",
            nextTasksSummary: params.nextTasksSummary || "",
            recorderUserId: ctx.userId,
            recorderName: ctx.userName,
            approverUserId:
                params.action === "APPROVE" || params.action === "PUBLISH" ? ctx.userId : null,
            approverName:
                params.action === "APPROVE" || params.action === "PUBLISH" ? ctx.userName : null,
            approvedAt:
                params.action === "APPROVE" || params.action === "PUBLISH" ? now : null,
            approvalNote: params.approvalNote || null,
            publishedAt: params.action === "PUBLISH" ? now : null,
        },
    });

    await prisma.parentMeetingMinutesVersion.create({
        data: {
            id: crypto.randomUUID(),
            minutesId: minutesRecord.id,
            versionNumber: minutesRecord.version,
            snapshotJson: JSON.stringify(minutesRecord),
            changedByUserId: ctx.userId,
            changedByName: ctx.userName,
            changeSummary: params.changeSummary || `Thao tác: ${params.action} (v${minutesRecord.version})`,
        },
    });

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: params.classId,
        actor: ctx,
        action: `MINUTES_${params.action}`,
        targetType: "ParentMeetingMinutes",
        targetId: minutesRecord.id,
        metadata: {
            version: minutesRecord.version,
            status: minutesRecord.status,
        },
    });

    return minutesRecord;
}

/**
 * MODULE 6: Retrieve Meeting Minutes with strict Parent Visibility Guard
 * (Parents cannot see DRAFT, PENDING_APPROVAL, or REJECTED minutes).
 */
export async function getMeetingMinutesForViewer(
    ctx: ParentMeetingActorContext,
    meetingId: string,
    classId: string
) {
    await ensureParentMeetingTables();

    const minutes = await prisma.parentMeetingMinutes.findUnique({
        where: {
            meetingId_classId: {
                meetingId,
                classId,
            },
        },
        include: {
            versions: {
                orderBy: { versionNumber: "desc" },
                take: 10,
            },
        },
    });

    if (!minutes) return null;

    if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
        const hasChildInClass = ctx.linkedStudents.some((s) => s.classId === classId);
        if (!hasChildInClass) {
            throw new ParentMeetingError(
                "FORBIDDEN_CLASS_MINUTES",
                "Bạn không có quyền xem biên bản của lớp khác.",
                403
            );
        }
        // Unapproved / unpublished minutes must NEVER be exposed to parents
        if (minutes.status !== "PUBLISHED") {
            return null;
        }
        return {
            ...minutes,
            versions: [], // Hide internal edit versions from parents
        };
    }

    if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
        if (!ctx.homeroomClassIds.includes(classId) && !ctx.subjectClassIds.includes(classId)) {
            throw new ParentMeetingError(
                "FORBIDDEN_CLASS_MINUTES",
                "Bạn không có quyền xem biên bản của lớp này.",
                403
            );
        }
    }

    return minutes;
}

/**
 * MODULE 7: Create Post-Meeting Task and automatically synchronize with WorkTask (Sổ Giáo viên).
 */
export async function createParentMeetingTask(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId: string;
        classId: string;
        minutesId?: string;
        feedbackLinkId?: string;
        studentId?: string;
        title: string;
        description?: string;
        assigneeUserId: string;
        assigneeName: string;
        assigneeRole?: string;
        department?: string;
        dueAt: string | Date;
        priority?: MeetingTaskPriorityCode;
        visibleToParents?: boolean;
    }
) {
    await ensureParentMeetingTables();

    if (!params.title || !params.title.trim()) {
        throw new ParentMeetingError("INVALID_TASK_TITLE", "Nội dung nhiệm vụ không được để trống.");
    }

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: params.meetingId },
    });
    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    assertCanManageClassMeeting(ctx, params.classId, meeting.campusId);

    const dueAt = new Date(params.dueAt);
    const taskCode = generateShortId("NVPH");
    let studentName: string | null = null;
    if (params.studentId) {
        const student = await prisma.student.findUnique({ where: { id: params.studentId } });
        studentName = student?.studentName || null;
    }

    // Sync to existing WorkTask table so it integrates with Sổ Giáo viên / Task Engine
    let linkedWorkTaskId: string | null = null;
    try {
        const workTask = await (prisma.workTask as any).create({
            data: {
                title: `[Họp PHHS] ${params.title.trim()}`,
                description: params.description || `Nhiệm vụ sau họp từ cuộc họp ${meeting.title}`,
                priority: params.priority || "NORMAL",
                endDate: dueAt,
                assignedToUserId: params.assigneeUserId,
                campusId: meeting.campusId,
                academicYearId: meeting.academicYearId,
            },
        });
        linkedWorkTaskId = workTask.id;
    } catch {
        // Non-fatal if assigneeId is not in User table in isolated test
    }

    const task = await prisma.parentMeetingTask.create({
        data: {
            id: crypto.randomUUID(),
            taskCode,
            meetingId: params.meetingId,
            classId: params.classId,
            campusId: meeting.campusId,
            academicYearId: meeting.academicYearId,
            minutesId: params.minutesId || null,
            feedbackLinkId: params.feedbackLinkId || null,
            studentId: params.studentId || null,
            studentName,
            linkedWorkTaskId,
            title: params.title.trim(),
            description: params.description || null,
            assigneeUserId: params.assigneeUserId,
            assigneeName: params.assigneeName,
            assigneeRole: params.assigneeRole || "GVCN",
            department: params.department || null,
            dueAt,
            priority: params.priority || "NORMAL",
            status: "NEW",
            visibleToParents: params.visibleToParents ?? false,
            createdByUserId: ctx.userId,
            createdByName: ctx.userName,
        },
    });

    await recordMeetingAuditLog({
        meetingId: params.meetingId,
        classId: params.classId,
        actor: ctx,
        action: "CREATE_TASK",
        targetType: "ParentMeetingTask",
        targetId: task.id,
        metadata: {
            taskCode,
            assigneeUserId: params.assigneeUserId,
            assigneeRole: params.assigneeRole,
            dueAt: dueAt.toISOString(),
        },
    });

    return task;
}

/**
 * MODULE 7: Update Post-Meeting Task status, evidence, and result summary.
 */
export async function updateParentMeetingTask(
    ctx: ParentMeetingActorContext,
    params: {
        taskId: string;
        status?: MeetingTaskStatusCode;
        evidenceUrl?: string;
        evidenceNote?: string;
        resultSummary?: string;
        visibleToParents?: boolean;
    }
) {
    await ensureParentMeetingTables();

    const existing = await prisma.parentMeetingTask.findUnique({
        where: { id: params.taskId },
    });
    if (!existing) {
        throw new ParentMeetingError("TASK_NOT_FOUND", "Không tìm thấy nhiệm vụ sau họp.", 404);
    }

    const canUpdate =
        ctx.isSuperAdmin ||
        ctx.isAdmin ||
        ctx.isKTDBCL ||
        ctx.isGDCS ||
        existing.assigneeUserId === ctx.userId ||
        existing.createdByUserId === ctx.userId ||
        ctx.homeroomClassIds.includes(existing.classId);

    if (!canUpdate) {
        throw new ParentMeetingError(
            "FORBIDDEN_TASK_UPDATE",
            "Bạn không có quyền cập nhật nhiệm vụ này.",
            403
        );
    }

    const now = new Date();
    const nextStatus = params.status || existing.status;

    const updated = await prisma.parentMeetingTask.update({
        where: { id: params.taskId },
        data: {
            status: nextStatus,
            evidenceUrl: params.evidenceUrl ?? existing.evidenceUrl,
            evidenceNote: params.evidenceNote ?? existing.evidenceNote,
            resultSummary: params.resultSummary ?? existing.resultSummary,
            visibleToParents:
                params.visibleToParents !== undefined
                    ? params.visibleToParents
                    : existing.visibleToParents,
            completedAt: nextStatus === "COMPLETED" ? now : existing.completedAt,
            updatedAt: now,
        },
    });

    if (existing.linkedWorkTaskId) {
        try {
            await (prisma.workTask as any).update({
                where: { id: existing.linkedWorkTaskId },
                data: {
                    completedAt: nextStatus === "COMPLETED" ? now : null,
                },
            });
        } catch {
            // Ignore if WorkTask was deleted separately
        }
    }

    return updated;
}

/**
 * MODULE 7: List Post-Meeting Tasks with dynamic overdue computation and Parent visibility filtering.
 */
export async function listParentMeetingTasks(
    ctx: ParentMeetingActorContext,
    params: {
        meetingId?: string;
        classId?: string;
        studentId?: string;
        assigneeUserId?: string;
        status?: string;
        referenceNow?: Date;
    }
) {
    await ensureParentMeetingTables();
    const now = params.referenceNow || new Date();

    const where: Record<string, unknown> = {};
    if (params.meetingId) where.meetingId = params.meetingId;
    if (params.classId) where.classId = params.classId;
    if (params.assigneeUserId) where.assigneeUserId = params.assigneeUserId;
    if (params.status && params.status !== "ALL") where.status = params.status;

    const tasks = await prisma.parentMeetingTask.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });

    return tasks
        .filter((task) => {
            if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
                if (!task.visibleToParents) return false;
                if (task.studentId) {
                    return ctx.linkedStudents.some((s) => s.studentId === task.studentId);
                }
                return ctx.linkedStudents.some((s) => s.classId === task.classId);
            }
            if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
                const isHomeroom = ctx.homeroomClassIds.includes(task.classId);
                const isAssignee =
                    task.assigneeUserId === ctx.userId || task.createdByUserId === ctx.userId;
                return isHomeroom || isAssignee;
            }
            if (ctx.isGDCS && ctx.allowedCampusIds.length > 0) {
                return ctx.allowedCampusIds.includes(task.campusId);
            }
            return true;
        })
        .map((task) => ({
            ...task,
            isOverdue: isTaskOverdue(task.status, task.dueAt, now),
        }));
}

/**
 * MODULE 8: Admin & Ban KT&ĐBCL Comprehensive Real-Data Analytics
 */
export async function getParentMeetingAnalytics(
    ctx: ParentMeetingActorContext,
    filters: {
        academicYearId?: string;
        semester?: string;
        campusId?: string;
        grade?: string;
        classId?: string;
        topicGroup?: string;
        referenceNow?: Date;
    }
) {
    await ensureParentMeetingTables();
    const now = filters.referenceNow || new Date();

    const meetingWhere: Record<string, unknown> = {};
    if (filters.academicYearId && filters.academicYearId !== "ALL") {
        meetingWhere.academicYearId = filters.academicYearId;
    }
    if (filters.semester && filters.semester !== "ALL") {
        meetingWhere.semester = filters.semester;
    }
    if (filters.campusId && filters.campusId !== "ALL") {
        meetingWhere.campusId = filters.campusId;
    } else if (ctx.isGDCS && ctx.allowedCampusIds.length > 0) {
        meetingWhere.campusId = { in: ctx.allowedCampusIds };
    }
    if (filters.grade && filters.grade !== "ALL") {
        meetingWhere.grade = filters.grade;
    }

    const meetings = await prisma.parentMeeting.findMany({
        where: meetingWhere,
        include: {
            classes: true,
            invitations: true,
            attendances: {
                where: { attendanceStatus: { in: ["PRESENT", "LATE"] } },
            },
            feedbackLinks: true,
            minutes: true,
            tasks: true,
        },
        orderBy: { startTime: "desc" },
    });

    const campuses = await prisma.campus.findMany({
        select: { id: true, campusName: true, campusCode: true },
    });
    const campusMap = new Map(campuses.map((c) => [c.id, c.campusName]));

    let totalMeetings = 0;
    let onScheduleMeetings = 0;
    let totalStudentsInvited = 0;
    let totalConfirmedRsvp = 0;
    let totalPresentStudents = 0;
    let totalActualAttendees = 0;
    let totalFeedbackCount = 0;
    let onTimeRespondedFeedback = 0;
    let completedFeedbackCount = 0;
    let overdueFeedbackCount = 0;
    let csatSum = 0;
    let csatCount = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    const topicStatsMap = new Map<
        string,
        { topicGroup: string; labelVi: string; total: number; completed: number; overdue: number }
    >();
    for (const [code, cfg] of Object.entries(FEEDBACK_TOPIC_GROUPS)) {
        topicStatsMap.set(code, {
            topicGroup: code,
            labelVi: cfg.labelVi,
            total: 0,
            completed: 0,
            overdue: 0,
        });
    }

    const classComparison: Array<{
        meetingId: string;
        meetingCode: string;
        meetingTitle: string;
        campusId: string;
        campusName: string;
        classId: string;
        className: string;
        grade: string;
        homeroomTeacherName: string;
        totalStudents: number;
        confirmedCount: number;
        presentStudentCount: number;
        actualAttendeeCount: number;
        attendanceRate: number;
        feedbackCount: number;
        overdueFeedbackCount: number;
        minutesStatus: string;
        taskCompletionRate: number;
    }> = [];

    const recurringTracker = new Map<
        string,
        { campusName: string; className: string; topicGroup: string; labelVi: string; count: number }
    >();

    const overdueAlerts: Array<{
        type: "FEEDBACK" | "TASK";
        id: string;
        code: string;
        title: string;
        className: string;
        campusName: string;
        assigneeName: string;
        dueAt: Date;
        status: string;
    }> = [];

    for (const m of meetings) {
        if (m.status === "CANCELLED") continue;
        if (filters.classId && filters.classId !== "ALL") {
            if (!m.classes.some((c) => c.classId === filters.classId)) continue;
        }

        totalMeetings++;
        const isCompletedOrInProgress =
            m.status === "COMPLETED" ||
            m.status === "IN_PROGRESS" ||
            (m.status === "PUBLISHED" && m.startTime > now);
        if (isCompletedOrInProgress) {
            onScheduleMeetings++;
        }

        const campusName = campusMap.get(m.campusId) || m.campusId;

        for (const cls of m.classes) {
            if (filters.classId && filters.classId !== "ALL" && cls.classId !== filters.classId) {
                continue;
            }

            const clsInvites = m.invitations.filter((i) => i.classId === cls.classId);
            const clsAttendances = m.attendances.filter((a) => a.classId === cls.classId);
            const clsFeedbacks = m.feedbackLinks.filter(
                (f) =>
                    f.classId === cls.classId &&
                    (!filters.topicGroup ||
                        filters.topicGroup === "ALL" ||
                        f.topicGroup === filters.topicGroup)
            );
            const clsMinutes = m.minutes.find((min) => min.classId === cls.classId);
            const clsTasks = m.tasks.filter((t) => t.classId === cls.classId);

            const uniqueInvited = new Set(clsInvites.map((i) => i.studentId));
            const clsStudentTotal = Math.max(cls.totalStudents || 0, uniqueInvited.size);
            const clsConfirmed = new Set(
                clsInvites
                    .filter((i) => i.rsvpStatus === "CONFIRMED" || i.rsvpStatus === "DELEGATED")
                    .map((i) => i.studentId)
            ).size;
            const clsPresentStudents = new Set(clsAttendances.map((a) => a.studentId)).size;
            const clsActualAttendees = clsAttendances.reduce(
                (s, a) => s + Math.max(1, a.attendeeCount || 1),
                0
            );

            totalStudentsInvited += clsStudentTotal;
            totalConfirmedRsvp += clsConfirmed;
            totalPresentStudents += clsPresentStudents;
            totalActualAttendees += clsActualAttendees;

            let clsOverdueFb = 0;
            for (const fb of clsFeedbacks) {
                totalFeedbackCount++;
                const fbOverdue = isFeedbackOverdue(fb.businessStatus, fb.dueAt, now);
                if (fbOverdue) {
                    overdueFeedbackCount++;
                    clsOverdueFb++;
                    overdueAlerts.push({
                        type: "FEEDBACK",
                        id: fb.id,
                        code: fb.feedbackCode,
                        title: fb.title,
                        className: cls.className,
                        campusName,
                        assigneeName: fb.assigneeName,
                        dueAt: fb.dueAt,
                        status: fb.businessStatus,
                    });
                }
                if (fb.businessStatus === "COMPLETED") {
                    completedFeedbackCount++;
                }
                if (
                    (fb.businessStatus === "RESPONDED" || fb.businessStatus === "COMPLETED") &&
                    !fbOverdue
                ) {
                    onTimeRespondedFeedback++;
                }
                if (fb.csatScore && fb.csatScore >= 1) {
                    csatSum += fb.csatScore;
                    csatCount++;
                }

                const tStat = topicStatsMap.get(fb.topicGroup);
                if (tStat) {
                    tStat.total++;
                    if (fb.businessStatus === "COMPLETED") tStat.completed++;
                    if (fbOverdue) tStat.overdue++;
                }

                const recurKey = `${cls.classId}__${fb.topicGroup}`;
                const existingRecur = recurringTracker.get(recurKey);
                const topicLabel =
                    FEEDBACK_TOPIC_GROUPS[fb.topicGroup as FeedbackTopicGroupCode]?.labelVi ||
                    fb.topicGroup;
                if (existingRecur) {
                    existingRecur.count++;
                } else {
                    recurringTracker.set(recurKey, {
                        campusName,
                        className: cls.className,
                        topicGroup: fb.topicGroup,
                        labelVi: topicLabel,
                        count: 1,
                    });
                }
            }

            let clsCompletedTasks = 0;
            for (const t of clsTasks) {
                totalTasks++;
                if (t.status === "COMPLETED") {
                    completedTasks++;
                    clsCompletedTasks++;
                }
                if (isTaskOverdue(t.status, t.dueAt, now)) {
                    overdueTasks++;
                    overdueAlerts.push({
                        type: "TASK",
                        id: t.id,
                        code: t.taskCode,
                        title: t.title,
                        className: cls.className,
                        campusName,
                        assigneeName: t.assigneeName,
                        dueAt: t.dueAt,
                        status: t.status,
                    });
                }
            }

            classComparison.push({
                meetingId: m.id,
                meetingCode: m.meetingCode,
                meetingTitle: m.title,
                campusId: m.campusId,
                campusName,
                classId: cls.classId,
                className: cls.className,
                grade: cls.grade || m.grade || "",
                homeroomTeacherName: cls.homeroomTeacherName || m.hostName,
                totalStudents: clsStudentTotal,
                confirmedCount: clsConfirmed,
                presentStudentCount: clsPresentStudents,
                actualAttendeeCount: clsActualAttendees,
                attendanceRate:
                    clsStudentTotal > 0
                        ? Number(((clsPresentStudents / clsStudentTotal) * 100).toFixed(1))
                        : 0,
                feedbackCount: clsFeedbacks.length,
                overdueFeedbackCount: clsOverdueFb,
                minutesStatus: clsMinutes?.status || "NOT_CREATED",
                taskCompletionRate:
                    clsTasks.length > 0
                        ? Number(((clsCompletedTasks / clsTasks.length) * 100).toFixed(1))
                        : 100,
            });
        }
    }

    const recurringIssues = Array.from(recurringTracker.values()).filter((r) => r.count >= 2);

    return {
        kpis: {
            totalMeetings,
            onScheduleRate:
                totalMeetings > 0
                    ? Number(((onScheduleMeetings / totalMeetings) * 100).toFixed(1))
                    : 100,
            rsvpConfirmationRate:
                totalStudentsInvited > 0
                    ? Number(((totalConfirmedRsvp / totalStudentsInvited) * 100).toFixed(1))
                    : 0,
            studentAttendanceRate:
                totalStudentsInvited > 0
                    ? Number(((totalPresentStudents / totalStudentsInvited) * 100).toFixed(1))
                    : 0,
            totalStudentsInvited,
            totalPresentStudents,
            totalActualAttendees,
            totalFeedbackCount,
            onTimeResponseRate:
                totalFeedbackCount > 0
                    ? Number(((onTimeRespondedFeedback / totalFeedbackCount) * 100).toFixed(1))
                    : 100,
            feedbackCompletionRate:
                totalFeedbackCount > 0
                    ? Number(((completedFeedbackCount / totalFeedbackCount) * 100).toFixed(1))
                    : 100,
            overdueFeedbackCount,
            averageCsat: csatCount > 0 ? Number((csatSum / csatCount).toFixed(2)) : 0,
            csatResponseCount: csatCount,
            recurringIssuesCount: recurringIssues.length,
            totalTasks,
            completedTasks,
            overdueTasks,
            taskCompletionRate:
                totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 100,
        },
        topicDistribution: Array.from(topicStatsMap.values()),
        classComparison,
        recurringIssues,
        overdueAlerts: overdueAlerts.slice(0, 50),
    };
}

/**
 * Lists meetings visible to the current actor (Parent, GVCN, GVBM/CVHT, GDCS, KT_DBCL, Admin)
 * with server-side pagination and attendance/feedback summary counts.
 */
export async function listParentMeetingsForActor(
    ctx: ParentMeetingActorContext,
    filters: {
        academicYearId?: string;
        semester?: string;
        campusId?: string;
        classId?: string;
        studentId?: string;
        status?: string;
        meetingType?: string;
        search?: string;
        page?: number;
        pageSize?: number;
    }
) {
    await ensureParentMeetingTables();

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));

    const where: Record<string, unknown> = {};
    if (filters.academicYearId && filters.academicYearId !== "ALL") {
        where.academicYearId = filters.academicYearId;
    }
    if (filters.semester && filters.semester !== "ALL") {
        where.semester = filters.semester;
    }
    if (filters.status && filters.status !== "ALL") {
        where.status = filters.status;
    }
    if (filters.meetingType && filters.meetingType !== "ALL") {
        where.meetingType = filters.meetingType;
    }

    if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
        const targetStudents = filters.studentId
            ? [assertParentOwnsStudent(ctx, filters.studentId)]
            : ctx.linkedStudents;
        const parentClassIds = Array.from(new Set(targetStudents.map((s) => s.classId)));

        where.status = filters.status && filters.status !== "ALL"
            ? filters.status
            : { in: ["PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] };
        where.classes = {
            some: {
                classId: { in: parentClassIds.length > 0 ? parentClassIds : ["__NONE__"] },
            },
        };
    } else if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
        const myClasses = Array.from(new Set([...ctx.homeroomClassIds, ...ctx.subjectClassIds]));
        if (filters.classId && filters.classId !== "ALL") {
            where.classes = { some: { classId: filters.classId } };
        } else {
            where.OR = [
                { hostUserId: ctx.userId },
                { plannerUserId: ctx.userId },
                { classes: { some: { classId: { in: myClasses.length > 0 ? myClasses : ["__NONE__"] } } } },
                { feedbackLinks: { some: { assigneeUserId: ctx.userId } } },
                { tasks: { some: { assigneeUserId: ctx.userId } } },
            ];
        }
    } else {
        if (filters.campusId && filters.campusId !== "ALL") {
            where.campusId = filters.campusId;
        } else if (ctx.isGDCS && ctx.allowedCampusIds.length > 0) {
            where.campusId = { in: ctx.allowedCampusIds };
        }
        if (filters.classId && filters.classId !== "ALL") {
            where.classes = { some: { classId: filters.classId } };
        }
    }

    if (filters.search && filters.search.trim()) {
        where.title = { contains: filters.search.trim() };
    }

    const [total, rawMeetings] = await Promise.all([
        prisma.parentMeeting.count({ where }),
        prisma.parentMeeting.findMany({
            where,
            include: {
                classes: true,
                invitations: true,
                attendances: {
                    where: { attendanceStatus: { in: ["PRESENT", "LATE"] } },
                },
                feedbackLinks: true,
                minutes: {
                    select: {
                        id: true,
                        classId: true,
                        status: true,
                        version: true,
                        publishedAt: true,
                    },
                },
                tasks: {
                    select: {
                        id: true,
                        classId: true,
                        status: true,
                        dueAt: true,
                    },
                },
            },
            orderBy: { startTime: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    const items = rawMeetings.map((m) => {
        const uniqueStudents = new Set(m.invitations.map((i) => i.studentId));
        const totalStudents = Math.max(
            m.classes.reduce((s, c) => s + (c.totalStudents || 0), 0),
            uniqueStudents.size
        );
        const confirmedStudents = new Set(
            m.invitations
                .filter((i) => i.rsvpStatus === "CONFIRMED" || i.rsvpStatus === "DELEGATED")
                .map((i) => i.studentId)
        ).size;
        const presentStudents = new Set(m.attendances.map((a) => a.studentId)).size;
        const actualAttendees = m.attendances.reduce(
            (s, a) => s + Math.max(1, a.attendeeCount || 1),
            0
        );

        let myInvitations = m.invitations;
        let myAttendances = m.attendances;
        if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
            const myStudentIds = new Set(ctx.linkedStudents.map((s) => s.studentId));
            myInvitations = m.invitations.filter(
                (i) => myStudentIds.has(i.studentId) && (!ctx.parentId || i.parentId === ctx.parentId)
            );
            myAttendances = m.attendances.filter((a) => myStudentIds.has(a.studentId));
        }

        const pendingFeedbackCount = m.feedbackLinks.filter(
            (f) => f.businessStatus !== "COMPLETED"
        ).length;

        return {
            id: m.id,
            meetingCode: m.meetingCode,
            title: m.title,
            meetingType: m.meetingType,
            academicYearId: m.academicYearId,
            semester: m.semester,
            campusId: m.campusId,
            grade: m.grade,
            level: m.level,
            startTime: m.startTime,
            endTime: m.endTime,
            location: m.location,
            onlineLink: m.onlineLink,
            agenda: m.agenda,
            contentSummary: m.contentSummary,
            hostUserId: m.hostUserId,
            hostName: m.hostName,
            plannerUserId: m.plannerUserId,
            plannerName: m.plannerName,
            status: m.status,
            rsvpOpenAt: m.rsvpOpenAt,
            rsvpCloseAt: m.rsvpCloseAt,
            checkInOpenAt: m.checkInOpenAt,
            checkInCloseAt: m.checkInCloseAt,
            allowPreQuestions: m.allowPreQuestions,
            publishedAt: m.publishedAt,
            cancelReason: m.cancelReason,
            classes: m.classes,
            stats: {
                totalStudents,
                invitedCount: m.invitations.length,
                confirmedCount: confirmedStudents,
                presentStudentCount: presentStudents,
                actualAttendeeCount: actualAttendees,
                unattendedStudentCount: Math.max(0, totalStudents - presentStudents),
                attendanceRate:
                    totalStudents > 0
                        ? Number(((presentStudents / totalStudents) * 100).toFixed(1))
                        : 0,
                totalFeedbackCount: m.feedbackLinks.length,
                pendingFeedbackCount,
                totalTasksCount: m.tasks.length,
                completedTasksCount: m.tasks.filter((t) => t.status === "COMPLETED").length,
            },
            minutesSummary: m.minutes,
            myInvitations,
            myAttendances,
        };
    });

    return {
        items,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

/**
 * Retrieves full details for a single meeting scoped to the current actor and optional classId/studentId.
 */
export async function getParentMeetingDetailForActor(
    ctx: ParentMeetingActorContext,
    meetingId: string,
    options?: { classId?: string; studentId?: string }
) {
    await ensureParentMeetingTables();

    const meeting = await prisma.parentMeeting.findUnique({
        where: { id: meetingId },
        include: {
            classes: true,
        },
    });

    if (!meeting) {
        throw new ParentMeetingError("MEETING_NOT_FOUND", "Không tìm thấy cuộc họp.", 404);
    }

    let activeClassId = options?.classId || meeting.classes[0]?.classId || "";

    if (ctx.isParent && !ctx.isAdmin && !ctx.isTeacher) {
        const targetStudent = options?.studentId
            ? assertParentOwnsStudent(ctx, options.studentId)
            : ctx.linkedStudents.find((s) =>
                  meeting.classes.some((c) => c.classId === s.classId)
              );

        if (!targetStudent) {
            throw new ParentMeetingError(
                "FORBIDDEN_MEETING_ACCESS",
                "Con của bạn không thuộc danh sách lớp của cuộc họp này.",
                403
            );
        }

        activeClassId = targetStudent.classId;
        const [invitation, attendance, feedbacks, minutes, tasks] = await Promise.all([
            prisma.parentMeetingInvitation.findFirst({
                where: {
                    meetingId,
                    studentId: targetStudent.studentId,
                    ...(ctx.parentId ? { parentId: ctx.parentId } : {}),
                },
            }),
            prisma.parentMeetingAttendance.findFirst({
                where: {
                    meetingId,
                    studentId: targetStudent.studentId,
                },
            }),
            listMeetingFeedback(ctx, {
                meetingId,
                classId: activeClassId,
                studentId: targetStudent.studentId,
            }),
            getMeetingMinutesForViewer(ctx, meetingId, activeClassId),
            listParentMeetingTasks(ctx, {
                meetingId,
                classId: activeClassId,
                studentId: targetStudent.studentId,
            }),
        ]);

        return {
            meeting,
            activeClassId,
            student: targetStudent,
            invitation,
            attendance,
            feedbacks,
            minutes,
            tasks,
        };
    }

    // Teacher / Admin view
    if (
        !ctx.isSuperAdmin &&
        !ctx.isAdmin &&
        !ctx.isKTDBCL &&
        !ctx.isGDCS &&
        ctx.homeroomClassIds.length > 0 &&
        !options?.classId
    ) {
        const myHomeroomInMeeting = meeting.classes.find((c) =>
            ctx.homeroomClassIds.includes(c.classId)
        );
        if (myHomeroomInMeeting) {
            activeClassId = myHomeroomInMeeting.classId;
        }
    }

    const [stats, invitations, attendances, feedbacks, minutes, tasks, assignableStaff] =
        await Promise.all([
            computeMeetingAttendanceStats(meetingId, activeClassId || undefined),
            prisma.parentMeetingInvitation.findMany({
                where: {
                    meetingId,
                    ...(activeClassId ? { classId: activeClassId } : {}),
                },
                orderBy: { studentName: "asc" },
            }),
            prisma.parentMeetingAttendance.findMany({
                where: {
                    meetingId,
                    ...(activeClassId ? { classId: activeClassId } : {}),
                },
                orderBy: { checkedInAt: "desc" },
            }),
            listMeetingFeedback(ctx, {
                meetingId,
                classId: activeClassId || undefined,
            }),
            activeClassId ? getMeetingMinutesForViewer(ctx, meetingId, activeClassId) : null,
            listParentMeetingTasks(ctx, {
                meetingId,
                classId: activeClassId || undefined,
            }),
            activeClassId ? getAssignableStaffForClass(activeClassId, meeting.campusId) : [],
        ]);

    return {
        meeting,
        activeClassId,
        stats,
        invitations,
        attendances,
        feedbacks,
        minutes,
        tasks,
        assignableStaff,
    };
}

/**
 * Returns valid teachers (GVCN, GVBM, CVHT) and campus managers for forwarding feedback or assigning post-meeting tasks.
 */
export async function getAssignableStaffForClass(classId: string, campusId: string) {
    const [cls, classAssigns, teachingAssigns, campusAdmins] = await Promise.all([
        prisma.class.findUnique({
            where: { id: classId },
        }),
        prisma.teacherClassAssignment.findMany({
            where: { classId },
            include: { teacher: true },
        }),
        prisma.teachingAssignment.findMany({
            where: { classId },
            include: { teacher: true, subject: true },
        }),
        prisma.user.findMany({
            where: {
                role: { in: ["GDCS", "KT_DBCL", "ADMIN"] },
                status: "ACTIVE",
            },
            select: { id: true, fullName: true, email: true, role: true },
            take: 30,
        }),
    ]);

    const staffMap = new Map<
        string,
        { userId: string; name: string; role: string; label: string }
    >();

    if (cls?.homeroomTeacherId) {
        const hrTeacher = await prisma.teacher.findUnique({
            where: { id: cls.homeroomTeacherId },
        });
        if (hrTeacher?.userId) {
            staffMap.set(hrTeacher.userId, {
                userId: hrTeacher.userId,
                name: hrTeacher.teacherName,
                role: "GVCN",
                label: `${hrTeacher.teacherName} (GVCN ${cls.className})`,
            });
        }
    }

    for (const ca of classAssigns) {
        if (ca.teacher?.userId && !staffMap.has(ca.teacher.userId)) {
            staffMap.set(ca.teacher.userId, {
                userId: ca.teacher.userId,
                name: ca.teacher.teacherName,
                role: ca.roleInClass || "GVBM",
                label: `${ca.teacher.teacherName} (${ca.roleInClass || "GVBM"})`,
            });
        }
    }

    for (const ta of teachingAssigns) {
        if (ta.teacher?.userId && !staffMap.has(ta.teacher.userId)) {
            const subjAny = ta.subject as { subjectName?: string; name?: string } | null;
            staffMap.set(ta.teacher.userId, {
                userId: ta.teacher.userId,
                name: ta.teacher.teacherName,
                role: "GVBM",
                label: `${ta.teacher.teacherName} (GVBM ${subjAny?.subjectName || subjAny?.name || ""})`,
            });
        }
    }

    for (const admin of campusAdmins) {
        if (!staffMap.has(admin.id)) {
            staffMap.set(admin.id, {
                userId: admin.id,
                name: admin.fullName || admin.email,
                role: admin.role === "KT_DBCL" ? "KT_DBCL" : "BGH",
                label: `${admin.fullName || admin.email} (${admin.role})`,
            });
        }
    }

    return Array.from(staffMap.values());
}

