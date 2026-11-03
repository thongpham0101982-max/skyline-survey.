import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from '@/lib/coordination/schemaInit';
import { canUserReadThreadContent, COORDINATION_TOPICS } from '@/lib/coordination/constants';
import { replyToExistingThread, getValidTeachersForClass } from '@/lib/coordination/coordinationService';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    await ensureCoordinationTables();

    const { id } = await context.params;
    const userId = session.user.id;
    const userRole = (session.user as { role?: string }).role || 'PARENT';

    const thread = await prisma.communicationThread.findUnique({
      where: { id },
      include: {
        messages: {
          include: {
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        participants: true,
        cases: {
          include: {
            history: { orderBy: { createdAt: 'desc' } },
            satisfaction: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Không tìm thấy cuộc trao đổi.' }, { status: 404 });
    }

    const [teacher, parent] = await Promise.all([
      prisma.teacher.findUnique({ where: { userId } }),
      prisma.parent.findUnique({ where: { userId } }),
    ]);

    let homeroomClassIds: string[] = [];
    if (teacher) {
      const [hDirect, hLinks] = await Promise.all([
        prisma.class.findMany({
          where: { homeroomTeacherId: teacher.id },
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
      homeroomClassIds = Array.from(
        new Set([...hDirect.map((c) => c.id), ...hLinks.map((l) => l.classId)])
      );
    }

    const access = canUserReadThreadContent({
      userId,
      userRole,
      teacherId: teacher?.id,
      parentId: parent?.id,
      homeroomClassIds,
      thread,
    });

    const [studentRaw, cls, teacherInfo, parentInfo, subjectRaw] = await Promise.all([
      prisma.student.findUnique({
        where: { id: thread.studentId },
        select: { id: true, studentCode: true, studentName: true, dateOfBirth: true, gender: true },
      }),
      prisma.class.findUnique({
        where: { id: thread.classId },
        select: { id: true, className: true, grade: true, level: true },
      }),
      prisma.teacher.findUnique({
        where: { id: thread.teacherId },
        select: { id: true, teacherCode: true, teacherName: true, email: true, phone: true },
      }),
      thread.parentId
        ? prisma.parent.findUnique({
            where: { id: thread.parentId },
            select: { id: true, parentName: true, phone: true, email: true },
          })
        : Promise.resolve(null),
      thread.subjectId
        ? prisma.subject.findUnique({
            where: { id: thread.subjectId },
            select: { id: true, subjectName: true, subjectCode: true },
          })
        : Promise.resolve(null),
    ]);

    const student = studentRaw
      ? { ...studentRaw, fullName: studentRaw.studentName }
      : null;
    const subjectInfo = subjectRaw
      ? { id: subjectRaw.id, name: subjectRaw.subjectName, code: subjectRaw.subjectCode }
      : null;

    const topicDef = COORDINATION_TOPICS.find((t) => t.code === thread.topic);

    if (!access.allowed) {
      if (access.summaryOnly) {
        return NextResponse.json({
          success: true,
          data: {
            id: thread.id,
            threadCode: thread.threadCode,
            threadType: thread.threadType,
            topic: thread.topic,
            topicLabel: topicDef?.label || thread.topic,
            subjectTitle: thread.subjectTitle,
            status: thread.status,
            visibility: thread.visibility,
            priority: thread.priority,
            student,
            classInfo: cls,
            teacherInfo,
            parentInfo,
            subjectInfo,
            messages: [],
            cases: thread.cases,
            privacyRestricted: true,
            privacyMessage: access.reason,
          },
        });
      }
      return NextResponse.json(
        { error: access.reason || 'Bạn không có quyền xem nội dung hội thoại này.' },
        { status: 403 }
      );
    }

    // Mark as read
    if (userRole === 'PARENT' && thread.unreadCountParent > 0) {
      await prisma.communicationThread.update({
        where: { id: thread.id },
        data: { unreadCountParent: 0 },
      });
    } else if (userRole !== 'PARENT' && thread.unreadCountTeacher > 0) {
      await prisma.communicationThread.update({
        where: { id: thread.id },
        data: {
          unreadCountTeacher: 0,
          status: thread.status === 'NEW' ? 'READ' : thread.status,
        },
      });
    }

    const visibleMessages =
      userRole === 'PARENT'
        ? thread.messages.filter((m) => !m.isInternalNote)
        : thread.messages;

    const { gvcnList, gvbmList } = await getValidTeachersForClass(
      thread.classId,
      thread.academicYearId
    );

    return NextResponse.json({
      success: true,
      data: {
        ...thread,
        topicLabel: topicDef?.label || thread.topic,
        student,
        classInfo: cls,
        teacherInfo,
        parentInfo,
        subjectInfo,
        messages: visibleMessages,
        classGvcnContacts: gvcnList,
        classGvbmContacts: gvbmList,
        privacyRestricted: false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải chi tiết hội thoại.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
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
    const userRole = (session.user as { role?: string }).role || 'PARENT';
    const userName = session.user.name || session.user.email || 'Người dùng';

    const result = await replyToExistingThread({
      threadId: id,
      actorUserId: session.user.id,
      actorName: userName,
      actorRole: userRole,
      content: body.content,
      isInternalNote: Boolean(body.isInternalNote),
      shareWithGvcn: Boolean(body.shareWithGvcn),
      clientMessageId: body.clientMessageId,
      attachments: body.attachments,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi gửi tin nhắn phản hồi.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    await ensureCoordinationTables();
    const { id } = await context.params;
    const body = await req.json();

    const updated = await prisma.communicationThread.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.visibility ? { visibility: body.visibility } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật hội thoại.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
