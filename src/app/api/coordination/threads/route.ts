import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '@/lib/coordination/schemaInit';
import { createOrReplyThread } from '@/lib/coordination/coordinationService';
import { COORDINATION_TOPICS } from '@/lib/coordination/constants';

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
    const classId = searchParams.get('classId') || undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const topic = searchParams.get('topic') || undefined;
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') || '25', 10)));

    const where: Record<string, unknown> = {
      ...(academicYearId ? { academicYearId } : {}),
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
      ...(topic ? { topic } : {}),
    };

    if (userRole === 'PARENT' || viewMode === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId } });
      where.parentId = parent?.id || '__NONE__';
      if (unreadOnly) where.unreadCountParent = { gt: 0 };
    } else if (viewMode === 'GVCN') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) {
        return NextResponse.json({ success: true, data: { items: [], total: 0, page, pageSize } });
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
      where.classId = classId
        ? { in: hClassIds.filter((id) => id === classId) }
        : { in: hClassIds };
      // Privacy guard: GVCN cannot read private 1-1 GVBM-Parent threads unless shared/escalated
      where.OR = [
        { teacherId: teacher.id },
        { visibility: { in: ['SHARED_WITH_GVCN', 'ESCALATED_QA'] } },
      ];
      if (unreadOnly) where.unreadCountTeacher = { gt: 0 };
    } else if (viewMode === 'GVBM' || userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      where.teacherId = teacher?.id || '__NONE__';
      if (viewMode === 'GVBM') {
        where.threadType = { in: ['PARENT_GVBM', 'GVCN_GVBM_COORD'] };
      }
      if (unreadOnly) where.unreadCountTeacher = { gt: 0 };
    }

    const rawThreads = await prisma.communicationThread.findMany({
      where,
      include: {
        cases: {
          select: {
            id: true,
            caseCode: true,
            status: true,
            priority: true,
            slaDueAt: true,
            isOverdue: true,
          },
        },
        _count: {
          select: { messages: true, attachments: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Enrich metadata
    const studentIds = Array.from(new Set(rawThreads.map((t) => t.studentId)));
    const classIds = Array.from(new Set(rawThreads.map((t) => t.classId)));
    const teacherIds = Array.from(new Set(rawThreads.map((t) => t.teacherId)));
    const parentIds = Array.from(
      new Set(rawThreads.map((t) => t.parentId).filter((p): p is string => Boolean(p)))
    );
    const subjectIds = Array.from(
      new Set(rawThreads.map((t) => t.subjectId).filter((s): s is string => Boolean(s)))
    );

    const [students, classes, teachers, parents, subjects] = await Promise.all([
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
      parentIds.length > 0
        ? prisma.parent.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, parentName: true, phone: true },
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
    const parentMap = new Map(parents.map((p) => [p.id, p]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    let enriched = rawThreads.map((t) => {
      const st = studentMap.get(t.studentId);
      const cls = classMap.get(t.classId);
      const tc = teacherMap.get(t.teacherId);
      const pr = t.parentId ? parentMap.get(t.parentId) : null;
      const sb = t.subjectId ? subjectMap.get(t.subjectId) : null;
      const topicDef = COORDINATION_TOPICS.find((tp) => tp.code === t.topic);

      return {
        ...t,
        topicLabel: topicDef?.label || t.topic,
        studentName: st?.studentName || 'Học sinh',
        studentCode: st?.studentCode || '',
        className: cls?.className || '',
        teacherName: tc?.teacherName || 'Giáo viên',
        teacherCode: tc?.teacherCode || '',
        parentName: pr?.parentName || 'Phụ huynh',
        subjectName: sb?.subjectName || (t.threadType === 'PARENT_GVCN' ? 'Chủ nhiệm lớp' : 'Bộ môn'),
      };
    });

    if (search) {
      enriched = enriched.filter(
        (item) =>
          item.studentName.toLowerCase().includes(search) ||
          item.studentCode.toLowerCase().includes(search) ||
          item.parentName.toLowerCase().includes(search) ||
          item.teacherName.toLowerCase().includes(search) ||
          item.subjectTitle.toLowerCase().includes(search) ||
          item.threadCode.toLowerCase().includes(search)
      );
    }

    const total = enriched.length;
    const paged = enriched.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        items: paged,
        total,
        page,
        pageSize,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải danh sách hội thoại.';
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
    const userName = session.user.name || session.user.email || 'Người dùng';

    const result = await createOrReplyThread({
      actorUserId: session.user.id,
      actorName: userName,
      actorRole: userRole,
      studentId: body.studentId,
      teacherId: body.teacherId,
      roleType: body.roleType === 'GVBM' ? 'GVBM' : 'GVCN',
      subjectId: body.subjectId || null,
      topic: body.topic || 'PHOI_HOP_GIAO_DUC',
      subjectTitle: body.subjectTitle,
      content: body.content,
      priority: body.priority,
      clientMessageId: body.clientMessageId,
      attachments: body.attachments,
      createCaseImmediately: Boolean(body.createCaseImmediately),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi gửi trao đổi.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
