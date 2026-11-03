import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  updateCoordinationCase,
  submitCaseSatisfaction,
} from '@/lib/coordination/coordinationService';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const userRole = (session.user as { role?: string }).role || 'TEACHER';
    const userName = session.user.name || session.user.email || 'Người dùng';

    if (body.action === 'SUBMIT_CSAT') {
      const sat = await submitCaseSatisfaction({
        caseId: id,
        parentUserId: session.user.id,
        csatScore: Number(body.csatScore),
        timelinessScore: body.timelinessScore ? Number(body.timelinessScore) : undefined,
        clarityScore: body.clarityScore ? Number(body.clarityScore) : undefined,
        supportScore: body.supportScore ? Number(body.supportScore) : undefined,
        comment: body.comment,
        confirmCompleted: body.confirmCompleted !== false,
      });
      return NextResponse.json({ success: true, data: sat });
    }

    const updated = await updateCoordinationCase({
      caseId: id,
      actorUserId: session.user.id,
      actorName: userName,
      actorRole: userRole,
      action: body.action || 'STATUS_CHANGE',
      toStatus: body.toStatus,
      forwardToUserId: body.forwardToUserId,
      forwardToName: body.forwardToName,
      forwardToRole: body.forwardToRole,
      supportPlanMeasures: body.supportPlanMeasures,
      supportProgressNote: body.supportProgressNote,
      supportOutcomeProposal: body.supportOutcomeProposal,
      resolutionSummary: body.resolutionSummary,
      verifiedConclusion: body.verifiedConclusion,
      syncToStudentSupportRecord: Boolean(body.syncToStudentSupportRecord),
      reopenReason: body.reopenReason,
      note: body.note,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật yêu cầu xử lý.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
