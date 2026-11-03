import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '@/lib/coordination/schemaInit';
import {
  createAndSyncNpsSurveyPeriod,
  syncAssignmentsForNpsPeriod,
  submitParentNpsSurveyResponse,
  getNpsAnalyticsSummary,
} from '@/lib/coordination/coordinationService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    await ensureCoordinationTables();

    const userId = session.user.id;
    const userRole = (session.user as { role?: string }).role || 'PARENT';
    const { searchParams } = new URL(req.url);

    const academicYearId = searchParams.get('academicYearId') || undefined;
    const periodId = searchParams.get('periodId') || undefined;
    const campusId = searchParams.get('campusId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const teacherId = searchParams.get('teacherId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const roleType = (searchParams.get('roleType') as 'GVCN' | 'GVBM') || undefined;

    const periods = await prisma.npsSurveyPeriod.findMany({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        ...(campusId ? { OR: [{ campusId }, { campusId: null }] } : {}),
      },
      include: {
        _count: {
          select: { assignments: true, responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If Parent is viewing (C5), load published survey assignments for their selected child
    if (userRole === 'PARENT' || studentId) {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: {
          students: {
            include: { student: true },
          },
        },
      });

      const targetStudent =
        (studentId
          ? parent?.students.find((s) => s.studentId === studentId)?.student
          : parent?.students[0]?.student) || null;

      let parentEvaluations: Array<Record<string, unknown>> = [];
      if (parent && targetStudent && targetStudent.classId) {
        const publishedAssignments = await prisma.npsSurveyAssignment.findMany({
          where: {
            classId: targetStudent.classId,
            period: { status: 'PUBLISHED' },
          },
          include: {
            period: true,
          },
          orderBy: [{ roleType: 'asc' }, { createdAt: 'desc' }],
        });

        const tIds = Array.from(new Set(publishedAssignments.map((a) => a.teacherId)));
        const sIds = Array.from(
          new Set(publishedAssignments.map((a) => a.subjectId).filter((s): s is string => Boolean(s)))
        );

        const [teachers, subjects, myResponses] = await Promise.all([
          tIds.length > 0
            ? prisma.teacher.findMany({
                where: { id: { in: tIds } },
                select: { id: true, teacherName: true, teacherCode: true },
              })
            : Promise.resolve([]),
          sIds.length > 0
            ? prisma.subject.findMany({
                where: { id: { in: sIds } },
                select: { id: true, subjectName: true },
              })
            : Promise.resolve([]),
          prisma.npsSurveyResponse.findMany({
            where: {
              parentId: parent.id,
              studentId: targetStudent.id,
            },
          }),
        ]);

        const tMap = new Map(teachers.map((t) => [t.id, t]));
        const sMap = new Map(subjects.map((s) => [s.id, s]));
        const myRespMap = new Map(myResponses.map((r) => [r.assignmentId, r]));

        parentEvaluations = publishedAssignments.map((a) => {
          const submitted = myRespMap.get(a.id);
          return {
            assignmentId: a.id,
            periodId: a.periodId,
            periodTitle: a.period.title,
            semester: a.period.semester,
            roleType: a.roleType,
            teacherId: a.teacherId,
            teacherName: tMap.get(a.teacherId)?.teacherName || 'Giáo viên',
            subjectId: a.subjectId,
            subjectName: a.subjectId ? sMap.get(a.subjectId)?.subjectName || 'Bộ môn' : 'Chủ nhiệm lớp',
            isCompleted: Boolean(submitted),
            submittedScore: submitted?.npsScore ?? null,
            submittedCriteriaAverage: submitted?.criteriaAverage ?? null,
            submittedAt: submitted?.createdAt ?? null,
          };
        });
      }

      if (userRole === 'PARENT') {
        return NextResponse.json({
          success: true,
          data: {
            periods: periods.filter((p) => p.status === 'PUBLISHED'),
            parentEvaluations,
          },
        });
      }
    }

    // Teacher or Admin analytics
    let effectiveTeacherId = teacherId;
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      effectiveTeacherId = teacher?.id || '__NONE__';
    }

    const analytics = await getNpsAnalyticsSummary({
      academicYearId,
      periodId,
      campusId,
      classId,
      subjectId,
      teacherId: effectiveTeacherId,
      roleType,
      viewerRole: userRole,
    });

    return NextResponse.json({
      success: true,
      data: {
        periods,
        analytics,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu NPS.';
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
    const userRole = (session.user as { role?: string }).role || 'PARENT';

    if (body.action === 'CREATE_PERIOD') {
      const result = await createAndSyncNpsSurveyPeriod({
        actorUserId: session.user.id,
        actorRole: userRole,
        code: body.code,
        title: body.title,
        description: body.description,
        academicYearId: body.academicYearId,
        campusId: body.campusId || null,
        semester: body.semester || 'HK1',
        targetScope: body.targetScope || 'ALL',
        minSampleSize: body.minSampleSize ? Number(body.minSampleSize) : 5,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate
          ? new Date(body.endDate)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        publishImmediately: Boolean(body.publishImmediately),
      });
      return NextResponse.json({ success: true, data: result });
    }

    // Default: Parent submitting NPS response
    const submitted = await submitParentNpsSurveyResponse({
      periodId: body.periodId,
      assignmentId: body.assignmentId,
      parentUserId: session.user.id,
      studentId: body.studentId,
      npsScore: Number(body.npsScore),
      criteriaCommunication: Number(body.criteriaCommunication),
      criteriaTimeliness: Number(body.criteriaTimeliness),
      criteriaClarity: Number(body.criteriaClarity),
      criteriaSupport: Number(body.criteriaSupport),
      criteriaCoordination: Number(body.criteriaCoordination),
      feedbackTopic: body.feedbackTopic,
      comment: body.comment,
    });

    return NextResponse.json({ success: true, data: submitted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi xử lý khảo sát NPS.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    await ensureCoordinationTables();
    const body = await req.json();

    if (body.action === 'SYNC_ASSIGNMENTS' && body.periodId) {
      const syncRes = await syncAssignmentsForNpsPeriod(body.periodId);
      return NextResponse.json({ success: true, data: syncRes });
    }

    if (body.periodId && body.status) {
      const updated = await prisma.npsSurveyPeriod.update({
        where: { id: body.periodId },
        data: {
          status: body.status,
          ...(body.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'Yêu cầu cập nhật không hợp lệ.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật kỳ khảo sát NPS.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
