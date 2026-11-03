import { NextResponse } from "next/server";
import {
  interactWithNotification,
  NotificationCenterError,
  resolveNotificationActorContext,
} from "@/lib/notification-center/notificationCenterService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveNotificationActorContext();
    const { id } = await context.params;
    const body = await req.json();

    const result = await interactWithNotification(ctx, {
      notificationId: id,
      recipientId: body.recipientId,
      studentId: body.studentId,
      action: body.action,
      acknowledgeNote: body.acknowledgeNote,
      replyContent: body.replyContent,
      parentResponseId: body.parentResponseId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/notification-center/[id]/interact Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
