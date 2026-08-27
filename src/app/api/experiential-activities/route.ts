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
    const subjectId = searchParams.get('subjectId');
    const scopeType = searchParams.get('scopeType'); // 'ALL' | 'ASSIGNED' | 'MY_CREATED'
    const q = searchParams.get('q');

    const userRole = (session?.user as any)?.role || '';
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN'].includes(userRole);

    let teacherRecord: any = null;
    let homeroomClassIds = new Set<string>();
    let teachingAssignmentsList: any[] = [];

    if (!isManagement || userRole === 'TEACHER') {
      teacherRecord = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (teacherRecord) {
        // 1. Find Homeroom (GVCN) classes
        const homeroomClasses = await prisma.class.findMany({
          where: {
            OR: [
              { homeroomTeacherId: teacherRecord.id },
              { homeroomTeacherId: { contains: teacherRecord.id } },
              { teachers: { some: { teacherId: teacherRecord.id, roleInClass: "GVCN" } } }
            ]
          },
          select: { id: true, className: true, campusId: true, grade: true, level: true }
        });
        homeroomClassIds = new Set(homeroomClasses.map(c => c.id));

        // 2. Find Subject Teaching (GVBM) assignments
        teachingAssignmentsList = await prisma.teachingAssignment.findMany({
          where: { teacherId: teacherRecord.id },
          include: {
            class: { select: { id: true, className: true, campusId: true, grade: true, level: true } },
            subject: { select: { id: true, subjectName: true, subjectCode: true } }
          }
        });
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

      // Check if this activity is created by this teacher
      const isMyCreated = !!(teacherRecord && (act.teacherId === teacherRecord.id || act.teacher?.userId === session.user.id));

      // Check GVCN assignment match
      let myAssignedClass: any = null;
      let matchedRoleLabel = '';

      if (teacherRecord) {
        // 1. Direct GVCN match
        const gvcnClass = assignedClasses.find((c: any) => c.classId && homeroomClassIds.has(c.classId));
        if (gvcnClass) {
          myAssignedClass = gvcnClass;
          matchedRoleLabel = 'GVCN (Chủ nhiệm)';
        }

        // 2. GVBM match (if activity is linked to a subject or assigned to classes teacher teaches)
        if (!myAssignedClass && extraData.subjectId) {
          const matchedTeaching = teachingAssignmentsList.find(ta => 
            ta.subjectId === extraData.subjectId && 
            assignedClasses.some((c: any) => c.classId === ta.classId)
          );

          if (matchedTeaching) {
            const cls = assignedClasses.find((c: any) => c.classId === matchedTeaching.classId) || {
              classId: matchedTeaching.classId,
              className: matchedTeaching.class?.className,
              status: 'DRAFT'
            };
            myAssignedClass = cls;
            matchedRoleLabel = `GVBM ${matchedTeaching.subject?.subjectName || ''}`;
          }
        }

        // 3. Fallback check: if no subject linked, but teacher teaches one of the assigned classes
        if (!myAssignedClass && !extraData.subjectId) {
          const generalTeaching = teachingAssignmentsList.find(ta => 
            assignedClasses.some((c: any) => c.classId === ta.classId)
          );
          if (generalTeaching) {
            const cls = assignedClasses.find((c: any) => c.classId === generalTeaching.classId);
            if (cls) {
              myAssignedClass = cls;
              matchedRoleLabel = `GVBM ${generalTeaching.subject?.subjectName || ''}`;
            }
          }
        }

        // 4. Participant fallback
        if (!myAssignedClass && homeroomClassIds.size > 0) {
          const matchParticipant = act.participants.find(p => p.student?.classId && homeroomClassIds.has(p.student.classId));
          if (matchParticipant?.student?.class) {
            myAssignedClass = {
              classId: matchParticipant.student.class.id,
              className: matchParticipant.student.class.className,
              status: 'DRAFT',
              totalStudents: act.participants.filter(p => p.student?.classId === matchParticipant.student.classId).length,
              evaluatedStudents: 0
            };
            matchedRoleLabel = 'GVCN';
          }
        }
      }

      const isAssignedToMe = !!myAssignedClass && !isMyCreated;
      const isVisibleToTeacher = isManagement || isMyCreated || !!myAssignedClass;
      const canManage = isManagement || isMyCreated;

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
        subjectId: extraData.subjectId || null,
        subjectName: extraData.subjectName || null,
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
        matchedRoleLabel: matchedRoleLabel || (isMyCreated ? 'Người tạo' : ''),
        isMyCreated,
        isAssignedToMe,
        canManage,
        isTeacherOnly: !isManagement,
        participantsCount: participantCount,
        totalClassesCount: calculatedTotalClasses,
        completedClassesCount: completedClasses,
        inProgressClassesCount: inProgressClasses,
        isVisibleToTeacher,
        createdAt: act.createdAt.toISOString(),
        updatedAt: act.updatedAt.toISOString()
      };
    });

    // For regular teachers, strictly filter to ONLY visible activities (created by them OR assigned to their classes)
    let result = formatted;
    if (!isManagement) {
      result = result.filter(a => a.isVisibleToTeacher);
    }

    // Filter by Scope Type: ALL | ASSIGNED | MY_CREATED
    if (scopeType === 'ASSIGNED') {
      result = result.filter(a => a.isAssignedToMe);
    } else if (scopeType === 'MY_CREATED') {
      result = result.filter(a => a.isMyCreated);
    }

    // Filter by Subject
    if (subjectId && subjectId !== 'ALL') {
      result = result.filter(a => a.subjectId === subjectId);
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
        (a.subjectName && a.subjectName.toLowerCase().includes(query)) ||
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
      subjectId = null,
      subjectName = null,
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
      campusId: campusId || teacher.campusId || '',
      campusCode: campusCode || '',
      campusName: campusName || '',
      educationLevel,
      grades,
      subjectId,
      subjectName,
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
        organizerId: campusId || teacher.campusId || null,
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
