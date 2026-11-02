import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    getParentMeetingDetailForActor,
    ParentMeetingError,
    resolveParentMeetingActorContext,
    updateParentMeeting,
} from "@/lib/parent-meeting/parentMeetingService";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("classId") || undefined;
        const studentId = searchParams.get("studentId") || undefined;

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const detail = await getParentMeetingDetailForActor(ctx, id, {
            classId,
            studentId,
        });

        return NextResponse.json(detail);
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/[id]] Error:", err);
        return NextResponse.json(
            { error: "Không thể tải chi tiết cuộc họp phụ huynh." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await req.json();

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const updated = await updateParentMeeting(ctx, id, body);
        return NextResponse.json({ meeting: updated });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[PATCH /api/parent-meetings/[id]] Error:", err);
        return NextResponse.json(
            { error: "Không thể cập nhật thông tin cuộc họp." },
            { status: 500 }
        );
    }
}
