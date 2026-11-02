import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    ParentMeetingError,
    resolveParentMeetingActorContext,
    submitParentRsvp,
} from "@/lib/parent-meeting/parentMeetingService";

export async function POST(
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

        const invitation = await submitParentRsvp(ctx, {
            meetingId: id,
            studentId: body.studentId,
            rsvpStatus: body.rsvpStatus,
            attendeeRole: body.attendeeRole,
            attendeeName: body.attendeeName,
            attendeePhone: body.attendeePhone,
            delegateRelationship: body.delegateRelationship,
            absenceReason: body.absenceReason,
            expectedHeadcount: body.expectedHeadcount,
            rsvpNote: body.rsvpNote,
        });

        return NextResponse.json({ invitation });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings/[id]/rsvp] Error:", err);
        return NextResponse.json(
            { error: "Không thể lưu xác nhận tham dự." },
            { status: 500 }
        );
    }
}
