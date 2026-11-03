import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDigitalTestingTables } from "@/lib/testing/digitalTestingService";
import {
  createOrPublishNotification,
  listNotificationsForViewer,
  NotificationCenterError,
  resolveNotificationActorContext,
} from "@/lib/notification-center/notificationCenterService";
import {
  AUTOMATED_EXAM_EVENTS,
  BUILTIN_NOTIFICATION_TEMPLATES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_WORKFLOW_STATUSES,
} from "@/lib/notification-center/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await resolveNotificationActorContext();
    const { searchParams } = new URL(req.url);

    const mode = (searchParams.get("mode") as "INBOX" | "MANAGE" | null) || undefined;
    const tab = (searchParams.get("tab") as any) || undefined;
    const category = searchParams.get("category") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const testingPeriodId = searchParams.get("testingPeriodId") || undefined;
    const campusId = searchParams.get("campusId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 25);
    const includeMeta = searchParams.get("includeMeta") === "true";

    const listResult = await listNotificationsForViewer(ctx, {
      mode,
      tab,
      category,
      studentId,
      testingPeriodId,
      campusId,
      classId,
      status,
      search,
      page,
      pageSize,
    });

    if (!includeMeta) {
      return NextResponse.json({
        ...listResult,
        actor: {
          userId: ctx.userId,
          userName: ctx.userName,
          role: ctx.role,
          isKTDBCL: ctx.isKTDBCL,
          isAdmin: ctx.isAdmin,
          isGVCN: ctx.isGVCN,
          isGVBM: ctx.isGVBM,
          isParent: ctx.isParent,
          isStudent: ctx.isStudent,
          homeroomClassIds: ctx.homeroomClassIds,
          subjectAssignments: ctx.subjectAssignments,
          linkedStudents: ctx.linkedStudents,
        },
      });
    }

    await ensureDigitalTestingTables().catch(() => {});

    const [
      academicYears,
      campuses,
      classes,
      subjects,
      testingPeriods,
      testingExams,
      testingSessions,
    ] = await Promise.all([
      prisma.academicYear
        .findMany({ orderBy: { startDate: "desc" }, take: 5 })
        .catch(() => []),
      prisma.campus
        .findMany({
          select: { id: true, campusCode: true, campusName: true },
          orderBy: { campusName: "asc" },
        })
        .catch(() => []),
      prisma.class
        .findMany({
          where:
            ctx.isKTDBCL || ctx.isAdmin
              ? undefined
              : {
                  id: {
                    in: Array.from(
                      new Set([
                        ...ctx.homeroomClassIds,
                        ...ctx.subjectAssignments.map((a) => a.classId),
                      ])
                    ),
                  },
                },
          select: {
            id: true,
            classCode: true,
            className: true,
            grade: true,
            campusId: true,
            academicYearId: true,
          },
          orderBy: { className: "asc" },
        })
        .catch(() => []),
      prisma.subject
        .findMany({
          select: { id: true, subjectCode: true, subjectName: true },
          orderBy: { subjectName: "asc" },
        })
        .catch(() => []),
      prisma.testingPeriod
        .findMany({
          orderBy: { startDate: "desc" },
          take: 25,
        })
        .catch(() => []),
      prisma.testingSubjectExam
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 60,
        })
        .catch(() => []),
      prisma.testingSession
        .findMany({
          orderBy: { examDate: "desc" },
          take: 60,
        })
        .catch(() => []),
    ]);

    return NextResponse.json({
      ...listResult,
      actor: {
        userId: ctx.userId,
        userName: ctx.userName,
        role: ctx.role,
        isKTDBCL: ctx.isKTDBCL,
        isAdmin: ctx.isAdmin,
        isGVCN: ctx.isGVCN,
        isGVBM: ctx.isGVBM,
        isParent: ctx.isParent,
        isStudent: ctx.isStudent,
        homeroomClassIds: ctx.homeroomClassIds,
        subjectAssignments: ctx.subjectAssignments,
        linkedStudents: ctx.linkedStudents,
      },
      meta: {
        academicYears,
        campuses,
        classes,
        subjects,
        testingPeriods,
        testingExams,
        testingSessions,
        categories: NOTIFICATION_CATEGORIES,
        priorities: NOTIFICATION_PRIORITIES,
        workflowStatuses: NOTIFICATION_WORKFLOW_STATUSES,
        automatedEvents: AUTOMATED_EXAM_EVENTS,
        templates: BUILTIN_NOTIFICATION_TEMPLATES,
      },
    });
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/notification-center Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveNotificationActorContext();
    const body = await req.json();

    const result = await createOrPublishNotification(ctx, body);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/notification-center Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
