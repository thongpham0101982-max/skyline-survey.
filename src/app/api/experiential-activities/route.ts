import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const campusId = searchParams.get('campusId');
    const grade = searchParams.get('grade');
    const level = searchParams.get('level');
    const strand = searchParams.get('strand');
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const userRole = (session?.user as any)?.role || '';
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN'].includes(userRole);

    let teacherRecord: any = null;
    let teacherClassIds = new Set<string>();

    if (!isManagement || userRole === 'TEACHER') {
      teacherRecord = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacherRecord) {
        const teacherClasses = await prisma.class.findMany({
          where: {
            OR: [
              { homeroomTeacherId: teacherRecord.id },
              { homeroomTeacherId: { contains: teacherRecord.id } },
              { teachers: { some: { teacherId: teacherRecord.id } } }
            ]
          },
          select: { id: true, className: true, campusId: true, grade: true, level: true }
        });
        teacherClassIds = new Set(teacherClasses.map(c => c.id));
      }
    }

    // Build filter
    const where: any = {};

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const activities = await prisma.activityRecord.findMany({
      where,
      include: {
        catalog: {
          include: {
            group: true,
            type: true,
            theme: true
          }
        },
        academicYear: true,
        teacher: {
          include: {
            campus: true
          }
        },
        participants: {
          select: {
            id: true,
            studentId: true,
            roleId: true,
            evalLevelId: true,
            note: true,
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true,
                class: {
                  select: {
                    id: true,
                    className: true,
                    grade: true,
                    level: true,
                    campusId: true,
                    campus: {
                      select: {
                        id: true,
                        campusCode: true,
                        campusName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = activities.map(act => {
      let extraData: any = {};
      try {
        if (act.locationId && act.locationId.startsWith('{')) {
          extraData = JSON.parse(act.locationId);
        }
      } catch {}

      // Calculate class progress
      const assignedClasses = extraData.assignedClasses || [];
      const totalClasses = assignedClasses.length;
      const completedClasses = assignedClasses.filter((c: any) => c.status === 'COMPLETED').length;
      const inProgressClasses = assignedClasses.filter((c: any) => c.status === 'IN_PROGRESS').length;

      // Extract unique classes from participants if assignedClasses is empty
      const participantClassIds = new Set(
        act.participants.map(p => p.student?.classId).filter(Boolean)
      );

      const calculatedTotalClasses = totalClasses > 0 ? totalClasses : participantClassIds.size;
      const participantCount = act.participants.length;

      // Find my assigned class for GVCN
      let myAssignedClass: any = null;
      if (teacherRecord) {
        myAssignedClass = assignedClasses.find((c: any) => 
          (c.classId && teacherClassIds.has(c.classId)) ||
          (c.homeroomTeacherId && (c.homeroomTeacherId === teacherRecord.id || c.homeroomTeacherId === teacherRecord.userId)) ||
          (c.homeroomTeacherName && c.homeroomTeacherName.trim().toLowerCase() === teacherRecord.teacherName.trim().toLowerCase())
        );

        // Fallback: If no direct match in assignedClasses, check if participants contain this teacher's class
        if (!myAssignedClass && teacherClassIds.size > 0) {
          const matchParticipant = act.participants.find(p => p.student?.classId && teacherClassIds.has(p.student.classId));
          if (matchParticipant?.student?.class) {
            myAssignedClass = {
              classId: matchParticipant.student.class.id,
              className: matchParticipant.student.class.className,
              status: 'DRAFT',
              totalStudents: act.participants.filter(p => p.student?.classId === matchParticipant.student.classId).length,
              evaluatedStudents: 0
            };
          }
        }
      }

      const isMyActivity = !teacherRecord || isManagement || !!myAssignedClass || (teacherRecord && act.teacherId === teacherRecord.id);

      return {
        id: act.id,
        code: act.code || '',
        name: act.name || act.catalog?.name || 'Hoạt động',
        catalogName: act.catalog?.name || '',
        academicYearId: act.academicYearId,
        academicYearName: act.academicYear?.name || '',
        campusId: extraData.campusId || act.teacher?.campusId || '',
        campusCode: extraData.campusCode || act.teacher?.campus?.campusCode || '',
        campusName: extraData.campusName || act.teacher?.campus?.campusName || '',
        educationLevel: extraData.educationLevel || act.levelId || '',
        grades: extraData.grades || [],
        date: act.date ? act.date.toISOString().split('T')[0] : '',
        timeRange: extraData.timeRange || '',
        location: extraData.locationText || (act.locationId && !act.locationId.startsWith('{') ? act.locationId : ''),
        teacherId: act.teacherId,
        teacherName: act.teacher?.teacherName || '',
        description: extraData.description || '',
        objectives: extraData.objectives || '',
        strand: extraData.strand || 'BAN_THAN',
        activityTypeId: extraData.activityTypeId || 'SU_KIEN',
        activityTypeName: extraData.activityTypeName || act.catalog?.type?.name || 'Sự kiện / Lễ hội',
        scale: extraData.scale || 'LOP',
        evalMode: extraData.evalMode || 'CRITERIA',
        criteria: extraData.criteria || [],
        formulaType: extraData.formulaType || 'EQUAL_WEIGHT',
        thresholds: extraData.thresholds || { outstanding: 85, good: 70, pass: 50 },
        mandatoryRules: extraData.mandatoryRules || [],
        deadline: extraData.deadline || '',
        status: extraData.status || act.status || 'DRAFT',
        assignedClasses: assignedClasses,
        myAssignedClass: myAssignedClass || null,
        canManage: isManagement,
        isTeacherOnly: !isManagement,
        participantsCount: participantCount,
        totalClassesCount: calculatedTotalClasses,
        completedClassesCount: completedClasses,
        inProgressClassesCount: inProgressClasses,
        isMyActivity,
        createdAt: act.createdAt.toISOString(),
        updatedAt: act.updatedAt.toISOString()
      };
    });

    // For GVCN (Teacher), strictly filter to ONLY activities assigned to their class
    let result = formatted;
    if (!isManagement) {
      result = result.filter(a => a.isMyActivity);
    }

    // Client/Filter in memory for advanced filters
    if (campusId && campusId !== 'ALL') {
      result = result.filter(a => a.campusId === campusId || a.campusCode === campusId || a.assignedClasses.some((c: any) => c.campusId === campusId || c.campusCode === campusId));
    }
    if (grade && grade !== 'ALL') {
      result = result.filter(a => a.grades.includes(grade) || a.assignedClasses.some((c: any) => c.grade === grade));
    }
    if (level && level !== 'ALL') {
      result = result.filter(a => a.educationLevel === level || a.assignedClasses.some((c: any) => c.level === level));
    }
    if (strand && strand !== 'ALL') {
      result = result.filter(a => a.strand === strand);
    }
    if (status && status !== 'ALL') {
      result = result.filter(a => a.status === status);
    }
    if (q) {
      const query = q.toLowerCase().trim();
      result = result.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.code.toLowerCase().includes(query) ||
        a.activityTypeName.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query)
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ giáo viên của bạn' }, { status: 403 });
    }

    const body = await req.json();
    const {
      code,
      name,
      academicYearId,
      campusId,
      campusCode,
      campusName,
      educationLevel,
      grades = [],
      date,
      timeRange,
      location,
      description,
      objectives,
      evidenceUrls = [],
      strand = 'BAN_THAN',
      activityTypeId = 'SU_KIEN',
      activityTypeName,
      scale = 'LOP',
      evalMode = 'CRITERIA',
      criteria = [],
      formulaType = 'EQUAL_WEIGHT',
      thresholds = { outstanding: 85, good: 70, pass: 50 },
      mandatoryRules = [],
      deadline,
      status = 'ASSIGNED',
      assignedClasses = []
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Tên hoạt động' }, { status: 400 });
    }

    // Resolve valid AcademicYear
    let validAcademicYearId = academicYearId;
    if (!validAcademicYearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.academicYear.findFirst();
      validAcademicYearId = activeYear?.id || '';
    }

    if (!validAcademicYearId) {
      return NextResponse.json({ error: 'Không tìm thấy Năm học hợp lệ' }, { status: 400 });
    }

    // Resolve or create catalog
    let catalog = await prisma.activityCatalog.findFirst({ where: { name } });
    if (!catalog) {
      const fallbackCat = await prisma.activityCategory.findFirst({ where: { status: 'ACTIVE' } });
      const fallbackId = fallbackCat?.id || 'default-id';
      const catCode = 'CAT-' + Date.now();
      catalog = await prisma.activityCatalog.create({
        data: {
          code: catCode,
          name: name.trim(),
          groupId: fallbackId,
          typeId: fallbackId,
          level: educationLevel || null,
          description: description || null
        }
      });
    }

    // Auto-generate code if empty
    let recordCode = code;
    if (!recordCode || !recordCode.trim()) {
      const prefix = strand.substring(0, 2);
      recordCode = `HDTN-${prefix}-${Date.now().toString().slice(-6)}`;
    }

    const existing = await prisma.activityRecord.findUnique({ where: { code: recordCode } });
    if (existing) {
      recordCode = `${recordCode}-${Date.now().toString().slice(-4)}`;
    }

    // Prepare full metadata payload to store in locationId JSON container
    const fullMetadata = {
      campusId,
      campusCode,
      campusName,
      educationLevel,
      grades,
      timeRange,
      locationText: location || '',
      description,
      objectives,
      evidenceUrls,
      strand,
      activityTypeId,
      activityTypeName: activityTypeName || 'Hoạt động trải nghiệm',
      scale,
      evalMode,
      criteria,
      formulaType,
      thresholds,
      mandatoryRules,
      deadline,
      status: status || 'ASSIGNED',
      assignedClasses: assignedClasses.map((cls: any) => ({
        ...cls,
        status: cls.status || 'DRAFT',
        evaluatedStudents: cls.evaluatedStudents || 0
      }))
    };

    const activityRecord = await prisma.activityRecord.create({
      data: {
        code: recordCode,
        name: name.trim(),
        catalogId: catalog.id,
        date: date ? new Date(date) : new Date(),
        semester: 1,
        academicYearId: validAcademicYearId,
        levelId: educationLevel || null,
        formatId: scale || null,
        organizerId: campusId || null,
        teacherId: teacher.id,
        locationId: JSON.stringify(fullMetadata),
        status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
      }
    });

    // Populate initial ActivityParticipant records for all students in assigned classes
    const classIds = assignedClasses.map((c: any) => c.classId).filter(Boolean);
    if (classIds.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          classId: { in: classIds },
          status: 'ACTIVE'
        },
        select: { id: true, classId: true }
      });

      if (students.length > 0) {
        const participantRows = students.map(s => ({
          recordId: activityRecord.id,
          studentId: s.id,
          roleId: 'TV', // Default Thành viên
          evalLevelId: evalMode === 'PARTICIPATION_ONLY' ? 'DAT' : null,
          note: JSON.stringify({
            attendance: 'PRESENT',
            roles: ['Thành viên'],
            criteriaScores: {},
            calculatedPercent: evalMode === 'PARTICIPATION_ONLY' ? 100 : 0,
            finalResult: evalMode === 'PARTICIPATION_ONLY' ? 'THAM_GIA' : 'CAN_HO_TRO',
            remarksQuick: [],
            remarksCustom: ''
          })
        }));

        await prisma.activityParticipant.createMany({
          data: participantRows
        });
      }
    }

    return NextResponse.json({
      success: true,
      activityId: activityRecord.id,
      code: recordCode
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
