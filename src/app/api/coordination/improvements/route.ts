import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '@/lib/coordination/schemaInit';
import {
  createOrUpdateImprovementAction,
  generateVerifiedImprovementSuggestions,
} from '@/lib/coordination/coordinationService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    await ensureCoordinationTables();

    const userId = session.user.id;
    const userRole = (session.user as { role?: string }).role || 'TEACHER';
    const { searchParams } = new URL(req.url);

    const academicYearId = searchParams.get('academicYearId') || undefined;
    const campusId = searchParams.get('campusId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const status = searchParams.get('status') || undefined;
    const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

    const where: Record<string, unknown> = {
      ...(academicYearId ? { academicYearId } : {}),
      ...(campusId ? { campusId } : {}),
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(status ? { status } : {}),
    };

    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      where.OR = [
        { assigneeUserId: userId },
        { teacherId: teacher?.id || '__NONE__' },
      ];
    }

    const actions = await prisma.qualityImprovementAction.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    let suggestions: unknown[] = [];
    if (includeSuggestions && academicYearId) {
      suggestions = await generateVerifiedImprovementSuggestions({
        academicYearId,
        campusId,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        actions,
        suggestions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải danh sách nhiệm vụ cải tiến.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    const body = await req.json();
    const userRole = (session.user as { role?: string }).role || 'KT_DBCL';

    const result = await createOrUpdateImprovementAction({
      actorUserId: session.user.id,
      actorRole: userRole,
      academicYearId: body.academicYearId,
      campusId: body.campusId,
      departmentId: body.departmentId || null,
      classId: body.classId || null,
      subjectId: body.subjectId || null,
      teacherId: body.teacherId || null,
      sourceType: body.sourceType || 'QA_AUDIT',
      title: body.title,
      content: body.content,
      verifiedRootCause: body.verifiedRootCause,
      actionPlan: body.actionPlan,
      assigneeUserId: body.assigneeUserId || session.user.id,
      assigneeName: body.assigneeName,
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 7 * 86400000),
      linkedPeriodId: body.linkedPeriodId || null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tạo nhiệm vụ cải tiến.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    const body = await req.json();
    const userRole = (session.user as { role?: string }).role || 'TEACHER';

    const result = await createOrUpdateImprovementAction({
      id: body.id,
      actorUserId: session.user.id,
      actorRole: userRole,
      academicYearId: body.academicYearId || '',
      campusId: body.campusId || '',
      title: body.title,
      content: body.content,
      verifiedRootCause: body.verifiedRootCause,
      actionPlan: body.actionPlan,
      assigneeUserId: body.assigneeUserId || session.user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
      evidenceUrl: body.evidenceUrl,
      evidenceNote: body.evidenceNote,
      status: body.status,
      verificationResult: body.verificationResult,
      postImprovementEffectiveness: body.postImprovementEffectiveness,
      recurrenceCount: body.recurrenceCount !== undefined ? Number(body.recurrenceCount) : undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật nhiệm vụ cải tiến.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
