import { NextResponse } from "next/server";
import {
  getNotificationDashboardMetrics,
  NotificationCenterError,
  resolveNotificationActorContext,
} from "@/lib/notification-center/notificationCenterService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await resolveNotificationActorContext();
    const { searchParams } = new URL(req.url);

    const metrics = await getNotificationDashboardMetrics(ctx, {
      academicYearId: searchParams.get("academicYearId") || undefined,
      campusId: searchParams.get("campusId") || undefined,
      classId: searchParams.get("classId") || undefined,
      testingPeriodId: searchParams.get("testingPeriodId") || undefined,
      category: searchParams.get("category") || undefined,
      senderUnit: searchParams.get("senderUnit") || undefined,
      notificationId: searchParams.get("notificationId") || undefined,
    });

    return NextResponse.json(metrics);
  } catch (err: any) {
    if (err instanceof NotificationCenterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/notification-center/analytics Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
