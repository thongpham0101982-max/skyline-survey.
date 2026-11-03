import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  NotificationCenterError,
  resolveNotificationActorContext,
  transitionNotificationWorkflow,
} from "@/lib/notification-center/notificationCenterService";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveNotificationActorContext();
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;

    const notif = await prisma.ssmNotification.findUnique({
      where: { id },
      include: {
        attachments: true,
        approvals: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!notif) {
      return NextResponse.json({ error: "Không tìm thấy thông báo." }, { status: 404 });
    }

    // Parent / Student anti-IDOR check
    if (ctx.isParent || ctx.isStudent) {
      const allowedStudentIds = ctx.linkedStudents.map((s) => s.studentId);
      const whereRecip: any = {
        notificationId: id,
        recipientUserId: ctx.userId,
      };
      if (studentId) {
        if (ctx.isParent && !allowedStudentIds.includes(studentId)) {
          return NextResponse.json(
            { error: "Không có quyền truy cập dữ liệu của học sinh khác." },
            { status: 403 }
          );
        }
        whereRecip.studentId = studentId;
      }

      const recipient = await prisma.ssmNotificationRecipient.findFirst({
        where: whereRecip,
      });

      if (!recipient) {
        return NextResponse.json(
          { error: "Bạn không có quyền truy cập thông báo này." },
          { status: 403 }
        );
      }

      const responses = await prisma.ssmNotificationResponse.findMany({
        where: {
          notificationId: id,
          OR: [
            { senderUserId: ctx.userId },
            ...(recipient.studentId ? [{ studentId: recipient.studentId }] : []),
          ],
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({
        notification: {
          ...notif,
          examScheduleMeta: notif.examScheduleMetaJson
            ? JSON.parse(notif.examScheduleMetaJson)
            : null,
          beforeChange: notif.beforeChangeJson ? JSON.parse(notif.beforeChangeJson) : null,
          afterChange: notif.afterChangeJson ? JSON.parse(notif.afterChangeJson) : null,
        },
        recipient: {
          ...recipient,
          personalMeta: recipient.personalMetaJson ? JSON.parse(recipient.personalMetaJson) : null,
        },
        responses,
      });
    }

    // Sender / Admin / Teacher view
    const whereRecipients: any = { notificationId: id };
    if (!ctx.isKTDBCL && !ctx.isAdmin && !ctx.isSuperAdmin && notif.senderUserId !== ctx.userId) {
      const allowedClasses = Array.from(
        new Set([
          ...ctx.homeroomClassIds,
          ...ctx.subjectAssignments.map((a) => a.classId),
        ])
      );
      whereRecipients.classId = { in: allowedClasses };
    }

    const [recipients, responses, auditLogs] = await Promise.all([
      prisma.ssmNotificationRecipient.findMany({
        where: whereRecipients,
        orderBy: [{ isRead: "asc" }, { className: "asc" }, { studentName: "asc" }],
        take: 250,
      }),
      prisma.ssmNotificationResponse.findMany({
        where: { notificationId: id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.ssmNotificationAuditLog.findMany({
        where: { notificationId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      notification: {
        ...notif,
        examScheduleMeta: notif.examScheduleMetaJson
          ? JSON.parse(notif.examScheduleMetaJson)
          : null,
        beforeChange: notif.beforeChangeJson ? JSON.parse(notif.beforeChangeJson) : null,
        afterChange: notif.afterChangeJson ? JSON.parse(notif.afterChangeJson) : null,
      },
      recipients,
      responses,
      auditLogs,
    });
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/notification-center/[id] Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveNotificationActorContext();
    const { id } = await context.params;
    const body = await req.json();

    const result = await transitionNotificationWorkflow(ctx, {
      notificationId: id,
      action: body.action,
      comment: body.comment,
      amendedTitle: body.amendedTitle,
      amendedContentHtml: body.amendedContentHtml,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[PATCH /api/notification-center/[id] Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
