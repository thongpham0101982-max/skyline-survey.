import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    getMeetingMinutesForViewer,
    ParentMeetingError,
    resolveParentMeetingActorContext,
    saveOrTransitionMeetingMinutes,
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
        const classId = searchParams.get("classId") || "";

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const minutes = await getMeetingMinutesForViewer(ctx, id, classId);
        return NextResponse.json({ minutes });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/[id]/minutes] Error:", err);
        return NextResponse.json(
            { error: "Không thể tải biên bản cuộc họp." },
            { status: 500 }
        );
    }
}

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

        const minutes = await saveOrTransitionMeetingMinutes(ctx, {
            meetingId: id,
            classId: body.classId,
            action: body.action || "SAVE_DRAFT",
            attendeeSummary: body.attendeeSummary,
            presentationContent: body.presentationContent,
            discussionIssues: body.discussionIssues,
            generalFeedbackSummary: body.generalFeedbackSummary,
            conclusions: body.conclusions,
            agreedActions: body.agreedActions,
            nextTasksSummary: body.nextTasksSummary,
            approvalNote: body.approvalNote,
            changeSummary: body.changeSummary,
        });

        return NextResponse.json({ minutes });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings/[id]/minutes] Error:", err);
        return NextResponse.json(
            { error: "Không thể lưu biên bản cuộc họp." },
            { status: 500 }
        );
    }
}
