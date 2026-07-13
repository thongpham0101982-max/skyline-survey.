import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can edit results' }, { status: 403 });

    const params = await props.params;
    const id = params.id;
    const activity = await prisma.activityRecord.findUnique({ where: { id: id } });

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (activity.teacherId !== teacher.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await req.json();
    const { students } = data;

    if (!Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const updatePromises = students.map((student: any) => {
      return prisma.activityParticipant.update({
        where: { id: student.id },
        data: {
          roleId: student.roleId,
          evalLevelId: student.evalLevelId,
          achievementId: student.achievementId,
          absenceReasonId: student.absenceReasonId,
          note: student.note,
        }
      });
    });

    await prisma.$transaction(updatePromises);

    if (activity.status === 'DRAFT') {
      await prisma.activityRecord.update({
        where: { id: id },
        data: { status: 'SUBMITTED' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating activity results:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
