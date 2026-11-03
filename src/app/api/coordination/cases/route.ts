import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '@/lib/coordination/schemaInit';
import { createCoordinationCase } from '@/lib/coordination/coordinationService';
import { COORDINATION_TOPICS, classifyAdminRole } from '@/lib/coordination/constants';

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

    const viewMode = searchParams.get('viewMode') || userRole;
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const campusId = searchParams.get('campusId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || searchParams.get('topic') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const overdueOnly = searchParams.get('overdueOnly') === 'true';
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const where: Record<string, unknown> = {
      ...(academicYearId ? { academicYearId } : {}),
      ...(campusId ? { campusId } : {}),
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(priority ? { priority } : {}),
      ...(overdueOnly ? { isOverdue: true } : {}),
    };

    if (userRole === 'PARENT' || viewMode === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId } });
      where.parentId = parent?.id || '__NONE__';
    } else if (viewMode === 'GVCN') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) {
        return NextResponse.json({ success: true, data: [] });
      }
      const [hDirect, hLinks] = await Promise.all([
        prisma.class.findMany({
          where: {
            homeroomTeacherId: teacher.id,
            ...(academicYearId ? { academicYearId } : {}),
          },
          select: { id: true },
        }),
        prisma.teacherClassAssignment.findMany({
          where: {
            teacherId: teacher.id,
            roleInClass: { in: ['GVCN', 'HOMEROOM', 'CHU_NHIEM'] },
          },
          select: { classId: true },
        }),
      ]);
      const hClassIds = Array.from(
        new Set([...hDirect.map((c) => c.id), ...hLinks.map((l) => l.classId)])
      );
      where.OR = [
        { classId: { in: hClassIds } },
        { assignedToUserId: userId },
        { createdByUserId: userId },
      ];
    } else if (viewMode === 'GVBM' || userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      where.OR = [
        { teacherId: teacher?.id || '__NONE__' },
        { assignedToUserId: userId },
        { createdByUserId: userId },
      ];
    }

    const cases = await prisma.communicationCase.findMany({
      where,
      include: {
        history: { orderBy: { createdAt: 'desc' } },
        satisfaction: true,
        attachments: true,
      },
      orderBy: [{ isOverdue: 'desc' }, { updatedAt: 'desc' }],
    });

    const studentIds = Array.from(new Set(cases.map((c) => c.studentId)));
    const classIds = Array.from(new Set(cases.map((c) => c.classId)));
    const teacherIds = Array.from(
      new Set(cases.map((c) => c.teacherId).filter((t): t is string => Boolean(t)))
    );
    const subjectIds = Array.from(
      new Set(cases.map((c) => c.subjectId).filter((s): s is string => Boolean(s)))
    );

    const [students, classes, teachers, subjects] = await Promise.all([
      studentIds.length > 0
        ? prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, studentCode: true, studentName: true },
          })
        : Promise.resolve([]),
      classIds.length > 0
        ? prisma.class.findMany({
            where: { id: { in: classIds } },
            select: { id: true, className: true, grade: true },
          })
        : Promise.resolve([]),
      teacherIds.length > 0
        ? prisma.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, teacherCode: true, teacherName: true },
          })
        : Promise.resolve([]),
      subjectIds.length > 0
        ? prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, subjectName: true },
          })
        : Promise.resolve([]),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const adminType = classifyAdminRole(userRole);

    let enriched = cases.map((c) => {
      const st = studentMap.get(c.studentId);
      const cls = classMap.get(c.classId);
      const tc = c.teacherId ? teacherMap.get(c.teacherId) : null;
      const sb = c.subjectId ? subjectMap.get(c.subjectId) : null;
      const topicDef = COORDINATION_TOPICS.find((tp) => tp.code === c.category);

      // Technical Admin does not get private case content by default unless assigned
      const maskPrivateForTechAdmin =
        adminType === 'TECHNICAL_ADMIN' &&
        c.isPrivateContent &&
        c.assignedToUserId !== userId;

      return {
        ...c,
        description: maskPrivateForTechAdmin
          ? '[Nội dung riêng tư được bảo mật theo phân quyền Admin kỹ thuật]'
          : c.description,
        categoryLabel: topicDef?.label || c.category,
        studentName: st?.studentName || 'Học sinh',
        studentCode: st?.studentCode || '',
        className: cls?.className || '',
        teacherName: tc?.teacherName || c.assignedToName || 'Giáo viên',
        subjectName: sb?.subjectName || 'Chủ nhiệm / Chung',
      };
    });

    if (search) {
      enriched = enriched.filter(
        (item) =>
          item.caseCode.toLowerCase().includes(search) ||
          item.title.toLowerCase().includes(search) ||
          item.studentName.toLowerCase().includes(search) ||
          item.studentCode.toLowerCase().includes(search) ||
          item.className.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải danh sách yêu cầu xử lý.';
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
    const userRole = (session.user as { role?: string }).role || 'TEACHER';
    const userName = session.user.name || session.user.email || 'Người dùng';

    const created = await createCoordinationCase({
      actorUserId: session.user.id,
      actorName: userName,
      actorRole: userRole,
      threadId: body.threadId || null,
      studentId: body.studentId,
      teacherId: body.teacherId || null,
      assignedToUserId: body.assignedToUserId,
      assignedToName: body.assignedToName,
      assignedRole: body.assignedRole || 'GVBM',
      subjectId: body.subjectId || null,
      category: body.category || 'PHOI_HOP_GIAO_DUC',
      title: body.title,
      description: body.description,
      priority: body.priority || 'NORMAL',
      supportPlanMeasures: body.supportPlanMeasures,
      slaTargetHours: body.slaTargetHours,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tạo yêu cầu xử lý.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
