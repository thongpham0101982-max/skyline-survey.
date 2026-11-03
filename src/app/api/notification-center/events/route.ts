import { NextResponse } from "next/server";
import {
  NotificationCenterError,
  pullExamScheduleMetadata,
  resolveNotificationActorContext,
  triggerExamNotificationEvent,
} from "@/lib/notification-center/notificationCenterService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ctx = await resolveNotificationActorContext();
    const body = await req.json();

    if (body.action === "PULL_EXAM_META") {
      const meta = await pullExamScheduleMetadata({
        testingPeriodId: body.testingPeriodId,
        testingSubjectExamId: body.testingSubjectExamId,
        testingSessionId: body.testingSessionId,
      });
      return NextResponse.json({ examMeta: meta });
    }

    const result = await triggerExamNotificationEvent(ctx, {
      eventType: body.eventType,
      testingPeriodId: body.testingPeriodId,
      testingSubjectExamId: body.testingSubjectExamId,
      testingSessionId: body.testingSessionId,
      studentId: body.studentId,
      reminderDaysBefore: body.reminderDaysBefore ? Number(body.reminderDaysBefore) : undefined,
      beforeChange: body.beforeChange,
      afterChange: body.afterChange,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/notification-center/events Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
