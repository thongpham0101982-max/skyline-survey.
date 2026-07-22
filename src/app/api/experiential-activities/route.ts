import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can view activities' }, { status: 403 });

    const activities = await prisma.activityRecord.findMany({
      where: { teacherId: teacher.id },
      include: {
        catalog: true,
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedActivities = activities.map(act => ({
      id: act.id,
      code: act.code || '',
      name: act.name || act.catalog.name,
      catalogName: act.catalog.name,
      academicYearId: act.academicYearId,
      date: act.date.toISOString().split('T')[0],
      location: act.locationId || 'Không rõ',
      status: act.status,
      participants: act._count.participants,
    }));

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) return NextResponse.json({ error: 'Only teachers can create activities' }, { status: 403 });

    const body = await req.json();
    const { info, target, defaults, studentResults, isDraft } = body;

    if (!info.name || !info.academicYear) return NextResponse.json({ error: 'Missing required info fields' }, { status: 400 });

    const fallbackCategory = await prisma.activityCategory.findFirst({ where: { status: 'ACTIVE' } });
    if (!fallbackCategory) return NextResponse.json({ error: 'No ActivityCategory found' }, { status: 500 });

    let catalog = await prisma.activityCatalog.findFirst({ where: { name: info.name } });
    if (!catalog) {
      catalog = await prisma.activityCatalog.create({
        data: {
          code: 'ACT' + Date.now().toString(),
          name: info.name,
          groupId: info.ROLE || fallbackCategory.id,
          typeId: info.FORMAT || fallbackCategory.id,
          level: info.LEVEL || null,
        }
      });
    }

    const count = await prisma.activityRecord.count();
    const generatedCode = `HĐ-${String(count + 1).padStart(3, '0')}`;

    const activityRecord = await prisma.activityRecord.create({
      data: {
        code: generatedCode,
        name: info.activityName || catalog.name,
        catalogId: catalog.id,
        date: info.date ? new Date(info.date) : new Date(),
        semester: parseInt(info.semester) || 1,
        academicYearId: info.academicYear,
        levelId: info.LEVEL || null,
        formatId: info.FORMAT || null,
        organizerId: info.ORGANIZER || null,
        teacherId: teacher.id,
        locationId: info.location || null,
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
        objectives: info.objectives || null,
        tasks: info.tasks || null,
        criteria: info.criteria || null,
        coTeachers: info.coTeachers || null,
      }
    });

    const selectedStudentIds = new Set<string>();
    if (target) {
      if (target.classes && target.classes.length > 0) {
        const studentsInClasses = await prisma.student.findMany({
          where: { classId: { in: target.classes } },
          select: { id: true }
        });
        studentsInClasses.forEach(s => selectedStudentIds.add(s.id));
      } else if (target.students && target.students.length > 0) {
        target.students.forEach((s: any) => selectedStudentIds.add(s.id || s));
      }
    }

    if (studentResults) {
      Object.keys(studentResults).forEach(studentId => selectedStudentIds.add(studentId));
    }

    const participantsData = Array.from(selectedStudentIds).map(studentId => {
      const individualResult = studentResults?.[studentId]?.result || {};
      return {
        recordId: activityRecord.id,
        studentId: studentId,
        roleId: individualResult.ROLE || defaults.ROLE || null,
        evalLevelId: individualResult.EVAL_LEVEL || defaults.EVAL_LEVEL || null,
        achievementId: individualResult.ACHIEVEMENT || defaults.ACHIEVEMENT || null,
        absenceReasonId: individualResult.ABSENCE_REASON || defaults.ABSENCE_REASON || null,
        note: null,
      };
    });

    if (participantsData.length > 0) {
      await prisma.activityParticipant.createMany({ data: participantsData });
    }

    return NextResponse.json({ success: true, activityId: activityRecord.id });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
