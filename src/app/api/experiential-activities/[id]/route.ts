import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can view activities' }, { status: 403 });

    const id = params.id;
    const activity = await prisma.activityRecord.findUnique({
      where: { id: id },
      include: {
        catalog: true,
        participants: { include: { student: true } }
      }
    });

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (activity.teacherId !== teacher.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching activity details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can delete activities' }, { status: 403 });

    const id = params.id;
    const activity = await prisma.activityRecord.findUnique({ where: { id: id } });

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (activity.teacherId !== teacher.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.activityRecord.delete({ where: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
