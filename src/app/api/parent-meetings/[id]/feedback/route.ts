import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    createParentMeetingFeedback,
    interactWithMeetingFeedback,
    listMeetingFeedback,
    ParentMeetingError,
    resolveParentMeetingActorContext,
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

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const feedbacks = await listMeetingFeedback(ctx, {
            meetingId: id,
            classId: searchParams.get("classId") || undefined,
            studentId: searchParams.get("studentId") || undefined,
            topicGroup: searchParams.get("topicGroup") || undefined,
            businessStatus: searchParams.get("businessStatus") || undefined,
            onlyOverdue: searchParams.get("onlyOverdue") === "true",
        });

        return NextResponse.json({ feedbacks });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/[id]/feedback] Error:", err);
        return NextResponse.json(
            { error: "Không thể tải danh sách trao đổi & góp ý." },
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

        if (body.feedbackId && body.action) {
            const updated = await interactWithMeetingFeedback(ctx, {
                feedbackId: body.feedbackId,
                action: body.action,
                messageContent: body.messageContent,
                newStatus: body.newStatus,
                targetAssigneeUserId: body.targetAssigneeUserId,
                targetAssigneeName: body.targetAssigneeName,
                targetAssigneeRole: body.targetAssigneeRole,
                dueAt: body.dueAt,
                allowShareInSummary: body.allowShareInSummary,
                visibilityScope: body.visibilityScope,
                csatScore: body.csatScore,
                csatComment: body.csatComment,
            });
            return NextResponse.json({ feedback: updated });
        }

        const created = await createParentMeetingFeedback(ctx, {
            meetingId: id,
            classId: body.classId,
            studentId: body.studentId,
            stage: body.stage || "PRE_MEETING",
            topicGroup: body.topicGroup || "KET_QUA_HOC_TAP",
            title: body.title,
            content: body.content,
            attachments: body.attachments,
            visibilityScope: body.visibilityScope || "PRIVATE",
            allowShareInSummary: body.allowShareInSummary ?? false,
            dueAt: body.dueAt,
        });

        return NextResponse.json({ feedback: created }, { status: 201 });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings/[id]/feedback] Error:", err);
        return NextResponse.json(
            { error: "Không thể gửi ý kiến góp ý." },
            { status: 500 }
        );
    }
}
