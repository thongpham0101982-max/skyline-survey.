import { sendExperientialActivityNotification } from "@/lib/experiential/email-notification";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from "@/lib/permissions";

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
    const forTeacher = searchParams.get('forTeacher') === 'true' || searchParams.get('myClassesOnly') === 'true';
    const targetClassId = searchParams.get('classId');
    const q = searchParams.get('q');

    const userRole = (session?.user as any)?.role || '';
    const upperRole = (userRole || '').toUpperCase().trim();
    const hasExpManageRead = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canRead");
    const hasExpManageUpdate = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canUpdate");
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS'].includes(upperRole) || hasExpManageRead;

    let teacherRecord: any = null;
    let homeroomClassIds = new Set<string>();
    let homeroomClassNames = new Set<string>();
    let teachingClassIds = new Set<string>();
    let allMyClassIds = new Set<string>();
    let allMyClassNames = new Set<string>();
    let homeroomClassesList: any[] = [];
    let teachingAssignmentsList: any[] = [];

    if (forTeacher || !isManagement || userRole === 'TEACHER' || upperRole.includes('TEACHER')) {
      teacherRecord = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherRecord && session.user.email) {
        teacherRecord = await prisma.teacher.findFirst({
          where: {
            OR: [
              { email: session.user.email },
              { teacherCode: session.user.email.split('@')[0] },
              { teacherName: session.user.name || undefined }
            ]
          }
        });
      }

      if (teacherRecord) {
        // 1. Find Homeroom (GVCN) classes
        const homeroomClasses = await prisma.class.findMany({
          where: {
            OR: [
              { homeroomTeacherId: teacherRecord.id },
              { homeroomTeacherId: { contains: teacherRecord.id } },
              { homeroomTeacherId: teacherRecord.teacherCode },
              { homeroomTeacherId: { contains: teacherRecord.teacherCode } },
              { teachers: { some: { teacherId: teacherRecord.id, roleInClass: "GVCN" } } }
            ]
          },
          select: { id: true, className: true, campusId: true, grade: true, level: true }
        });
        homeroomClassesList = homeroomClasses;
        homeroomClassIds = new Set(homeroomClasses.map(c => c.id));
        homeroomClassNames = new Set(homeroomClasses.map(c => c.className).filter(Boolean));

        // 2. Find Subject Teaching (GVBM) assignments
        teachingAssignmentsList = await prisma.teachingAssignment.findMany({
          where: { teacherId: teacherRecord.id },
          include: {
            class: { select: { id: true, className: true, campusId: true, grade: true, level: true } },
            subject: { select: { id: true, subjectName: true, subjectCode: true } }
          }
        });

        teachingAssignmentsList.forEach(ta => {
          if (ta.class?.id) teachingClassIds.add(ta.class.id);
          if (ta.class?.className) allMyClassNames.add(ta.class.className);
        });

        allMyClassIds = new Set([...homeroomClassIds, ...teachingClassIds]);
        homeroomClassNames.forEach(name => allMyClassNames.add(name));
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
            campus: true,
            user: true
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

      // DUAL MATCHING FOR GVBM & GVCN & TCM
      const hasTcmOrSubject = !!(extraData.departmentId || extraData.departmentName || extraData.subjectId || extraData.subjectName || act.subjectName || act.subjectId);
      const tcmOrSubjectLabel = extraData.departmentName || extraData.subjectName || act.subjectName || '';

      let isGVBM = false;
      let isGVCN = false;
      let gvbmSubjectName = tcmOrSubjectLabel;
      let myAssignedClass: any = null;

      if (teacherRecord) {
        // 1. Check GVCN match: Teacher is homeroom teacher of any assigned class
        const matchedGvcnClass = assignedClasses.find((c: any) => 
          (c.classId && homeroomClassIds.has(c.classId)) ||
          (c.homeroomTeacherId && c.homeroomTeacherId === teacherRecord.id) ||
          (c.homeroomTeacherEmail && teacherRecord.email && c.homeroomTeacherEmail.toLowerCase() === teacherRecord.email.toLowerCase())
        );
        if (matchedGvcnClass) {
          isGVCN = true;
          myAssignedClass = matchedGvcnClass;
        }

        // 2. Check GVBM match:
        // a) Explicitly assigned in assignedClasses list
        const explicitGvbmMatch = assignedClasses.find((c: any) => 
          (c.subjectTeacherId && c.subjectTeacherId === teacherRecord.id) ||
          (c.subjectTeacherName && teacherRecord.teacherName && c.subjectTeacherName === teacherRecord.teacherName) ||
          (c.subjectTeacherEmail && teacherRecord.email && c.subjectTeacherEmail.toLowerCase() === teacherRecord.email.toLowerCase())
        );
        if (explicitGvbmMatch) {
          isGVBM = true;
          if (!myAssignedClass) myAssignedClass = explicitGvbmMatch;
        }

        // b) Teacher belongs to the TCM department
        if (hasTcmOrSubject && extraData.departmentId && (teacherRecord.departmentId === extraData.departmentId || teacherRecord.departmentRel?.id === extraData.departmentId)) {
          isGVBM = true;
        }

        // c) Check teaching assignments matching TCM / Subject
        if (hasTcmOrSubject) {
          const matchedTeaching = teachingAssignmentsList.find(ta => {
            const matchSub = (extraData.subjectId && ta.subjectId === extraData.subjectId) ||
                             (extraData.departmentId && (ta.teacher?.departmentId === extraData.departmentId || ta.subjectId === extraData.departmentId));
            const matchClass = assignedClasses.some((c: any) => c.classId === ta.classId);
            return matchSub && matchClass;
          });
          if (matchedTeaching) {
            isGVBM = true;
            gvbmSubjectName = matchedTeaching.subject?.subjectName || tcmOrSubjectLabel;
            const matchedClassObj = assignedClasses.find((c: any) => c.classId === matchedTeaching.classId);
            if (matchedClassObj && !myAssignedClass) {
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
        roleBadgeLabel = ['CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS'].includes(upperRole) ? 'Ban Công tác HS' : 'Quản trị viên';
        roleBadgeTheme = 'blue';
      }

      const isAssignedToMe = (isGVBM || isGVCN) && !isMyCreated;
      const isVisibleToTeacher = forTeacher 
        ? (isMyCreated || isAssignedToMe || isGVBM || isGVCN)
        : (isManagement || isMyCreated || isAssignedToMe || isGVBM || isGVCN);
      const canManage = isManagement || isMyCreated || hasExpManageUpdate;

      // Calculate class-specific progress for this teacher's class
      let myClassProgress: any = null;
      if (myAssignedClass) {
        const classTargetId = myAssignedClass.classId;
        const targetStudents = act.participants.filter(p => p.student?.classId === classTargetId || (classTargetId && p.student?.class?.id === classTargetId));
        const evaluatedStudentsCount = targetStudents.filter(p => {
          if (p.evalLevelId) return true;
          try {
            if (p.note) {
              const parsed = JSON.parse(p.note);
              return parsed.isCompleted || (parsed.finalResult && parsed.finalResult !== 'CAN_HO_TRO') || (parsed.calculatedPercent !== null && parsed.calculatedPercent > 0);
            }
          } catch {}
          return false;
        }).length;

        const totalStudentsCount = targetStudents.length || myAssignedClass.totalStudents || 0;
        const progressPct = totalStudentsCount > 0 ? Math.round((evaluatedStudentsCount / totalStudentsCount) * 100) : (myAssignedClass.status === 'COMPLETED' ? 100 : 0);
        const classStatus = progressPct === 100 ? 'COMPLETED' : (evaluatedStudentsCount > 0 ? 'IN_PROGRESS' : (myAssignedClass.status || 'DRAFT'));

        myClassProgress = {
          classId: myAssignedClass.classId,
          className: myAssignedClass.className,
          status: classStatus,
          evaluatedStudents: evaluatedStudentsCount,
          totalStudents: totalStudentsCount,
          percent: progressPct
        };
      }

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

        let catMeta: any = {};
        try {
          if (act.catalog?.description && act.catalog.description.startsWith('{')) {
            catMeta = JSON.parse(act.catalog.description);
          }
        } catch {}

        const educationalContent = extraData.educationalContent || extraData.description || catMeta.educationalContent || catMeta.notes || '';
        const learningOutcomes = extraData.learningOutcomes || extraData.objectives || catMeta.learningOutcomes || '';
        const organizationFormat = extraData.organizationFormat || catMeta.organizationFormat || 'Trải nghiệm';
        const deliverables = extraData.deliverables || catMeta.deliverables || '';
        const evaluationConfig = extraData.evaluationConfig || catMeta.evaluationConfig || null;
        const criteria = (extraData.criteria && extraData.criteria.length > 0) ? extraData.criteria : (evaluationConfig?.criteria || catMeta.criteria || []);
        const evalMode = extraData.evalMode || evaluationConfig?.mode || catMeta.evalMode || 'CRITERIA';

        const hasContent = !!(educationalContent && educationalContent.trim());
        const hasOutcomes = !!(learningOutcomes && learningOutcomes.trim());
        const hasFormat = !!(organizationFormat && organizationFormat.trim());
        const hasDeliverables = !!(deliverables && deliverables.trim());
        const hasEval = !!(evaluationConfig?.mode || extraData.evalMode || criteria.length > 0);

        const missingProfessionalFields: string[] = [];
        if (!hasOutcomes) missingProfessionalFields.push('Yêu cầu cần đạt');
        if (!hasFormat) missingProfessionalFields.push('Hình thức tổ chức');
        if (!hasDeliverables) missingProfessionalFields.push('Sản phẩm dự án');
        if (!hasEval) missingProfessionalFields.push('Tiêu chí đánh giá');
        if (!hasContent) missingProfessionalFields.push('Nội dung giáo dục');

        const isProfessionalConfigured = missingProfessionalFields.length === 0;

        const subjectTeacherId = extraData.subjectTeacherId || extraData.tlhnTeacherId || extraData.leadTeacherId || catMeta.subjectTeacherId || catMeta.cthsTeacherId || null;
        const subjectTeacherEmail = extraData.subjectTeacherEmail || catMeta.subjectTeacherEmail || catMeta.cthsTeacherEmail || null;
        const subjectTeacherName = extraData.subjectTeacherName || extraData.tlhnTeacherName || extraData.leadTeacherName || catMeta.subjectTeacherName || catMeta.cthsTeacherName || null;

        const isAssignedSubjectTeacher = !!(
          (teacherRecord && subjectTeacherId && teacherRecord.id === subjectTeacherId) ||
          (session?.user?.email && subjectTeacherEmail && session.user.email.toLowerCase() === subjectTeacherEmail.toLowerCase()) ||
          (teacherRecord && teacherRecord.teacherName && subjectTeacherName && teacherRecord.teacherName === subjectTeacherName) ||
          (teacherRecord?.departmentId && extraData.departmentId && teacherRecord.departmentId === extraData.departmentId)
        );

        const canConfigureProfessional = isManagement || isMyCreated || isGVBM || isAssignedSubjectTeacher || canManage;

        return {
          id: act.id,
          code: act.code || '',
          name: act.name || act.catalog?.name || 'Hoạt động',
          catalogName: act.catalog?.name || '',
          themeName: extraData.themeName || act.catalog?.theme?.name || catMeta.themeName || '',
          semester: extraData.semester || act.semester || catMeta.semester || (extraData.timeRange && (extraData.timeRange.includes('HK2') || extraData.timeRange.includes('Học kỳ 2')) ? 2 : 1),
          academicYearId: act.academicYearId,
          academicYearName: act.academicYear?.name || '',
          campusId: extraData.campusId || act.teacher?.campusId || '',
          campusCode: computedCampusCode,
          campusName: computedCampusName,
          educationLevel: extraData.educationLevel || act.levelId || '',
          grades: computedGrades,
          departmentId: extraData.departmentId || null,
          departmentName: extraData.departmentName || null,
          subjectTeacherId,
          subjectTeacherName,
          leadTeacherName: extraData.leadTeacherName || subjectTeacherName || null,
          subjectTeacherEmail,
          subjectId: extraData.subjectId || null,
          subjectName: extraData.subjectName || null,
          primarySubjectName: extraData.primarySubjectName || extraData.subjectName || catMeta.primarySubjectName || null,
          coopSubjectNames: extraData.integratedSubjects || extraData.coopSubjectNames || catMeta.integratedSubjects || catMeta.coopSubjectNames || null,
          integratedSubjects: extraData.integratedSubjects || extraData.coopSubjectNames || catMeta.integratedSubjects || catMeta.coopSubjectNames || null,
          tcmOrSubjectLabel: extraData.departmentName || extraData.subjectName || act.subjectName || '',
          date: act.date ? act.date.toISOString().split('T')[0] : '',
          timeRange: extraData.timeRange || '',
          location: extraData.locationText || extraData.location || (act.locationId && !act.locationId.startsWith('{') ? act.locationId : ''),
          teacherId: act.teacherId,
          teacherName: act.teacher?.teacherName || act.teacher?.user?.fullName || act.teacher?.user?.name || extraData.creatorName || '',
          creatorName: extraData.creatorName || act.teacher?.teacherName || act.teacher?.user?.fullName || act.teacher?.user?.name || (act.teacher?.email ? act.teacher.email.split('@')[0] : 'Ban Quản trị'),
          creatorEmail: extraData.creatorEmail || act.teacher?.email || act.teacher?.user?.email || '',
          creatorRole: extraData.creatorRole || act.teacher?.user?.role || '',
          description: educationalContent,
          objectives: learningOutcomes,
          educationalContent,
          learningOutcomes,
          organizationFormat,
          deliverables,
          evaluationConfig,
          isProfessionalConfigured,
          missingProfessionalFields,
          canConfigureProfessional,
          strand: extraData.strand || 'BAN_THAN',
          activityTypeId: extraData.activityTypeId || 'SU_KIEN',
          activityTypeName: extraData.activityTypeName || act.catalog?.type?.name || 'Sự kiện / Lễ hội',
          scale: extraData.scale || 'LOP',
          evalMode,
          criteria,
          formulaType: extraData.formulaType || 'EQUAL_WEIGHT',
          thresholds: extraData.thresholds || { outstanding: 85, good: 70, pass: 50 },
          mandatoryRules: extraData.mandatoryRules || [],
          deadline: extraData.deadline || '',
          status: (() => {
            const rawStatus = extraData.status || act.status || 'DRAFT';
            if (rawStatus === 'COMPLETED' || rawStatus === 'LOCKED') return rawStatus;
            if (completedClasses > 0 && calculatedTotalClasses > 0 && completedClasses === calculatedTotalClasses) return 'COMPLETED';
            if (inProgressClasses > 0 || completedClasses > 0) return 'IN_PROGRESS';
            // Các lớp nào đã triển khai: Đã gán lớp thì trạng thái là Đã triển khai (ASSIGNED)
            if (calculatedTotalClasses > 0 || totalClasses > 0 || assignedClasses.length > 0) return 'ASSIGNED';
            return rawStatus;
          })(),
          assignedClasses: assignedClasses,
          myAssignedClass: myAssignedClass || null,
          myClassProgress: myClassProgress || null,
          canInputResult: true,
          isGVBM,
          isGVCN,
          hasTcmOrSubject,
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

    // =========================================================================
    // NẠP THÊM CÁC HOẠT ĐỘNG TỪ DANH MỤC (ACTIVITY CATALOG) NẾU CHƯA TRIỂN KHAI
    // =========================================================================
    try {
      const catalogs = await prisma.activityCatalog.findMany({
        where: {
          status: { not: 'DELETED' }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const cat of catalogs) {
        // Tránh trùng lặp nếu đã có ActivityRecord tương ứng
        const hasRecord = activities.some(a => a.catalogId === cat.id || (a.code && a.code === cat.code));
        if (hasRecord) continue;

        let catMeta: any = {};
        try {
          if (cat.description && cat.description.startsWith('{')) {
            catMeta = JSON.parse(cat.description);
          }
        } catch {}

        if (academicYearId && catMeta.academicYearId && catMeta.academicYearId !== academicYearId) {
          continue;
        }

        const catAssignedClasses = (catMeta.allocatedCampuses || []).flatMap((c: any) => c.assignedClasses || []);
        const matchedCatClass = catAssignedClasses.find((c: any) => {
          if (targetClassId) return c.classId === targetClassId;
          return (c.classId && allMyClassIds.has(c.classId)) ||
                 (c.className && allMyClassNames.has(c.className)) ||
                 (c.homeroomTeacherId && teacherRecord && c.homeroomTeacherId === teacherRecord.id);
        });
        const catMatchesTeacherClass = !!matchedCatClass;
        const catIsMyCreated = !!(teacherRecord && (catMeta.creatorId === teacherRecord.id || catMeta.creatorUserId === session.user.id));

        if (forTeacher && !catMatchesTeacherClass && !catIsMyCreated) {
          continue;
        }

        const evalCfg = catMeta.evaluationConfig || {};
        const isEventCat = catMeta.activityCategory === 'HOAT_DONG_SU_KIEN';
        const catGrades = Array.isArray(catMeta.grades) ? catMeta.grades : [];

        const educationalContent = catMeta.educationalContent || catMeta.notes || '';
        const learningOutcomes = catMeta.learningOutcomes || '';
        const organizationFormat = catMeta.organizationFormat || 'Trải nghiệm';
        const deliverables = catMeta.deliverables || '';
        const evaluationConfig = catMeta.evaluationConfig || null;
        const criteria = evalCfg.criteria || [];

        const hasContent = !!(educationalContent && educationalContent.trim());
        const hasOutcomes = !!(learningOutcomes && learningOutcomes.trim());
        const hasFormat = !!(organizationFormat && organizationFormat.trim());
        const hasDeliverables = !!(deliverables && deliverables.trim());
        const hasEval = !!(evalCfg.mode || criteria.length > 0);

        const missingProfessionalFields: string[] = [];
        if (!hasOutcomes) missingProfessionalFields.push('Yêu cầu cần đạt');
        if (!hasFormat) missingProfessionalFields.push('Hình thức tổ chức');
        if (!hasDeliverables) missingProfessionalFields.push('Sản phẩm dự án');
        if (!hasEval) missingProfessionalFields.push('Tiêu chí đánh giá');
        if (!hasContent) missingProfessionalFields.push('Nội dung giáo dục');

        const isProfessionalConfigured = missingProfessionalFields.length === 0;

        const subjectTeacherId = catMeta.subjectTeacherId || catMeta.cthsTeacherId || null;
        const subjectTeacherEmail = catMeta.subjectTeacherEmail || catMeta.cthsTeacherEmail || null;
        const subjectTeacherName = catMeta.subjectTeacherName || catMeta.cthsTeacherName || null;

        const isAssignedSubjectTeacher = !!(
          (teacherRecord && subjectTeacherId && teacherRecord.id === subjectTeacherId) ||
          (session?.user?.email && subjectTeacherEmail && session.user.email.toLowerCase() === subjectTeacherEmail.toLowerCase()) ||
          (teacherRecord && teacherRecord.teacherName && subjectTeacherName && teacherRecord.teacherName === subjectTeacherName)
        );

        const canConfigureProfessional = isManagement || isAssignedSubjectTeacher || isGVBM;

        formatted.push({
          id: cat.id,
          code: cat.code || '',
          name: cat.name,
          catalogName: cat.name,
          academicYearId: catMeta.academicYearId || academicYearId || '',
          academicYearName: '',
          campusId: '',
          campusCode: 'Toàn trường',
          campusName: 'Toàn trường',
          educationLevel: catMeta.educationLevels?.[0] || catMeta.educationLevel || cat.level || '',
          grades: catGrades,
          departmentId: catMeta.departmentId || null,
          departmentName: catMeta.departmentName || null,
          subjectTeacherId,
          subjectTeacherName,
          subjectTeacherEmail,
          subjectId: null,
          subjectName: catMeta.primarySubjectName || null,
          primarySubjectName: catMeta.primarySubjectName || null,
          coopSubjectNames: catMeta.integratedSubjects || catMeta.coopSubjectNames || null,
          tcmOrSubjectLabel: catMeta.departmentName || catMeta.primarySubjectName || catMeta.integratedSubjects || 'Toàn trường',
          themeName: catMeta.themeName || null,
          programType: catMeta.programType || null,
          semester: catMeta.semester || 1,
          date: '',
          timeRange: catMeta.timeFrame || '',
          location: catMeta.expectedLocation || 'Theo kế hoạch',
          teacherId: subjectTeacherId || '',
          teacherName: subjectTeacherName || 'BP HĐNGLL - Tổ CTHS',
          creatorName: subjectTeacherName || 'BP HĐNGLL - Tổ CTHS',
          creatorEmail: subjectTeacherEmail || '',
          creatorRole: 'CTHS',
          description: educationalContent,
          objectives: learningOutcomes,
          educationalContent,
          learningOutcomes,
          organizationFormat,
          deliverables,
          evaluationConfig,
          isProfessionalConfigured,
          missingProfessionalFields,
          canConfigureProfessional,
          strand: catMeta.strand || 'BAN_THAN',
          activityTypeId: isEventCat ? 'SU_KIEN' : 'DU_AN',
          activityTypeName: isEventCat ? 'Hoạt động sự kiện' : (catMeta.activityCategoryName || 'Trải nghiệm / Dự án'),
          scale: 'TOAN_TRUONG',
          evalMode: evalCfg.mode || (isEventCat ? 'ROLE_BASED' : 'CRITERIA'),
          criteria,
          formulaType: evalCfg.formulaType === 'AVERAGE' ? 'EQUAL_WEIGHT' : 'WEIGHTED',
          thresholds: { outstanding: 85, good: 70, pass: 50 },
          mandatoryRules: [],
          deadline: '',
          status: cat.status || 'ASSIGNED',
          allocatedCampuses: catMeta.allocatedCampuses || [],
          assignedClasses: catAssignedClasses,
          myAssignedClass: matchedCatClass || null,
          myClassProgress: matchedCatClass ? {
            classId: matchedCatClass.classId,
            className: matchedCatClass.className,
            status: 'DRAFT',
            evaluatedStudents: 0,
            totalStudents: matchedCatClass.totalStudents || 0,
            percent: 0
          } : null,
          canInputResult: true,
          isGVBM: forTeacher ? catMatchesTeacherClass : true,
          isGVCN: forTeacher ? catMatchesTeacherClass : true,
          hasTcmOrSubject: true,
          assignedRole: isManagement ? 'ADMIN' : 'GVCN',
          roleBadgeLabel: isEventCat ? '🎪 Sự kiện ngoại khóa' : '🌟 Kế hoạch HĐTN',
          roleBadgeTheme: isEventCat ? 'purple' : 'teal',
          matchedRoleLabel: isEventCat ? '🎪 Sự kiện ngoại khóa' : '🌟 Kế hoạch HĐTN',
          isMyCreated: catIsMyCreated,
          isAssignedToMe: catMatchesTeacherClass,
          canManage: isManagement || catIsMyCreated,
          isTeacherOnly: !isManagement,
          participantsCount: 0,
          totalClassesCount: (catMeta.allocatedCampuses || []).reduce((acc: number, c: any) => acc + (c.assignedClassesCount || (c.assignedClasses?.length || 0)), 0) || catGrades.length,
          completedClassesCount: 0,
          inProgressClassesCount: (catMeta.allocatedCampuses || []).filter((c: any) => c.status === 'DA_TRIEN_KHAI').length,
          isVisibleToTeacher: forTeacher ? (catMatchesTeacherClass || catIsMyCreated) : true,
          isFromCatalog: true,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString()
        });
      }
    } catch (catErr) {
      console.error('Error fetching activity catalogs in list API:', catErr);
    }

    // For regular teachers or forTeacher=true, strictly filter to ONLY visible activities
    let result = formatted;
    if (forTeacher) {
      result = result.filter(a => a.isVisibleToTeacher);
    } else if (!isManagement) {
      result = result.filter(a => a.isVisibleToTeacher);
    }

    if (targetClassId && targetClassId !== 'ALL') {
      result = result.filter(a => 
        (a.assignedClasses && a.assignedClasses.some((c: any) => c.classId === targetClassId || (c.className && homeroomClassesList.find(hc => hc.id === targetClassId)?.className === c.className))) ||
        (a.myAssignedClass && a.myAssignedClass.classId === targetClassId) ||
        (a.myClassProgress && a.myClassProgress.classId === targetClassId)
      );
    }

    // Filter by Scope Type: ALL | ASSIGNED | MY_CREATED
    if (scopeType === 'ASSIGNED') {
      result = result.filter(a => a.isAssignedToMe);
    } else if (scopeType === 'MY_CREATED') {
      result = result.filter(a => a.isMyCreated);
    }

    // Filter by Role Scope: ALL | GVBM | GVCN | MY_CREATED
    if (roleScope === 'GVBM') {
      result = result.filter(a => a.isGVBM || (a.hasTcmOrSubject && (a.isGVCN || a.isMyCreated || isManagement || a.isAssignedToMe)));
    } else if (roleScope === 'GVCN') {
      result = result.filter(a => a.isGVCN || a.isMyCreated || isManagement);
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

    const userRole = (session?.user as any)?.role || '';
    const upperRole = (userRole || '').toUpperCase().trim();
    const hasExpCreatePerm = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canCreate");
    const isAuthorized = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS', 'TEACHER', 'GV_MN', 'GVNN', 'GIAO_VIEN'].includes(upperRole) || hasExpCreatePerm;
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Bạn không có quyền khởi tạo hoạt động trải nghiệm' }, { status: 403 });
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
          teacherCode: upperRole.includes('CTHS') ? `CTHS_${session.user.id.slice(-6)}` : `GV_${session.user.id.slice(-6)}`,
          teacherName: session.user.name || session.user.email || (upperRole.includes('CTHS') ? 'Cán bộ CTHS' : 'Giáo viên'),
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
      departmentId = null,
      departmentName = null,
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
      assignedClasses = [],
      emailSettings = {},
      themeAxis = null,
      themeName = null,
      integratedSubjects = null,
      educationalContent = null,
      semester = 1,
      deliverables = null,
      leadTeacherId = null,
      leadTeacherName = null
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
      creatorName: session.user.name || teacher.teacherName || session.user.email || 'Giáo viên',
      creatorEmail: session.user.email || teacher.email || '',
      creatorUserId: session.user.id,
      departmentId,
      departmentName,
      subjectId,
      subjectName,
      themeAxis,
      themeName,
      integratedSubjects,
      deliverables,
      leadTeacherId,
      leadTeacherName,
      timeRange,
      semester: Number(semester) || 1,
      location: location || '',
      locationText: location || '',
      description: educationalContent || description || '',
      educationalContent: educationalContent || description || '',
      objectives: objectives || educationalContent || description || '',
      evidenceUrls,
      strand: strand || 'BAN_THAN',
      activityTypeId,
      activityTypeName: activityTypeName || 'Hoạt động trải nghiệm',
      scale,
      evalMode,
      criteria,
      formulaType,
      thresholds,
      mandatoryRules,
      deadline,
      emailSettings,
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
        semester: Number(semester) || 1,
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
          NOT: { status: { in: ['INACTIVE', 'DELETED', 'CHUYEN_TRUONG', 'THOI_HOC'] } }
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

    // Send email notification to GVCN & GVBM & CC GĐCS if activity is assigned
    if (status !== 'DRAFT' && assignedClasses.length > 0 && emailSettings?.sendEmail !== false) {
      sendExperientialActivityNotification({
        activityId: activityRecord.id,
        activityCode: recordCode,
        activityName: name.trim(),
        strand,
        activityTypeId,
        activityTypeName,
        subjectId,
        subjectName,
        departmentId,
        departmentName,
        scale,
        evalMode,
        criteria,
        date,
        timeRange,
        location,
        deadline,
        senderName: emailSettings?.senderName,
        senderEmail: emailSettings?.senderEmail,
        replyTo: emailSettings?.replyTo,
        customMessage: emailSettings?.customMessage,
        includeGdcs: emailSettings?.includeGdcs !== false,
        gdcsEmails: emailSettings?.gdcsEmails || [],
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
