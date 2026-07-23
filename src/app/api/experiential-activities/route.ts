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
      // Find the correct group using GROU name matching GROUP name
      const grouCat = await prisma.activityCategory.findFirst({
        where: { type: 'GROU', code: info.GROU }
      });
      let groupCategory = null;
      if (grouCat) {
        groupCategory = await prisma.activityCategory.findFirst({
          where: { type: 'GROUP', name: grouCat.name }
        });
      }
      const groupId = groupCategory?.id || fallbackCategory.id;

      // Find the correct type
      const typeCategory = await prisma.activityCategory.findFirst({
        where: { type: 'TYPE', status: 'ACTIVE' }
      });
      const typeId = typeCategory?.id || fallbackCategory.id;

      catalog = await prisma.activityCatalog.create({
        data: {
          code: info.code || 'ACT' + Date.now().toString(),
          name: info.name,
          groupId: groupId,
          typeId: typeId,
          level: info.LEVEL || null,
        }
      });
    }

    // Generate or use unique code for the ActivityRecord based on the catalog code
    const baseCode = catalog.code;
    let recordCode = baseCode;
    
    // Check if this record code already exists
    const existingRecord = await prisma.activityRecord.findUnique({
      where: { code: baseCode }
    });
    
    if (existingRecord) {
      // If it exists, append a suffix based on the count of records starting with this baseCode
      const suffixCount = await prisma.activityRecord.count({
        where: {
          code: {
            startsWith: `${baseCode}-`
          }
        }
      });
      recordCode = `${baseCode}-${suffixCount + 1}`;
    }

    const activityRecord = await prisma.activityRecord.create({
      data: {
        code: recordCode,
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
