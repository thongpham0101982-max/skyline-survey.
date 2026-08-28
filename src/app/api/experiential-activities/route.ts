import { sendExperientialActivityNotification } from "@/lib/experiential/email-notification";
﻿import { NextResponse } from 'next/server';
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
    const roleScope = searchParams.get('roleScope'); // 'ALL' | 'GVBM' | 'GVCN' | 'MY_CREATED'
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

      // DUAL MATCHING FOR GVBM & GVCN
      let isGVBM = false;
      let isGVCN = false;
      let gvbmSubjectName = '';
      let myAssignedClass: any = null;

      if (teacherRecord) {
        // Check GVCN match: Teacher is homeroom teacher of any assigned class
        const matchedGvcnClass = assignedClasses.find((c: any) => c.classId && homeroomClassIds.has(c.classId));
        if (matchedGvcnClass) {
          isGVCN = true;
          myAssignedClass = matchedGvcnClass;
        }

        // Check GVBM match: ONLY when extraData.subjectId is specifically selected
        if (extraData.subjectId) {
          const matchedTeaching = teachingAssignmentsList.find(ta => 
            ta.subjectId === extraData.subjectId && 
            assignedClasses.some((c: any) => c.classId === ta.classId)
          );
          if (matchedTeaching) {
            isGVBM = true;
            gvbmSubjectName = matchedTeaching.subject?.subjectName || extraData.subjectName || '';
            const matchedClassObj = assignedClasses.find((c: any) => c.classId === matchedTeaching.classId);
            if (matchedClassObj) {
              myAssignedClass = matchedClassObj;
            }
          }
        }

        // Fallback for participant-based match
        if (!myAssignedClass && homeroomClassIds.size > 0) {
          const matchParticipant = act.participants.find(p => p.student?.classId && homeroomClassIds.has(p.student.classId));
          if (matchParticipant?.student?.class) {
            isGVCN = true;
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

      // Determine Assigned Role & Badges
      let assignedRole = 'VIEWER';
      let roleBadgeLabel = '';
      let roleBadgeTheme = 'slate';

      if (isMyCreated) {
        assignedRole = 'CREATOR';
        roleBadgeLabel = '✨ Tôi tự tạo';
        roleBadgeTheme = 'teal';
      } else if (isGVBM && isGVCN) {
        assignedRole = 'GVCN_GVBM';
        roleBadgeLabel = `🌟 GVCN & GVBM Môn ${gvbmSubjectName || extraData.subjectName || ''}`;
        roleBadgeTheme = 'purple';
      } else if (isGVBM) {
        assignedRole = 'GVBM';
        roleBadgeLabel = `🎯 Dành cho GVBM Môn ${gvbmSubjectName || extraData.subjectName || ''}`;
        roleBadgeTheme = 'amber';
      } else if (isGVCN) {
        assignedRole = 'GVCN';
        roleBadgeLabel = extraData.subjectId 
          ? `👥 Dành cho GVCN (Phối hợp theo dõi)`
          : `👥 Dành cho GVCN (Chủ nhiệm)`;
        roleBadgeTheme = 'indigo';
      } else if (isManagement) {
        assignedRole = 'ADMIN';
        roleBadgeLabel = 'Quản trị viên';
        roleBadgeTheme = 'blue';
      }

      const isAssignedToMe = (isGVBM || isGVCN) && !isMyCreated;
      const isVisibleToTeacher = isManagement || isMyCreated || isAssignedToMe;
      const canManage = isManagement || isMyCreated;

        // Accurately extract campus codes & grades from assignedClasses
        const assignedCampusCodes = Array.from(new Set(
          assignedClasses.map((c: any) => {
            if (c.campusCode) return c.campusCode;
            if (c.className && c.className.includes('_')) return c.className.split('_').pop();
            return null;
          }).filter(Boolean)
        ));
        const assignedGrades = Array.from(new Set(
          assignedClasses.map((c: any) => c.grade).filter(Boolean)
        ));

        const computedCampusCode = assignedCampusCodes.length > 0 
          ? assignedCampusCodes.join(', ') 
          : (extraData.campusCode || act.teacher?.campus?.campusCode || 'Toàn trường');

        const computedCampusName = assignedCampusCodes.length > 0 
          ? (assignedCampusCodes.length === 1 ? `Sky-Line ${assignedCampusCodes[0]}` : assignedCampusCodes.map(code => `CS ${code}`).join(', '))
          : (extraData.campusName || act.teacher?.campus?.campusName || 'Toàn trường');

        const computedGrades = assignedGrades.length > 0 ? assignedGrades : (extraData.grades || []);

        return {
          id: act.id,
          code: act.code || '',
          name: act.name || act.catalog?.name || 'Hoạt động',
          catalogName: act.catalog?.name || '',
          academicYearId: act.academicYearId,
          academicYearName: act.academicYear?.name || '',
          campusId: extraData.campusId || act.teacher?.campusId || '',
          campusCode: computedCampusCode,
          campusName: computedCampusName,
          educationLevel: extraData.educationLevel || act.levelId || '',
          grades: computedGrades,
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
        isGVBM,
        isGVCN,
        assignedRole,
        roleBadgeLabel,
        roleBadgeTheme,
        matchedRoleLabel: roleBadgeLabel,
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

    // For regular teachers, strictly filter to ONLY visible activities
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

    // Filter by Role Scope: ALL | GVBM | GVCN | MY_CREATED
    if (roleScope === 'GVBM') {
      result = result.filter(a => a.isGVBM);
    } else if (roleScope === 'GVCN') {
      result = result.filter(a => a.isGVCN);
    } else if (roleScope === 'MY_CREATED') {
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

    let teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacher && session.user.email) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: session.user.email },
            { teacherCode: session.user.email },
            { teacherName: session.user.name || undefined }
          ]
        }
      });
      if (teacher && !teacher.userId) {
        await prisma.teacher.update({
          where: { id: teacher.id },
          data: { userId: session.user.id }
        });
      }
    }

    if (!teacher) {
      // Auto-create teacher profile for user with required relations (user, campus)
      let defaultCampus = await prisma.campus.findFirst();
      if (!defaultCampus) {
        defaultCampus = await prisma.campus.create({
          data: { id: 'cs1', campusCode: 'CS1', campusName: 'Sky-Line Riverside (CS1)' }
        });
      }

      teacher = await prisma.teacher.create({
        data: {
          teacherCode: `GV_${session.user.id.slice(-6)}`,
          teacherName: session.user.name || session.user.email || 'Giáo viên',
          email: session.user.email || '',
          user: { connect: { id: session.user.id } },
          campus: { connect: { id: defaultCampus.id } }
        }
      });
    }

    const body = await req.json();
    const {
      code,
      name,
      academicYearId,
      campusId,
      campusCode,
      campusName,
      selectedCampusIds = [],
      educationLevel = 'PHO_THONG',
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

    // Accurately resolve actual campuses and grades from assigned classes
    const actualCampusCodes = Array.from(new Set(
      assignedClasses.map((c: any) => {
        if (c.campusCode) return c.campusCode;
        if (c.className && c.className.includes('_')) return c.className.split('_').pop();
        return null;
      }).filter(Boolean)
    ));
    const actualGrades = Array.from(new Set(
      assignedClasses.map((c: any) => c.grade).filter(Boolean)
    ));

    const resolvedCampusCode = actualCampusCodes.length > 0 ? actualCampusCodes.join(', ') : (campusCode || '');
    const resolvedCampusName = actualCampusCodes.length > 0 ? actualCampusCodes.map((code: any) => `Sky-Line ${code}`).join(', ') : (campusName || '');
    const resolvedGrades = actualGrades.length > 0 ? actualGrades : grades;

    // Prepare full metadata payload to store in locationId JSON container
    const fullMetadata = {
      campusId: campusId || teacher.campusId || '',
      campusCode: resolvedCampusCode,
      campusName: resolvedCampusName,
      selectedCampusIds: selectedCampusIds.length > 0 ? selectedCampusIds : (actualCampusCodes.length > 0 ? actualCampusCodes : []),
      educationLevel,
      grades: resolvedGrades,
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
          roleId: 'TV',
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

    // Send email notification to GVCN & GVBM if activity is assigned
    if (status !== 'DRAFT' && assignedClasses.length > 0) {
      sendExperientialActivityNotification({
        activityId: activityRecord.id,
        activityCode: recordCode,
        activityName: name.trim(),
        strand,
        activityTypeName,
        subjectId,
        subjectName,
        date,
        timeRange,
        location,
        deadline,
        assignedClasses
      }).catch(e => console.error('[HĐTN Email Trigger Error]:', e));
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
