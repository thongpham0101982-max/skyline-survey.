import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) {
      teacher = await prisma.teacher.findFirst();
    }
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
      name: act.name || act.catalog?.name || 'Hoạt động',
      catalogName: act.catalog?.name || 'Chưa phân loại',
      academicYearId: act.academicYearId,
      date: act.date ? act.date.toISOString().split('T')[0] : '',
      location: act.locationId || 'Không rõ',
      status: act.status,
      participants: act._count?.participants || 0,
    }));

    return NextResponse.json(formattedActivities);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) {
      teacher = await prisma.teacher.findFirst();
    }
    if (!teacher) return NextResponse.json({ error: 'Không tìm thấy tài khoản Giáo viên trong hệ thống' }, { status: 403 });

    const body = await req.json();
    const { info = {}, target = {}, defaults = {}, studentResults = {}, isDraft = false } = body;

    if (!info.name || !info.academicYear) {
      return NextResponse.json({ error: 'Vui lòng điền Tên hoạt động và Năm học' }, { status: 400 });
    }

    const fallbackCategory = await prisma.activityCategory.findFirst({ where: { status: 'ACTIVE' } });
    const fallbackCatId = fallbackCategory?.id || 'default-category';

    let catalog = await prisma.activityCatalog.findFirst({ where: { name: info.name } });
    if (!catalog) {
      const grouCat = info.GROU ? await prisma.activityCategory.findFirst({
        where: { type: 'GROU', code: info.GROU }
      }) : null;
      let groupCategory = null;
      if (grouCat) {
        groupCategory = await prisma.activityCategory.findFirst({
          where: { type: 'GROUP', name: grouCat.name }
        });
      }
      const groupId = groupCategory?.id || fallbackCatId;

      const typeCategory = await prisma.activityCategory.findFirst({
        where: { type: 'TYPE', status: 'ACTIVE' }
      });
      const typeId = typeCategory?.id || fallbackCatId;

      let catalogCode = info.code || ('ACT' + Date.now());
      const existingCatalog = await prisma.activityCatalog.findUnique({ where: { code: catalogCode } });
      if (existingCatalog) {
        catalogCode = `${catalogCode}-${Date.now().toString().slice(-4)}`;
      }

      catalog = await prisma.activityCatalog.create({
        data: {
          code: catalogCode,
          name: info.name,
          groupId: groupId,
          typeId: typeId,
          level: info.LEVEL || null,
        }
      });
    }

    const baseCode = catalog.code || ('ACT' + Date.now());
    let recordCode = info.code || baseCode;
    
    const existingRecord = await prisma.activityRecord.findUnique({
      where: { code: recordCode }
    });
    
    if (existingRecord) {
      recordCode = `${recordCode}-${Date.now().toString().slice(-4)}`;
    }

    const activityRecord = await prisma.activityRecord.create({
      data: {
        code: recordCode,
        name: info.name || catalog.name,
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
      if (target.classes && Array.isArray(target.classes) && target.classes.length > 0) {
        const studentsInClasses = await prisma.student.findMany({
          where: { classId: { in: target.classes } },
          select: { id: true }
        });
        studentsInClasses.forEach(s => selectedStudentIds.add(s.id));
      }
      if (target.specificStudents && Array.isArray(target.specificStudents) && target.specificStudents.length > 0) {
        target.specificStudents.forEach((id: string) => selectedStudentIds.add(id));
      }
      if (target.students && Array.isArray(target.students) && target.students.length > 0) {
        target.students.forEach((s: any) => selectedStudentIds.add(s?.id || s));
      }
    }

    if (studentResults) {
      Object.keys(studentResults).forEach(studentId => selectedStudentIds.add(studentId));
    }

    const participantsData = Array.from(selectedStudentIds).map(studentId => {
      const individualResult = studentResults?.[studentId]?.results || studentResults?.[studentId]?.result || {};
      return {
        recordId: activityRecord.id,
        studentId: studentId,
        roleId: individualResult.ROLE || defaults?.ROLE || null,
        evalLevelId: individualResult.EVAL_LEVEL || defaults?.EVAL_LEVEL || null,
        achievementId: individualResult.ACHIEVEMENT || defaults?.ACHIEVEMENT || null,
        absenceReasonId: individualResult.ABSENCE_REASON || defaults?.ABSENCE_REASON || null,
        note: null,
      };
    });

    if (participantsData.length > 0) {
      await prisma.activityParticipant.createMany({ 
        data: participantsData,
        skipDuplicates: true
      });
    }

    return NextResponse.json({ success: true, activityId: activityRecord.id });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
