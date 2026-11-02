import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    createParentMeetingTask,
    listParentMeetingTasks,
    ParentMeetingError,
    resolveParentMeetingActorContext,
    updateParentMeetingTask,
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

        const tasks = await listParentMeetingTasks(ctx, {
            meetingId: id,
            classId: searchParams.get("classId") || undefined,
            studentId: searchParams.get("studentId") || undefined,
            status: searchParams.get("status") || undefined,
        });

        return NextResponse.json({ tasks });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/[id]/tasks] Error:", err);
        return NextResponse.json(
            { error: "Không thể tải danh sách nhiệm vụ sau họp." },
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

        const task = await createParentMeetingTask(ctx, {
            meetingId: id,
            classId: body.classId,
            minutesId: body.minutesId,
            feedbackLinkId: body.feedbackLinkId,
            studentId: body.studentId,
            title: body.title,
            description: body.description,
            assigneeUserId: body.assigneeUserId,
            assigneeName: body.assigneeName,
            assigneeRole: body.assigneeRole,
            department: body.department,
            dueAt: body.dueAt,
            priority: body.priority,
            visibleToParents: body.visibleToParents,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings/[id]/tasks] Error:", err);
        return NextResponse.json(
            { error: "Không thể tạo nhiệm vụ sau họp." },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const task = await updateParentMeetingTask(ctx, {
            taskId: body.taskId,
            status: body.status,
            evidenceUrl: body.evidenceUrl,
            evidenceNote: body.evidenceNote,
            resultSummary: body.resultSummary,
            visibleToParents: body.visibleToParents,
        });

        return NextResponse.json({ task });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[PATCH /api/parent-meetings/[id]/tasks] Error:", err);
        return NextResponse.json(
            { error: "Không thể cập nhật nhiệm vụ sau họp." },
            { status: 500 }
        );
    }
}
