import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can view activities' }, { status: 403 });

    const params = await params;
    const id = params.id;
    const activity = await prisma.activityRecord.findUnique({
      where: { id: id },
      include: {
        catalog: true,
        participants: { include: { student: { include: { class: true } } } }
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can delete activities' }, { status: 403 });

    const params = await params;
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can edit activities' }, { status: 403 });

    const params = await params;
    const id = params.id;
    const activity = await prisma.activityRecord.findUnique({ where: { id: id } });

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (activity.teacherId !== teacher.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await req.json();
    
    // Update basic info
    const updatedActivity = await prisma.activityRecord.update({
      where: { id: id },
      data: {
        name: data.name !== undefined ? data.name : activity.name,
        catalogId: data.catalogId || activity.catalogId,
        date: data.date ? new Date(data.date) : activity.date,
        semester: data.semester ? parseInt(data.semester) : activity.semester,
        academicYearId: data.academicYearId || activity.academicYearId,
        locationId: data.locationId !== undefined ? data.locationId : activity.locationId,
        formatId: data.formatId !== undefined ? data.formatId : activity.formatId,
        levelId: data.levelId !== undefined ? data.levelId : activity.levelId,
        organizerId: data.organizerId !== undefined ? data.organizerId : activity.organizerId,
      }
    });

    return NextResponse.json({ success: true, activity: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
