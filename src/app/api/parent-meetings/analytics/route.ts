import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    getParentMeetingAnalytics,
    ParentMeetingError,
    resolveParentMeetingActorContext,
} from "@/lib/parent-meeting/parentMeetingService";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        if (!ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS) {
            return NextResponse.json(
                { error: "Bạn không có quyền truy cập báo cáo chất lượng họp phụ huynh toàn hệ thống." },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const analytics = await getParentMeetingAnalytics(ctx, {
            academicYearId: searchParams.get("academicYearId") || undefined,
            semester: searchParams.get("semester") || undefined,
            campusId: searchParams.get("campusId") || undefined,
            grade: searchParams.get("grade") || undefined,
            classId: searchParams.get("classId") || undefined,
            topicGroup: searchParams.get("topicGroup") || undefined,
        });

        return NextResponse.json(analytics);
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/analytics] Error:", err);
        return NextResponse.json(
            { error: "Không thể tải dữ liệu phân tích họp phụ huynh." },
            { status: 500 }
        );
    }
}
