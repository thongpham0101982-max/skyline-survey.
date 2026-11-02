import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    issueParentMeetingQr,
    ParentMeetingError,
    recordManualAttendance,
    resolveParentMeetingActorContext,
    verifyAndCheckInQrToken,
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
        const studentId = searchParams.get("studentId") || "";
        const forceRefresh = searchParams.get("refresh") === "true";

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const result = await issueParentMeetingQr(ctx, {
            meetingId: id,
            studentId,
            forceRefresh,
        });

        return NextResponse.json(result);
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings/[id]/qr] Error:", err);
        return NextResponse.json(
            { error: "Không thể phát hành mã QR điểm danh." },
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

        if (body.checkInMethod === "MANUAL") {
            const attendance = await recordManualAttendance(ctx, {
                meetingId: id,
                classId: body.classId,
                studentId: body.studentId,
                parentId: body.parentId,
                attendeeName: body.attendeeName,
                attendeeRole: body.attendeeRole,
                attendeeCount: body.attendeeCount,
                manualReason: body.manualReason,
                relationshipNote: body.relationshipNote,
                isLate: body.isLate,
            });
            return NextResponse.json({
                mode: "MANUAL",
                attendance,
                messageVi: "Đã ghi nhận điểm danh thủ công thành công!",
            });
        }

        const scanResult = await verifyAndCheckInQrToken(ctx, {
            meetingId: id,
            qrToken: body.qrToken,
            mode: body.mode || "CONFIRM",
            attendeeRole: body.attendeeRole,
            attendeeName: body.attendeeName,
            attendeeCount: body.attendeeCount,
            relationshipNote: body.relationshipNote,
        });

        return NextResponse.json(scanResult);
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings/[id]/qr] Error:", err);
        return NextResponse.json(
            { error: "Lỗi xử lý điểm danh cuộc họp." },
            { status: 500 }
        );
    }
}
