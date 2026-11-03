import { prisma } from '@/lib/db';
import { ensureCoordinationTables } from './schemaInit';
import {
  COORDINATION_TOPICS,
  PRIORITY_CONFIG,
  MIN_NPS_SAMPLE_SIZE,
  validateAttachmentMeta,
  calculateBusinessHoursSlaDue,
  calculateBusinessHoursElapsed,
  classifyNpsScore,
  calculateExactNpsFromResponses,
  classifyAdminRole,
  canUserReadThreadContent,
  AttachmentValidationInput,
} from './constants';

export interface ValidTeacherContact {
  teacherId: string;
  teacherUserId: string;
  teacherCode: string;
  teacherName: string;
  roleType: 'GVCN' | 'GVBM';
  classId: string;
  className: string;
  campusId: string;
  academicYearId: string;
  subjectId: string | null;
  subjectName: string | null;
  assignmentId: string | null;
  assignmentType: 'HOMEROOM' | 'MOET' | 'CTQT' | 'SPECIAL';
  departmentId: string | null;
  latestThreadId?: string | null;
  latestThreadStatus?: string | null;
  latestMessageAt?: string | null;
}

export interface StudentCoordinationProfile {
  studentId: string;
  studentCode: string;
  fullName: string;
  classId: string;
  className: string;
  grade: string;
  level: string;
  programType: string;
  campusId: string;
  campusName: string;
  academicYearId: string;
  academicYearName: string;
  gvcnContacts: ValidTeacherContact[];
  gvbmContacts: ValidTeacherContact[];
}

/**
 * Lấy danh sách GVCN và GVBM hợp lệ của một lớp trong năm học
 * Hỗ trợ:
 * - GVCN chính (`Class.homeroomTeacherId`) & đồng chủ nhiệm (`TeacherClassAssignment` với role GVCN)
 * - GVBM chương trình MOET (`teachingAssignments`)
 * - GVBM chương trình Quốc tế (`ctqtTeachingAssignments` cả primary & delegated)
 * - GVBM chương trình Đặc thù (`specialAssignments`)
 * - Trường hợp 2 GV cùng dạy 1 môn hoặc GVCN đồng thời là GVBM
 */
export async function getValidTeachersForClass(
  classId: string,
  academicYearId?: string
): Promise<{ gvcnList: ValidTeacherContact[]; gvbmList: ValidTeacherContact[] }> {
  await ensureCoordinationTables();

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      campus: true,
      academicYear: true,
      teachers: {
        include: {
          teacher: true,
        },
      },
      teachingAssignments: {
        include: {
          teacher: true,
          subject: true,
        },
      },
      ctqtTeachingAssignments: {
        include: {
          primaryTeacher: true,
          delegatedTeacher: true,
        },
      },
      specialAssignments: {
        include: {
          teacher: true,
          subject: true,
        },
      },
    },
  });

  if (!cls) {
    return { gvcnList: [], gvbmList: [] };
  }

  const effectiveAyId = academicYearId || cls.academicYearId;
  const gvcnMap = new Map<string, ValidTeacherContact>();
  const gvbmMap = new Map<string, ValidTeacherContact>();

  // 1. Homeroom teacher from Class.homeroomTeacherId
  if (cls.homeroomTeacherId) {
    const ht = await prisma.teacher.findUnique({
      where: { id: cls.homeroomTeacherId },
    });
    if (ht && ht.status === 'ACTIVE') {
      gvcnMap.set(ht.id, {
        teacherId: ht.id,
        teacherUserId: ht.userId,
        teacherCode: ht.teacherCode,
        teacherName: ht.teacherName,
        roleType: 'GVCN',
        classId: cls.id,
        className: cls.className,
        campusId: cls.campusId,
        academicYearId: effectiveAyId,
        subjectId: null,
        subjectName: 'Chủ nhiệm lớp',
        assignmentId: `HOMEROOM_${cls.id}_${ht.id}`,
        assignmentType: 'HOMEROOM',
        departmentId: ht.departmentId || null,
      });
    }
  }

  // 2. Homeroom teachers from TeacherClassAssignment
  for (const tca of cls.teachers || []) {
    if (tca.status !== 'ACTIVE') continue;
    const roleUpper = (tca.roleInClass || '').toUpperCase();
    if (
      tca.teacher &&
      tca.teacher.status === 'ACTIVE' &&
      (roleUpper.includes('GVCN') || roleUpper.includes('HOMEROOM') || roleUpper.includes('CHU_NHIEM'))
    ) {
      gvcnMap.set(tca.teacher.id, {
        teacherId: tca.teacher.id,
        teacherUserId: tca.teacher.userId,
        teacherCode: tca.teacher.teacherCode,
        teacherName: tca.teacher.teacherName,
        roleType: 'GVCN',
        classId: cls.id,
        className: cls.className,
        campusId: cls.campusId,
        academicYearId: effectiveAyId,
        subjectId: null,
        subjectName: 'Chủ nhiệm lớp',
        assignmentId: tca.id,
        assignmentType: 'HOMEROOM',
        departmentId: tca.teacher.departmentId || null,
      });
    }
  }

  // 3. MOET Subject Teachers (teachingAssignments)
  for (const ta of cls.teachingAssignments || []) {
    if (ta.academicYearId !== effectiveAyId) continue;
    if (!ta.teacher || ta.teacher.status !== 'ACTIVE') continue;
    if (ta.subject && ta.subject.status !== 'ACTIVE') continue;

    const key = `${ta.teacherId}_${ta.subjectId}`;
    gvbmMap.set(key, {
      teacherId: ta.teacher.id,
      teacherUserId: ta.teacher.userId,
      teacherCode: ta.teacher.teacherCode,
      teacherName: ta.teacher.teacherName,
      roleType: 'GVBM',
      classId: cls.id,
      className: cls.className,
      campusId: cls.campusId,
      academicYearId: effectiveAyId,
      subjectId: ta.subjectId,
      subjectName: ta.subject?.subjectName || 'Bộ môn',
      assignmentId: ta.id,
      assignmentType: 'MOET',
      departmentId: ta.teacher.departmentId || null,
    });
  }

  // 4. CTQT Subject Teachers
  for (const ca of cls.ctqtTeachingAssignments || []) {
    if (ca.academicYearId !== effectiveAyId || ca.status !== 'ACTIVE') continue;
    const teachersToInclude = [ca.primaryTeacher, ca.delegatedTeacher].filter(Boolean);
    for (const teacher of teachersToInclude) {
      if (!teacher || teacher.status !== 'ACTIVE') continue;
      const key = `${teacher.id}_CTQT_${ca.subjectCode}`;
      gvbmMap.set(key, {
        teacherId: teacher.id,
        teacherUserId: teacher.userId,
        teacherCode: teacher.teacherCode,
        teacherName: teacher.teacherName,
        roleType: 'GVBM',
        classId: cls.id,
        className: cls.className,
        campusId: cls.campusId,
        academicYearId: effectiveAyId,
        subjectId: ca.subjectCode,
        subjectName: `CTQT ${ca.subjectCode}`,
        assignmentId: ca.id,
        assignmentType: 'CTQT',
        departmentId: teacher.departmentId || null,
      });
    }
  }

  // 5. Special Subject Teachers
  for (const sa of cls.specialAssignments || []) {
    if (sa.academicYearId !== effectiveAyId || sa.status !== 'ACTIVE') continue;
    if (!sa.teacher || sa.teacher.status !== 'ACTIVE') continue;
    const key = `${sa.teacherId}_SPEC_${sa.subjectId}`;
    gvbmMap.set(key, {
      teacherId: sa.teacher.id,
      teacherUserId: sa.teacher.userId,
      teacherCode: sa.teacher.teacherCode,
      teacherName: sa.teacher.teacherName,
      roleType: 'GVBM',
      classId: cls.id,
      className: cls.className,
      campusId: cls.campusId,
      academicYearId: effectiveAyId,
      subjectId: sa.subjectId,
      subjectName: sa.subject?.name || 'Môn đặc thù',
      assignmentId: sa.id,
      assignmentType: 'SPECIAL',
      departmentId: sa.teacher.departmentId || null,
    });
  }

  return {
    gvcnList: Array.from(gvcnMap.values()),
    gvbmList: Array.from(gvbmMap.values()),
  };
}

/**
 * Lấy ngữ cảnh đầy đủ của người dùng hiện tại phục vụ 4 giao diện (GVCN, GVBM, PHHS, Admin/KT&ĐBCL)
 */
export async function resolveUserCoordinationContext(params: {
  userId: string;
  role: string;
  academicYearId?: string;
  studentId?: string;
}) {
  await ensureCoordinationTables();

  const { userId, role } = params;
  const activeAy =
    (params.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: params.academicYearId } })
      : null) ||
    (await prisma.academicYear.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    })) ||
    (await prisma.academicYear.findFirst({
      orderBy: { startDate: 'desc' },
    }));

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, status: true },
  });

  const effectiveAyId = activeAy?.id || '';

  // 1. PARENT CONTEXT
  if (role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true,
                    academicYear: true,
                  },
                },
                campus: true,
              },
            },
          },
        },
      },
    });

    const childrenProfiles: StudentCoordinationProfile[] = [];
    if (parent) {
      for (const link of parent.students) {
        const st = link.student;
        if (!st || !st.classId || !st.class) continue;
        const { gvcnList, gvbmList } = await getValidTeachersForClass(
          st.classId,
          st.class.academicYearId
        );

        const existingThreads = await prisma.communicationThread.findMany({
          where: {
            studentId: st.id,
            parentId: parent.id,
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        const enrichContact = (c: ValidTeacherContact): ValidTeacherContact => {
          const matched = existingThreads.find(
            (t) =>
              t.teacherId === c.teacherId &&
              (c.roleType === 'GVCN'
                ? t.threadType === 'PARENT_GVCN'
                : t.threadType === 'PARENT_GVBM' && t.subjectId === c.subjectId)
          );
          return {
            ...c,
            latestThreadId: matched?.id || null,
            latestThreadStatus: matched?.status || null,
            latestMessageAt: matched?.lastMessageAt ? matched.lastMessageAt.toISOString() : null,
          };
        };

        childrenProfiles.push({
          studentId: st.id,
          studentCode: st.studentCode,
          fullName: st.studentName,
          classId: st.classId,
          className: st.class.className,
          grade: st.class.grade,
          level: st.class.level,
          programType: st.class.educationSystem || '',
          campusId: st.campusId,
          campusName: st.campus?.campusName || st.class.campus?.campusName || '',
          academicYearId: st.class.academicYearId,
          academicYearName: st.class.academicYear?.name || activeAy?.name || '',
          gvcnContacts: gvcnList.map(enrichContact),
          gvbmContacts: gvbmList.map(enrichContact),
        });
      }
    }

    const activeChild =
      (params.studentId
        ? childrenProfiles.find((c) => c.studentId === params.studentId)
        : null) ||
      childrenProfiles[0] ||
      null;

    return {
      role: 'PARENT',
      academicYears,
      activeAcademicYear: activeAy,
      parentId: parent?.id || null,
      parentName: parent?.parentName || null,
      children: childrenProfiles,
      activeChild,
      topics: COORDINATION_TOPICS,
    };
  }

  // 2. TEACHER CONTEXT (GVCN & GVBM)
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      campus: true,
      departmentRel: true,
    },
  });

  if (teacher) {
    const homeroomClassesDirect = await prisma.class.findMany({
      where: {
        homeroomTeacherId: teacher.id,
        ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
      },
      include: {
        campus: true,
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true, studentCode: true, studentName: true },
          orderBy: { studentName: 'asc' },
        },
      },
    });

    const homeroomLinks = await prisma.teacherClassAssignment.findMany({
      where: {
        teacherId: teacher.id,
        status: 'ACTIVE',
        roleInClass: { in: ['GVCN', 'HOMEROOM', 'CHU_NHIEM'] },
        class: effectiveAyId ? { academicYearId: effectiveAyId } : undefined,
      },
      include: {
        class: {
          include: {
            campus: true,
            students: {
              where: { status: 'ACTIVE' },
              select: { id: true, studentCode: true, studentName: true },
              orderBy: { studentName: 'asc' },
            },
          },
        },
      },
    });

    const homeroomMap = new Map<string, (typeof homeroomClassesDirect)[number]>();
    for (const c of homeroomClassesDirect) homeroomMap.set(c.id, c);
    for (const link of homeroomLinks) {
      if (link.class) homeroomMap.set(link.class.id, link.class);
    }

    const homeroomClasses = await Promise.all(
      Array.from(homeroomMap.values()).map(async (cls) => {
        const { gvbmList } = await getValidTeachersForClass(cls.id, cls.academicYearId);
        return {
          id: cls.id,
          className: cls.className,
          grade: cls.grade,
          level: cls.level,
          campusId: cls.campusId,
          campusName: cls.campus?.campusName || '',
          academicYearId: cls.academicYearId,
          students: (cls.students || []).map((s) => ({
            id: s.id,
            studentCode: s.studentCode,
            fullName: s.studentName,
          })),
          subjectTeachers: gvbmList,
        };
      })
    );

    const moetAssignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
        ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
      },
      include: {
        class: {
          include: {
            students: {
              where: { status: 'ACTIVE' },
              select: { id: true, studentCode: true, studentName: true },
              orderBy: { studentName: 'asc' },
            },
          },
        },
        subject: true,
      },
    });

    const validTeachingAssignments = moetAssignments.map((a) => ({
      assignmentId: a.id,
      assignmentType: 'MOET' as const,
      academicYearId: a.academicYearId,
      classId: a.classId,
      className: a.class?.className || '',
      grade: a.class?.grade || '',
      campusId: a.class?.campusId || teacher.campusId,
      subjectId: a.subjectId,
      subjectName: a.subject?.subjectName || '',
      students: (a.class?.students || []).map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.studentName,
      })),
    }));

    return {
      role,
      adminType: classifyAdminRole(role, teacher.position),
      academicYears,
      activeAcademicYear: activeAy,
      teacher: {
        id: teacher.id,
        userId: teacher.userId,
        teacherCode: teacher.teacherCode,
        teacherName: teacher.teacherName,
        campusId: teacher.campusId,
        campusName: teacher.campus?.campusName || '',
        departmentId: teacher.departmentId,
        departmentName: teacher.departmentRel?.name || '',
        position: teacher.position,
        isGvcn: homeroomClasses.length > 0,
        isGvbm: validTeachingAssignments.length > 0,
      },
      homeroomClasses,
      teachingAssignments: validTeachingAssignments,
      topics: COORDINATION_TOPICS,
    };
  }

  // 3. ADMIN / KT&ĐBCL CONTEXT
  const [campuses, classes, subjects, departments, teachers] = await Promise.all([
    prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, campusCode: true, campusName: true },
      orderBy: { campusCode: 'asc' },
    }),
    prisma.class.findMany({
      where: effectiveAyId ? { academicYearId: effectiveAyId } : undefined,
      select: {
        id: true,
        className: true,
        grade: true,
        level: true,
        educationSystem: true,
        campusId: true,
        academicYearId: true,
      },
      orderBy: { className: 'asc' },
    }),
    prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, subjectCode: true, subjectName: true },
      orderBy: { subjectName: 'asc' },
    }),
    prisma.department.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.teacher.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        userId: true,
        teacherCode: true,
        teacherName: true,
        campusId: true,
        departmentId: true,
        position: true,
      },
      orderBy: { teacherName: 'asc' },
    }),
  ]);

  return {
    role,
    adminType: classifyAdminRole(role),
    academicYears,
    activeAcademicYear: activeAy,
    filterOptions: {
      campuses,
      classes: classes.map((c) => ({
        ...c,
        programType: c.educationSystem || '',
      })),
      subjects: subjects.map((s) => ({
        id: s.id,
        code: s.subjectCode,
        name: s.subjectName,
      })),
      departments,
      teachers,
      levels: Array.from(new Set(classes.map((c) => c.level).filter(Boolean))),
      programTypes: Array.from(
        new Set(classes.map((c) => c.educationSystem).filter((x): x is string => Boolean(x)))
      ),
      grades: Array.from(new Set(classes.map((c) => c.grade).filter(Boolean))),
    },
    topics: COORDINATION_TOPICS,
  };
}

/**
 * Kiểm tra nghiêm ngặt quan hệ PHHS - Học sinh - Giáo viên (GVCN / GVBM)
 */
export async function verifyParentTeacherStudentRelation(params: {
  parentUserId?: string;
  parentId?: string;
  studentId: string;
  teacherId: string;
  roleType: 'GVCN' | 'GVBM';
  subjectId?: string | null;
}): Promise<{
  valid: boolean;
  reason?: string;
  student?: {
    id: string;
    fullName: string;
    studentCode: string;
    classId: string;
    campusId: string;
    academicYearId: string;
  };
  parent?: { id: string; userId: string; parentName: string };
  matchedContact?: ValidTeacherContact;
}> {
  await ensureCoordinationTables();

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: { class: true },
  });

  if (!student || !student.classId || !student.class) {
    return { valid: false, reason: 'Không tìm thấy học sinh hoặc lớp học hợp lệ.' };
  }

  let parentRecord: { id: string; userId: string; parentName: string } | null = null;
  if (params.parentUserId || params.parentId) {
    const p = await prisma.parent.findFirst({
      where: params.parentId ? { id: params.parentId } : { userId: params.parentUserId },
      include: {
        students: {
          where: { studentId: student.id },
        },
      },
    });

    if (!p || p.students.length === 0) {
      return {
        valid: false,
        reason: 'Tài khoản Phụ huynh không có quyền truy cập hoặc liên hệ cho học sinh này.',
      };
    }
    parentRecord = { id: p.id, userId: p.userId, parentName: p.parentName };
  } else {
    const link = await prisma.parentStudentLink.findFirst({
      where: { studentId: student.id },
      include: { parent: true },
    });
    if (link?.parent) {
      parentRecord = {
        id: link.parent.id,
        userId: link.parent.userId,
        parentName: link.parent.parentName,
      };
    }
  }

  const { gvcnList, gvbmList } = await getValidTeachersForClass(
    student.classId,
    student.class.academicYearId
  );

  if (params.roleType === 'GVCN') {
    const matched = gvcnList.find((c) => c.teacherId === params.teacherId);
    if (!matched) {
      return {
        valid: false,
        reason: 'Giáo viên được chọn không phải là Giáo viên chủ nhiệm hợp lệ của lớp học sinh.',
      };
    }
    return {
      valid: true,
      student: {
        id: student.id,
        fullName: student.studentName,
        studentCode: student.studentCode,
        classId: student.classId,
        campusId: student.campusId,
        academicYearId: student.class.academicYearId,
      },
      parent: parentRecord || undefined,
      matchedContact: matched,
    };
  }

  const matched = gvbmList.find(
    (c) =>
      c.teacherId === params.teacherId &&
      (!params.subjectId || c.subjectId === params.subjectId)
  );
  if (!matched) {
    return {
      valid: false,
      reason: 'Giáo viên bộ môn không có phân công giảng dạy hợp lệ tại lớp/môn của học sinh này.',
    };
  }

  return {
    valid: true,
    student: {
      id: student.id,
      fullName: student.studentName,
      studentCode: student.studentCode,
      classId: student.classId,
      campusId: student.campusId,
      academicYearId: student.class.academicYearId,
    },
    parent: parentRecord || undefined,
    matchedContact: matched,
  };
}

async function dispatchCoordinationNotification(params: {
  recipientUserId: string;
  threadId?: string | null;
  caseId?: string | null;
  notificationType: string;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  if (!params.recipientUserId) return;
  try {
    await prisma.communicationNotification.create({
      data: {
        userId: params.recipientUserId,
        threadId: params.threadId || null,
        caseId: params.caseId || null,
        notificationType: params.notificationType,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl || null,
      },
    });
    await prisma.notification.create({
      data: {
        userId: params.recipientUserId,
        title: params.title,
        message: params.body,
        type: 'COORDINATION',
        link: params.linkUrl || null,
      },
    });
  } catch {
    // Non-blocking
  }
}

async function writeCoordinationAuditLog(params: {
  actorId: string;
  actorRole: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  campusId?: string | null;
  description: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.actorId || 'SYSTEM',
        userEmail: params.actorRole || 'SYSTEM',
        action: params.actionType,
        targetTable: params.resourceType,
        targetId: params.resourceId,
        newValues: JSON.stringify({
          actorRole: params.actorRole,
          campusId: params.campusId || null,
          description: params.description,
        }),
        ipAddress: '127.0.0.1',
      },
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Tạo hội thoại trao đổi mới + chống gửi trùng + kiểm tra tệp đính kèm
 */
export async function createOrReplyThread(params: {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  studentId: string;
  teacherId: string;
  roleType: 'GVCN' | 'GVBM';
  subjectId?: string | null;
  topic: string;
  subjectTitle?: string;
  content: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  clientMessageId?: string;
  attachments?: AttachmentValidationInput[];
  createCaseImmediately?: boolean;
}) {
  await ensureCoordinationTables();

  const trimmedContent = (params.content || '').trim();
  if (!trimmedContent) {
    throw new Error('Nội dung trao đổi không được để trống.');
  }
  if (trimmedContent.length > 5000) {
    throw new Error('Nội dung tin nhắn vượt quá giới hạn 5.000 ký tự.');
  }

  if (params.attachments && params.attachments.length > 0) {
    if (params.attachments.length > 5) {
      throw new Error('Chỉ được đính kèm tối đa 5 tệp trong một lần gửi.');
    }
    for (const att of params.attachments) {
      const check = validateAttachmentMeta(att);
      if (!check.valid) {
        throw new Error(check.reason || 'Tệp đính kèm không hợp lệ.');
      }
    }
  }

  if (params.clientMessageId) {
    const existingMsg = await prisma.communicationMessage.findUnique({
      where: { clientMessageId: params.clientMessageId },
      include: { thread: true },
    });
    if (existingMsg) {
      return {
        thread: existingMsg.thread,
        message: existingMsg,
        deduplicated: true,
      };
    }
  }

  const isParentSender = params.actorRole === 'PARENT';
  const rel = await verifyParentTeacherStudentRelation({
    parentUserId: isParentSender ? params.actorUserId : undefined,
    studentId: params.studentId,
    teacherId: params.teacherId,
    roleType: params.roleType,
    subjectId: params.subjectId,
  });

  if (!rel.valid || !rel.student || !rel.matchedContact) {
    throw new Error(rel.reason || 'Quan hệ phân công không hợp lệ.');
  }

  if (!isParentSender && params.actorRole === 'TEACHER') {
    const actorTeacher = await prisma.teacher.findUnique({ where: { userId: params.actorUserId } });
    if (!actorTeacher) {
      throw new Error('Không tìm thấy hồ sơ giáo viên.');
    }
    if (actorTeacher.id !== params.teacherId) {
      const { gvcnList } = await getValidTeachersForClass(
        rel.student.classId,
        rel.student.academicYearId
      );
      const isClassGvcn = gvcnList.some((g) => g.teacherId === actorTeacher.id);
      if (!isClassGvcn) {
        throw new Error('Giáo viên không có phân công hợp lệ để tạo cuộc trao đổi này.');
      }
    }
  }

  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  const recentDuplicate = await prisma.communicationMessage.findFirst({
    where: {
      senderUserId: params.actorUserId,
      content: trimmedContent,
      createdAt: { gte: tenSecondsAgo },
    },
    include: { thread: true },
  });
  if (recentDuplicate) {
    return {
      thread: recentDuplicate.thread,
      message: recentDuplicate,
      deduplicated: true,
    };
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const sentLastMinute = await prisma.communicationMessage.count({
    where: {
      senderUserId: params.actorUserId,
      createdAt: { gte: oneMinuteAgo },
    },
  });
  if (sentLastMinute >= 15) {
    throw new Error('Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít giây.');
  }

  const topicDef =
    COORDINATION_TOPICS.find((t) => t.code === params.topic || t.label === params.topic) ||
    COORDINATION_TOPICS[4];
  const priority = params.priority || topicDef.defaultPriority;
  const slaHours = PRIORITY_CONFIG[priority]?.slaBusinessHours || 16;
  const now = new Date();
  const slaDueAt = calculateBusinessHoursSlaDue(now, slaHours);

  const threadType = params.roleType === 'GVCN' ? 'PARENT_GVCN' : 'PARENT_GVBM';
  const threadCode = `THD-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const thread = await prisma.communicationThread.create({
    data: {
      threadCode,
      threadType,
      academicYearId: rel.student.academicYearId,
      campusId: rel.student.campusId,
      classId: rel.student.classId,
      studentId: rel.student.id,
      parentId: rel.parent?.id || null,
      teacherId: rel.matchedContact.teacherId,
      subjectId: rel.matchedContact.subjectId,
      assignmentId: rel.matchedContact.assignmentId,
      assignmentType: rel.matchedContact.assignmentType,
      topic: topicDef.code,
      subjectTitle:
        params.subjectTitle?.trim() ||
        `${topicDef.label} - HS ${rel.student.fullName} (${rel.matchedContact.className})`,
      status: 'NEW',
      visibility: 'PRIVATE',
      priority,
      slaDueAt,
      lastMessageAt: now,
      lastMessagePreview: trimmedContent.slice(0, 160),
      unreadCountParent: isParentSender ? 0 : 1,
      unreadCountTeacher: isParentSender ? 1 : 0,
      createdByUserId: params.actorUserId,
    },
  });

  const participantRows: Array<{
    threadId: string;
    userId: string;
    userName: string;
    role: string;
    accessScope: string;
  }> = [
    {
      threadId: thread.id,
      userId: rel.matchedContact.teacherUserId,
      userName: rel.matchedContact.teacherName,
      role: params.roleType,
      accessScope: 'FULL',
    },
  ];
  if (rel.parent?.userId) {
    participantRows.push({
      threadId: thread.id,
      userId: rel.parent.userId,
      userName: rel.parent.parentName,
      role: 'PARENT',
      accessScope: 'FULL',
    });
  }

  for (const p of participantRows) {
    await prisma.communicationParticipant.upsert({
      where: {
        threadId_userId: {
          threadId: p.threadId,
          userId: p.userId,
        },
      },
      update: {},
      create: p,
    });
  }

  const senderRoleTag = isParentSender ? 'PARENT' : params.roleType;
  const message = await prisma.communicationMessage.create({
    data: {
      threadId: thread.id,
      senderUserId: params.actorUserId,
      senderName: params.actorName,
      senderRole: senderRoleTag,
      messageType: 'TEXT',
      content: trimmedContent,
      isInternalNote: false,
      clientMessageId: params.clientMessageId || null,
      readByJson: JSON.stringify([params.actorUserId]),
    },
  });

  if (params.attachments && params.attachments.length > 0) {
    for (const att of params.attachments) {
      await prisma.communicationAttachment.create({
        data: {
          threadId: thread.id,
          messageId: message.id,
          uploadedByUserId: params.actorUserId,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          fileUrl: att.fileUrl || `/uploads/coordination/${encodeURIComponent(att.fileName)}`,
          isSafe: true,
        },
      });
    }
  }

  let createdCase = null;
  if (params.createCaseImmediately) {
    createdCase = await createCoordinationCase({
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorRole: senderRoleTag,
      threadId: thread.id,
      studentId: rel.student.id,
      teacherId: rel.matchedContact.teacherId,
      assignedToUserId: rel.matchedContact.teacherUserId,
      assignedToName: rel.matchedContact.teacherName,
      assignedRole: params.roleType,
      subjectId: rel.matchedContact.subjectId,
      category: topicDef.code,
      title: thread.subjectTitle,
      description: trimmedContent,
      priority,
    });
  }

  const targetUserId = isParentSender
    ? rel.matchedContact.teacherUserId
    : rel.parent?.userId || '';
  const targetLink = isParentSender
    ? params.roleType === 'GVCN'
      ? '/teacher/phoi-hop-giao-duc'
      : '/teacher/trao-doi-ho-tro'
    : '/parent/trao-doi-dong-hanh';

  await dispatchCoordinationNotification({
    recipientUserId: targetUserId,
    threadId: thread.id,
    caseId: createdCase?.id || null,
    notificationType: 'NEW_MESSAGE',
    title: `Trao đổi mới: ${topicDef.label}`,
    body: `${params.actorName} đã gửi trao đổi về học sinh ${rel.student.fullName}.`,
    linkUrl: targetLink,
  });

  await writeCoordinationAuditLog({
    actorId: params.actorUserId,
    actorRole: params.actorRole,
    actionType: 'CREATE_THREAD',
    resourceType: 'CommunicationThread',
    resourceId: thread.id,
    campusId: rel.student.campusId,
    description: `Tạo hội thoại ${thread.threadCode} (${threadType}) cho HS ${rel.student.studentCode}`,
  });

  return {
    thread,
    message,
    caseRecord: createdCase,
    deduplicated: false,
  };
}

/**
 * Gửi tin nhắn phản hồi trong một hội thoại đã tồn tại
 */
export async function replyToExistingThread(params: {
  threadId: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  content: string;
  isInternalNote?: boolean;
  shareWithGvcn?: boolean;
  clientMessageId?: string;
  attachments?: AttachmentValidationInput[];
}) {
  await ensureCoordinationTables();

  const trimmed = (params.content || '').trim();
  if (!trimmed) {
    throw new Error('Nội dung phản hồi không được để trống.');
  }

  if (params.attachments && params.attachments.length > 0) {
    for (const att of params.attachments) {
      const check = validateAttachmentMeta(att);
      if (!check.valid) {
        throw new Error(check.reason || 'Tệp đính kèm không hợp lệ.');
      }
    }
  }

  if (params.clientMessageId) {
    const dup = await prisma.communicationMessage.findUnique({
      where: { clientMessageId: params.clientMessageId },
      include: { thread: true },
    });
    if (dup) return { thread: dup.thread, message: dup, deduplicated: true };
  }

  const thread = await prisma.communicationThread.findUnique({
    where: { id: params.threadId },
    include: {
      participants: true,
      cases: true,
    },
  });

  if (!thread) {
    throw new Error('Không tìm thấy hội thoại.');
  }

  const [teacher, parent] = await Promise.all([
    prisma.teacher.findUnique({ where: { userId: params.actorUserId } }),
    prisma.parent.findUnique({ where: { userId: params.actorUserId } }),
  ]);

  let homeroomClassIds: string[] = [];
  if (teacher) {
    const classes = await prisma.class.findMany({
      where: { homeroomTeacherId: teacher.id },
      select: { id: true },
    });
    homeroomClassIds = classes.map((c) => c.id);
  }

  const access = canUserReadThreadContent({
    userId: params.actorUserId,
    userRole: params.actorRole,
    teacherId: teacher?.id,
    parentId: parent?.id,
    homeroomClassIds,
    thread,
  });

  if (!access.allowed) {
    throw new Error(access.reason || 'Bạn không có quyền phản hồi vào hội thoại này.');
  }

  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  const recentDup = await prisma.communicationMessage.findFirst({
    where: {
      threadId: thread.id,
      senderUserId: params.actorUserId,
      content: trimmed,
      createdAt: { gte: tenSecondsAgo },
    },
  });
  if (recentDup) {
    return { thread, message: recentDup, deduplicated: true };
  }

  const isParentSender = params.actorRole === 'PARENT';
  const now = new Date();
  let firstRespondedAt = thread.firstRespondedAt;
  let isOnTime = thread.isOnTime;

  if (!isParentSender && !firstRespondedAt && thread.createdByUserId !== params.actorUserId) {
    firstRespondedAt = now;
    isOnTime = thread.slaDueAt ? now <= new Date(thread.slaDueAt) : true;
  }

  let visibility = thread.visibility;
  if (params.shareWithGvcn && visibility === 'PRIVATE') {
    visibility = 'SHARED_WITH_GVCN';
    const { gvcnList } = await getValidTeachersForClass(thread.classId, thread.academicYearId);
    for (const gvcn of gvcnList) {
      await prisma.communicationParticipant.upsert({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: gvcn.teacherUserId,
          },
        },
        update: { accessScope: 'FULL' },
        create: {
          threadId: thread.id,
          userId: gvcn.teacherUserId,
          userName: gvcn.teacherName,
          role: 'GVCN',
          accessScope: 'FULL',
        },
      });
    }
  }

  const senderRoleTag = isParentSender
    ? 'PARENT'
    : teacher?.id === thread.teacherId
      ? thread.threadType === 'PARENT_GVCN'
        ? 'GVCN'
        : 'GVBM'
      : homeroomClassIds.includes(thread.classId)
        ? 'GVCN'
        : params.actorRole;

  const message = await prisma.communicationMessage.create({
    data: {
      threadId: thread.id,
      senderUserId: params.actorUserId,
      senderName: params.actorName,
      senderRole: senderRoleTag,
      messageType: params.isInternalNote ? 'COORDINATION_NOTE' : 'TEXT',
      content: trimmed,
      isInternalNote: Boolean(params.isInternalNote),
      clientMessageId: params.clientMessageId || null,
      readByJson: JSON.stringify([params.actorUserId]),
    },
  });

  if (params.attachments && params.attachments.length > 0) {
    for (const att of params.attachments) {
      await prisma.communicationAttachment.create({
        data: {
          threadId: thread.id,
          messageId: message.id,
          uploadedByUserId: params.actorUserId,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          fileUrl: att.fileUrl || `/uploads/coordination/${encodeURIComponent(att.fileName)}`,
          isSafe: true,
        },
      });
    }
  }

  const updatedThread = await prisma.communicationThread.update({
    where: { id: thread.id },
    data: {
      status: 'IN_DISCUSSION',
      visibility,
      firstRespondedAt,
      isOnTime,
      lastMessageAt: now,
      lastMessagePreview: params.isInternalNote
        ? '[Ghi chú phối hợp nội bộ]'
        : trimmed.slice(0, 160),
      unreadCountParent: isParentSender
        ? 0
        : params.isInternalNote
          ? thread.unreadCountParent
          : { increment: 1 },
      unreadCountTeacher: isParentSender ? { increment: 1 } : 0,
    },
  });

  for (const part of thread.participants) {
    if (part.userId === params.actorUserId) continue;
    if (params.isInternalNote && part.role === 'PARENT') continue;

    await dispatchCoordinationNotification({
      recipientUserId: part.userId,
      threadId: thread.id,
      notificationType: 'NEW_MESSAGE',
      title: `Phản hồi mới: ${thread.subjectTitle}`,
      body: `${params.actorName}: ${trimmed.slice(0, 100)}`,
      linkUrl:
        part.role === 'PARENT'
          ? '/parent/trao-doi-dong-hanh'
          : part.role === 'GVCN'
            ? '/teacher/phoi-hop-giao-duc'
            : '/teacher/trao-doi-ho-tro',
    });
  }

  return {
    thread: updatedThread,
    message,
    deduplicated: false,
  };
}

/**
 * Tạo Hồ sơ Yêu cầu Xử lý / Phối hợp GVCN <-> GVBM (CommunicationCase)
 */
export async function createCoordinationCase(params: {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  threadId?: string | null;
  studentId: string;
  teacherId?: string | null;
  assignedToUserId?: string;
  assignedToName?: string;
  assignedRole?: 'GVCN' | 'GVBM' | 'TTCM' | 'QLCM' | 'KT_DBCL';
  subjectId?: string | null;
  category: string;
  title: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  supportPlanMeasures?: string;
  slaTargetHours?: number;
}) {
  await ensureCoordinationTables();

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: { class: true },
  });
  if (!student || !student.classId || !student.class) {
    throw new Error('Không tìm thấy học sinh hợp lệ để tạo yêu cầu xử lý.');
  }

  const parentLink = await prisma.parentStudentLink.findFirst({
    where: { studentId: student.id },
  });

  let targetTeacherId = params.teacherId || null;
  let assignedUserId = params.assignedToUserId || '';
  let assignedName = params.assignedToName || '';
  let assignedRole = params.assignedRole || 'GVCN';
  let departmentId: string | null = null;

  if (!assignedUserId && targetTeacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: targetTeacherId } });
    if (t) {
      assignedUserId = t.userId;
      assignedName = t.teacherName;
      departmentId = t.departmentId || null;
    }
  }

  if (!assignedUserId) {
    const { gvcnList } = await getValidTeachersForClass(
      student.classId,
      student.class.academicYearId
    );
    if (gvcnList[0]) {
      targetTeacherId = gvcnList[0].teacherId;
      assignedUserId = gvcnList[0].teacherUserId;
      assignedName = gvcnList[0].teacherName;
      assignedRole = 'GVCN';
      departmentId = gvcnList[0].departmentId;
    } else {
      assignedUserId = params.actorUserId;
      assignedName = params.actorName;
    }
  }

  const priority = params.priority || 'NORMAL';
  const slaHours =
    params.slaTargetHours || PRIORITY_CONFIG[priority]?.slaBusinessHours || 16;
  const now = new Date();
  const slaDueAt = calculateBusinessHoursSlaDue(now, slaHours);
  const caseCode = `CASE-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const created = await prisma.communicationCase.create({
    data: {
      caseCode,
      threadId: params.threadId || null,
      academicYearId: student.class.academicYearId,
      campusId: student.campusId,
      classId: student.classId,
      studentId: student.id,
      subjectId: params.subjectId || null,
      parentId: parentLink?.parentId || null,
      teacherId: targetTeacherId,
      departmentId,
      createdByUserId: params.actorUserId,
      requesterRole: params.actorRole,
      assignedToUserId: assignedUserId,
      assignedToName: assignedName,
      assignedRole,
      category: params.category,
      title: params.title.trim(),
      description: params.description.trim(),
      priority,
      status: assignedUserId ? 'ASSIGNED' : 'NEW',
      slaTargetHours: slaHours,
      slaDueAt,
      supportPlanMeasures: params.supportPlanMeasures || null,
    },
  });

  await prisma.communicationCaseHistory.create({
    data: {
      caseId: created.id,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'CREATE',
      fromStatus: null,
      toStatus: created.status,
      toAssigneeId: assignedUserId,
      note: `Khởi tạo yêu cầu xử lý (${created.caseCode}) - Hạn SLA: ${slaHours} giờ làm việc.`,
    },
  });

  if (assignedUserId && assignedUserId !== params.actorUserId) {
    await dispatchCoordinationNotification({
      recipientUserId: assignedUserId,
      threadId: params.threadId || null,
      caseId: created.id,
      notificationType: 'CASE_ASSIGNED',
      title: `Yêu cầu phối hợp mới: ${created.caseCode}`,
      body: `${params.actorName} đã phân công yêu cầu "${created.title}" cho bạn.`,
      linkUrl:
        assignedRole === 'GVCN'
          ? '/teacher/phoi-hop-giao-duc'
          : assignedRole === 'GVBM'
            ? '/teacher/trao-doi-ho-tro'
            : '/admin/ktdbcl/chat-luong-phoi-hop',
    });
  }

  await writeCoordinationAuditLog({
    actorId: params.actorUserId,
    actorRole: params.actorRole,
    actionType: 'CREATE_CASE',
    resourceType: 'CommunicationCase',
    resourceId: created.id,
    campusId: student.campusId,
    description: `Tạo hồ sơ yêu cầu xử lý ${created.caseCode} cho HS ${student.studentCode}`,
  });

  return created;
}

/**
 * Cập nhật trạng thái, chuyển bộ phận xử lý, liên kết Kế hoạch hỗ trợ học sinh, xác nhận hoàn tất hoặc mở lại yêu cầu
 */
export async function updateCoordinationCase(params: {
  caseId: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'STATUS_CHANGE'
    | 'FORWARD'
    | 'UPDATE_PLAN'
    | 'RESOLVE'
    | 'CONFIRM_COMPLETED'
    | 'REOPEN'
    | 'SLA_REMINDER';
  toStatus?: string;
  forwardToUserId?: string;
  forwardToName?: string;
  forwardToRole?: 'GVCN' | 'GVBM' | 'TTCM' | 'QLCM' | 'KT_DBCL';
  supportPlanMeasures?: string;
  supportProgressNote?: string;
  supportOutcomeProposal?: 'CONTINUE' | 'COMPLETE' | 'ESCALATE';
  resolutionSummary?: string;
  verifiedConclusion?: string;
  syncToStudentSupportRecord?: boolean;
  reopenReason?: string;
  note?: string;
}) {
  await ensureCoordinationTables();

  const existing = await prisma.communicationCase.findUnique({
    where: { id: params.caseId },
  });
  if (!existing) {
    throw new Error('Không tìm thấy hồ sơ yêu cầu xử lý.');
  }

  const now = new Date();
  let nextStatus = params.toStatus || existing.status;
  let nextAssigneeId = existing.assignedToUserId;
  let nextAssigneeName = existing.assignedToName;
  let nextAssignedRole = existing.assignedRole;
  const firstResponseAt = existing.firstResponseAt || now;
  let resolvedAt = existing.resolvedAt;
  let completedAt = existing.completedAt;
  let reopenedCount = existing.reopenedCount;
  let isResolvedOnTime = existing.isResolvedOnTime;
  let parentConfirmedAt = existing.parentConfirmedAt;
  let linkedSupportTargetId = existing.linkedSupportTargetId;

  if (params.action === 'FORWARD') {
    if (!params.forwardToUserId) {
      throw new Error('Vui lòng chọn người hoặc bộ phận nhận chuyển giao.');
    }
    nextAssigneeId = params.forwardToUserId;
    nextAssigneeName = params.forwardToName || 'Người phụ trách mới';
    nextAssignedRole = params.forwardToRole || existing.assignedRole;
    nextStatus = 'ASSIGNED';

    if (existing.threadId) {
      const nextVis =
        nextAssignedRole === 'KT_DBCL'
          ? 'ESCALATED_QA'
          : nextAssignedRole === 'GVCN'
            ? 'SHARED_WITH_GVCN'
            : undefined;
      if (nextVis) {
        await prisma.communicationThread.update({
          where: { id: existing.threadId },
          data: { visibility: nextVis },
        });
      }
      await prisma.communicationParticipant.upsert({
        where: {
          threadId_userId: {
            threadId: existing.threadId,
            userId: nextAssigneeId,
          },
        },
        update: { accessScope: 'FULL' },
        create: {
          threadId: existing.threadId,
          userId: nextAssigneeId,
          userName: nextAssigneeName,
          role: nextAssignedRole,
          accessScope: 'FULL',
        },
      });
    }
  } else if (params.action === 'RESOLVE') {
    nextStatus = 'RESOLVED';
    resolvedAt = now;
    isResolvedOnTime = now <= new Date(existing.slaDueAt);
  } else if (params.action === 'CONFIRM_COMPLETED') {
    nextStatus = 'COMPLETED';
    completedAt = now;
    if (params.actorRole === 'PARENT') {
      parentConfirmedAt = now;
    }
    if (isResolvedOnTime === null) {
      isResolvedOnTime = now <= new Date(existing.slaDueAt);
    }
  } else if (params.action === 'REOPEN') {
    nextStatus = 'REOPENED';
    reopenedCount = existing.reopenedCount + 1;
    completedAt = null;
  } else if (params.action === 'UPDATE_PLAN') {
    if (existing.status === 'NEW' || existing.status === 'ASSIGNED') {
      nextStatus = 'IN_PROGRESS';
    }
  }

  // Sync ONLY verified educational conclusion & support plan to Sổ Giáo viên / Hồ sơ Hỗ trợ Học tập (Section 7)
  if (
    params.syncToStudentSupportRecord &&
    (params.verifiedConclusion || params.supportPlanMeasures)
  ) {
    const teacherRecord =
      (existing.teacherId
        ? await prisma.teacher.findUnique({ where: { id: existing.teacherId } })
        : null) ||
      (await prisma.teacher.findUnique({ where: { userId: params.actorUserId } }));

    if (teacherRecord && !linkedSupportTargetId) {
      try {
        const target = await prisma.learningSupportTarget.upsert({
          where: {
            studentId_supportType_academicYearId: {
              studentId: existing.studentId,
              supportType: 'ACADEMIC',
              academicYearId: existing.academicYearId,
            },
          },
          update: {
            reason: (params.verifiedConclusion || existing.title).slice(0, 500),
            notes: (params.supportPlanMeasures || existing.description).slice(0, 500),
          },
          create: {
            studentId: existing.studentId,
            supportType: 'ACADEMIC',
            sourceType: existing.assignedRole === 'GVCN' ? 'GVCN' : 'GVBM',
            status: 'ACTIVE',
            reason: (params.verifiedConclusion || existing.title).slice(0, 500),
            notes: (params.supportPlanMeasures || existing.description).slice(0, 500),
            academicYearId: existing.academicYearId,
            createdById: teacherRecord.id,
          },
        });
        linkedSupportTargetId = target.id;
      } catch {
        const existingTarget = await prisma.learningSupportTarget.findFirst({
          where: {
            academicYearId: existing.academicYearId,
            studentId: existing.studentId,
          },
        });
        if (existingTarget) linkedSupportTargetId = existingTarget.id;
      }
    }
  }

  const isOverdue =
    !['RESOLVED', 'COMPLETED'].includes(nextStatus) && now > new Date(existing.slaDueAt);

  const updated = await prisma.communicationCase.update({
    where: { id: existing.id },
    data: {
      status: nextStatus,
      assignedToUserId: nextAssigneeId,
      assignedToName: nextAssigneeName,
      assignedRole: nextAssignedRole,
      firstResponseAt,
      resolvedAt,
      completedAt,
      reopenedCount,
      isOverdue,
      isResolvedOnTime,
      supportPlanMeasures:
        params.supportPlanMeasures !== undefined
          ? params.supportPlanMeasures
          : existing.supportPlanMeasures,
      supportProgressNote:
        params.supportProgressNote !== undefined
          ? params.supportProgressNote
          : existing.supportProgressNote,
      supportOutcomeProposal:
        params.supportOutcomeProposal !== undefined
          ? params.supportOutcomeProposal
          : existing.supportOutcomeProposal,
      resolutionSummary:
        params.resolutionSummary !== undefined
          ? params.resolutionSummary
          : existing.resolutionSummary,
      verifiedConclusion:
        params.verifiedConclusion !== undefined
          ? params.verifiedConclusion
          : existing.verifiedConclusion,
      linkedSupportTargetId,
      parentConfirmedAt,
      reopenReason:
        params.reopenReason !== undefined ? params.reopenReason : existing.reopenReason,
    },
  });

  await prisma.communicationCaseHistory.create({
    data: {
      caseId: existing.id,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      fromStatus: existing.status,
      toStatus: nextStatus,
      fromAssigneeId: existing.assignedToUserId,
      toAssigneeId: nextAssigneeId,
      note:
        params.note ||
        params.reopenReason ||
        params.resolutionSummary ||
        params.supportProgressNote ||
        `Cập nhật trạng thái: ${existing.status} -> ${nextStatus}`,
    },
  });

  return updated;
}

/**
 * Phụ huynh đánh giá mức độ hài lòng CSAT (1-5) sau khi xử lý yêu cầu
 */
export async function submitCaseSatisfaction(params: {
  caseId: string;
  parentUserId: string;
  csatScore: number;
  timelinessScore?: number;
  clarityScore?: number;
  supportScore?: number;
  comment?: string;
  confirmCompleted?: boolean;
}) {
  await ensureCoordinationTables();

  if (params.csatScore < 1 || params.csatScore > 5) {
    throw new Error('Điểm đánh giá CSAT phải nằm trong thang từ 1 đến 5.');
  }

  const caseRecord = await prisma.communicationCase.findUnique({
    where: { id: params.caseId },
  });
  if (!caseRecord) {
    throw new Error('Không tìm thấy hồ sơ yêu cầu xử lý.');
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: params.parentUserId },
    include: {
      students: {
        where: { studentId: caseRecord.studentId },
      },
    },
  });

  if (!parent || parent.students.length === 0) {
    throw new Error('Phụ huynh chỉ được đánh giá CSAT cho yêu cầu thuộc học sinh của mình.');
  }

  const sat = await prisma.communicationSatisfaction.upsert({
    where: { caseId: caseRecord.id },
    update: {
      csatScore: Math.round(params.csatScore),
      timelinessScore: params.timelinessScore ? Math.round(params.timelinessScore) : null,
      clarityScore: params.clarityScore ? Math.round(params.clarityScore) : null,
      supportScore: params.supportScore ? Math.round(params.supportScore) : null,
      comment: params.comment?.trim() || null,
      isResolvedConfirmed: params.confirmCompleted !== false,
    },
    create: {
      caseId: caseRecord.id,
      threadId: caseRecord.threadId,
      parentId: parent.id,
      studentId: caseRecord.studentId,
      teacherId: caseRecord.teacherId,
      academicYearId: caseRecord.academicYearId,
      campusId: caseRecord.campusId,
      classId: caseRecord.classId,
      subjectId: caseRecord.subjectId,
      csatScore: Math.round(params.csatScore),
      timelinessScore: params.timelinessScore ? Math.round(params.timelinessScore) : null,
      clarityScore: params.clarityScore ? Math.round(params.clarityScore) : null,
      supportScore: params.supportScore ? Math.round(params.supportScore) : null,
      comment: params.comment?.trim() || null,
      isResolvedConfirmed: params.confirmCompleted !== false,
    },
  });

  if (params.confirmCompleted !== false && caseRecord.status !== 'COMPLETED') {
    await updateCoordinationCase({
      caseId: caseRecord.id,
      actorUserId: params.parentUserId,
      actorName: parent.parentName,
      actorRole: 'PARENT',
      action: 'CONFIRM_COMPLETED',
      note: `Phụ huynh xác nhận hoàn tất và đánh giá CSAT ${params.csatScore}/5 sao.`,
    });
  }

  return sat;
}

/**
 * Tạo kỳ khảo sát NPS và tự động đồng bộ phân công GVCN / GVBM
 */
export async function createAndSyncNpsSurveyPeriod(params: {
  actorUserId: string;
  actorRole: string;
  code?: string;
  title: string;
  description?: string;
  academicYearId: string;
  campusId?: string | null;
  semester: string;
  targetScope: 'ALL' | 'GVCN_ONLY' | 'GVBM_ONLY';
  minSampleSize?: number;
  startDate: Date;
  endDate: Date;
  publishImmediately?: boolean;
}) {
  await ensureCoordinationTables();

  const adminType = classifyAdminRole(params.actorRole);
  if (adminType !== 'QA_BUSINESS_ADMIN' && adminType !== 'TECHNICAL_ADMIN') {
    throw new Error('Chỉ Ban KT&ĐBCL hoặc Quản trị viên được phân quyền mới được tạo kỳ khảo sát NPS.');
  }

  const code =
    params.code?.trim() ||
    `NPS-${params.semester}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const period = await prisma.npsSurveyPeriod.create({
    data: {
      code,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      academicYearId: params.academicYearId,
      campusId: params.campusId || null,
      semester: params.semester,
      targetScope: params.targetScope,
      minSampleSize: Math.max(1, params.minSampleSize || MIN_NPS_SAMPLE_SIZE),
      status: params.publishImmediately ? 'PUBLISHED' : 'DRAFT',
      startDate: params.startDate,
      endDate: params.endDate,
      publishedAt: params.publishImmediately ? new Date() : null,
      createdByUserId: params.actorUserId,
    },
  });

  const syncResult = await syncAssignmentsForNpsPeriod(period.id);

  return {
    period,
    syncedAssignmentsCount: syncResult.syncedCount,
  };
}

/**
 * Đồng bộ danh sách phân công GVCN & GVBM hợp lệ vào kỳ khảo sát NPS
 */
export async function syncAssignmentsForNpsPeriod(periodId: string) {
  await ensureCoordinationTables();

  const period = await prisma.npsSurveyPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) {
    throw new Error('Không tìm thấy kỳ khảo sát NPS.');
  }

  const classes = await prisma.class.findMany({
    where: {
      academicYearId: period.academicYearId,
      ...(period.campusId ? { campusId: period.campusId } : {}),
    },
    include: {
      _count: {
        select: { students: true },
      },
    },
  });

  let syncedCount = 0;

  for (const cls of classes) {
    const { gvcnList, gvbmList } = await getValidTeachersForClass(
      cls.id,
      period.academicYearId
    );
    const expectedParents = cls._count?.students || 0;

    if (period.targetScope === 'ALL' || period.targetScope === 'GVCN_ONLY') {
      for (const gvcn of gvcnList) {
        const existing = await prisma.npsSurveyAssignment.findFirst({
          where: {
            periodId: period.id,
            classId: cls.id,
            teacherId: gvcn.teacherId,
            roleType: 'GVCN',
          },
        });
        if (!existing) {
          await prisma.npsSurveyAssignment.create({
            data: {
              periodId: period.id,
              academicYearId: period.academicYearId,
              campusId: cls.campusId,
              classId: cls.id,
              teacherId: gvcn.teacherId,
              subjectId: null,
              roleType: 'GVCN',
              sourceAssignmentId: gvcn.assignmentId,
              expectedParentCount: expectedParents,
            },
          });
          syncedCount++;
        }
      }
    }

    if (period.targetScope === 'ALL' || period.targetScope === 'GVBM_ONLY') {
      for (const gvbm of gvbmList) {
        const existing = await prisma.npsSurveyAssignment.findFirst({
          where: {
            periodId: period.id,
            classId: cls.id,
            teacherId: gvbm.teacherId,
            roleType: 'GVBM',
            subjectId: gvbm.subjectId,
          },
        });
        if (!existing) {
          await prisma.npsSurveyAssignment.create({
            data: {
              periodId: period.id,
              academicYearId: period.academicYearId,
              campusId: cls.campusId,
              classId: cls.id,
              teacherId: gvbm.teacherId,
              subjectId: gvbm.subjectId,
              roleType: 'GVBM',
              sourceAssignmentId: gvbm.assignmentId,
              expectedParentCount: expectedParents,
            },
          });
          syncedCount++;
        }
      }
    }
  }

  return { syncedCount };
}

/**
 * Phụ huynh gửi phản hồi khảo sát NPS (thang 0-10) + 5 tiêu chí bổ sung (thang 1-5)
 */
export async function submitParentNpsSurveyResponse(params: {
  periodId: string;
  assignmentId: string;
  parentUserId: string;
  studentId: string;
  npsScore: number;
  criteriaCommunication: number;
  criteriaTimeliness: number;
  criteriaClarity: number;
  criteriaSupport: number;
  criteriaCoordination: number;
  feedbackTopic?: string;
  comment?: string;
}) {
  await ensureCoordinationTables();

  if (params.npsScore < 0 || params.npsScore > 10 || !Number.isInteger(params.npsScore)) {
    throw new Error('Điểm NPS chính phải là số nguyên từ 0 đến 10.');
  }

  const criteriaVals = [
    params.criteriaCommunication,
    params.criteriaTimeliness,
    params.criteriaClarity,
    params.criteriaSupport,
    params.criteriaCoordination,
  ];
  for (const c of criteriaVals) {
    if (typeof c !== 'number' || c < 1 || c > 5) {
      throw new Error('Các tiêu chí đánh giá bổ sung phải nằm trong thang từ 1 đến 5.');
    }
  }

  const assignment = await prisma.npsSurveyAssignment.findUnique({
    where: { id: params.assignmentId },
    include: { period: true },
  });

  if (!assignment || assignment.periodId !== params.periodId) {
    throw new Error('Không tìm thấy phân công khảo sát hợp lệ.');
  }

  if (assignment.period.status !== 'PUBLISHED') {
    throw new Error('Kỳ khảo sát này hiện không trong trạng thái mở nhận phản hồi.');
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: params.parentUserId },
    include: {
      students: {
        where: { studentId: params.studentId },
        include: { student: true },
      },
    },
  });

  const linkedStudent = parent?.students?.[0]?.student;
  if (!parent || !linkedStudent || linkedStudent.classId !== assignment.classId) {
    throw new Error(
      'Phụ huynh chỉ được thực hiện khảo sát cho giáo viên giảng dạy lớp của con mình.'
    );
  }

  const npsGroup = classifyNpsScore(params.npsScore);
  const criteriaAverage = Number(
    (
      (params.criteriaCommunication +
        params.criteriaTimeliness +
        params.criteriaClarity +
        params.criteriaSupport +
        params.criteriaCoordination) /
      5
    ).toFixed(2)
  );

  const response = await prisma.npsSurveyResponse.upsert({
    where: {
      periodId_assignmentId_parentId_studentId: {
        periodId: assignment.periodId,
        assignmentId: assignment.id,
        parentId: parent.id,
        studentId: linkedStudent.id,
      },
    },
    update: {
      npsScore: params.npsScore,
      npsGroup,
      criteriaCommunication: params.criteriaCommunication,
      criteriaTimeliness: params.criteriaTimeliness,
      criteriaClarity: params.criteriaClarity,
      criteriaSupport: params.criteriaSupport,
      criteriaCoordination: params.criteriaCoordination,
      criteriaAverage,
      feedbackTopic: params.feedbackTopic || null,
      comment: params.comment?.trim() || null,
    },
    create: {
      periodId: assignment.periodId,
      assignmentId: assignment.id,
      academicYearId: assignment.academicYearId,
      campusId: assignment.campusId,
      classId: assignment.classId,
      teacherId: assignment.teacherId,
      subjectId: assignment.subjectId,
      roleType: assignment.roleType,
      parentId: parent.id,
      studentId: linkedStudent.id,
      npsScore: params.npsScore,
      npsGroup,
      criteriaCommunication: params.criteriaCommunication,
      criteriaTimeliness: params.criteriaTimeliness,
      criteriaClarity: params.criteriaClarity,
      criteriaSupport: params.criteriaSupport,
      criteriaCoordination: params.criteriaCoordination,
      criteriaAverage,
      feedbackTopic: params.feedbackTopic || null,
      comment: params.comment?.trim() || null,
    },
  });

  const totalCount = await prisma.npsSurveyResponse.count({
    where: { assignmentId: assignment.id },
  });

  await prisma.npsSurveyAssignment.update({
    where: { id: assignment.id },
    data: {
      responseCount: totalCount,
      isEligibleToPublish: totalCount >= assignment.period.minSampleSize,
    },
  });

  return {
    id: response.id,
    periodId: response.periodId,
    assignmentId: response.assignmentId,
    npsScore: response.npsScore,
    npsGroup: response.npsGroup,
    criteriaAverage: response.criteriaAverage,
  };
}

/**
 * Truy vấn & Tổng hợp NPS từ toàn bộ phản hồi gốc hợp lệ
 */
export async function getNpsAnalyticsSummary(filters: {
  academicYearId?: string;
  periodId?: string;
  campusId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  roleType?: 'GVCN' | 'GVBM';
  viewerRole: string;
}) {
  await ensureCoordinationTables();

  const whereClause: Record<string, unknown> = {};
  if (filters.academicYearId) whereClause.academicYearId = filters.academicYearId;
  if (filters.periodId) whereClause.periodId = filters.periodId;
  if (filters.campusId) whereClause.campusId = filters.campusId;
  if (filters.classId) whereClause.classId = filters.classId;
  if (filters.subjectId) whereClause.subjectId = filters.subjectId;
  if (filters.teacherId) whereClause.teacherId = filters.teacherId;
  if (filters.roleType) whereClause.roleType = filters.roleType;

  let minSampleSize = MIN_NPS_SAMPLE_SIZE;
  if (filters.periodId) {
    const p = await prisma.npsSurveyPeriod.findUnique({ where: { id: filters.periodId } });
    if (p) minSampleSize = p.minSampleSize;
  }

  const rawResponses = await prisma.npsSurveyResponse.findMany({
    where: whereClause,
    select: {
      id: true,
      periodId: true,
      assignmentId: true,
      academicYearId: true,
      campusId: true,
      classId: true,
      teacherId: true,
      subjectId: true,
      roleType: true,
      npsScore: true,
      npsGroup: true,
      criteriaCommunication: true,
      criteriaTimeliness: true,
      criteriaClarity: true,
      criteriaSupport: true,
      criteriaCoordination: true,
      criteriaAverage: true,
      feedbackTopic: true,
      comment: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const overall = calculateExactNpsFromResponses(rawResponses, minSampleSize);
  const gvcnResponses = rawResponses.filter((r) => r.roleType === 'GVCN');
  const gvbmResponses = rawResponses.filter((r) => r.roleType === 'GVBM');

  const gvcnMetrics = calculateExactNpsFromResponses(gvcnResponses, minSampleSize);
  const gvbmMetrics = calculateExactNpsFromResponses(gvbmResponses, minSampleSize);

  const teacherIds = Array.from(new Set(rawResponses.map((r) => r.teacherId)));
  const classIds = Array.from(new Set(rawResponses.map((r) => r.classId)));
  const subjectIds = Array.from(
    new Set(rawResponses.map((r) => r.subjectId).filter((s): s is string => Boolean(s)))
  );

  const [teachers, classes, subjects] = await Promise.all([
    teacherIds.length > 0
      ? prisma.teacher.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, teacherCode: true, teacherName: true, campusId: true },
        })
      : Promise.resolve([]),
    classIds.length > 0
      ? prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, className: true, grade: true },
        })
      : Promise.resolve([]),
    subjectIds.length > 0
      ? prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, subjectName: true },
        })
      : Promise.resolve([]),
  ]);

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const byTeacherMap = new Map<string, typeof rawResponses>();
  for (const r of rawResponses) {
    const key = `${r.teacherId}__${r.roleType}`;
    const list = byTeacherMap.get(key) || [];
    list.push(r);
    byTeacherMap.set(key, list);
  }

  const byTeacher = Array.from(byTeacherMap.entries()).map(([key, list]) => {
    const [teacherId, roleType] = key.split('__');
    const tInfo = teacherMap.get(teacherId);
    const calc = calculateExactNpsFromResponses(list, minSampleSize);
    const distinctClasses = Array.from(
      new Set(list.map((i) => classMap.get(i.classId)?.className || i.classId))
    );
    const distinctSubjects = Array.from(
      new Set(
        list
          .map((i) =>
            i.subjectId ? subjectMap.get(i.subjectId)?.subjectName || i.subjectId : null
          )
          .filter(Boolean)
      )
    );

    return {
      teacherId,
      teacherCode: tInfo?.teacherCode || '',
      teacherName: tInfo?.teacherName || 'Giáo viên',
      roleType,
      classes: distinctClasses,
      subjects: distinctSubjects,
      ...calc,
    };
  });

  const topicCounts = new Map<string, number>();
  for (const r of rawResponses) {
    if (r.feedbackTopic) {
      topicCounts.set(r.feedbackTopic, (topicCounts.get(r.feedbackTopic) || 0) + 1);
    }
  }

  const anonymizedComments = overall.isEligibleToPublish
    ? rawResponses
        .filter((r) => r.comment && r.comment.trim().length > 0)
        .slice(0, 30)
        .map((r) => ({
          id: r.id,
          roleType: r.roleType,
          subjectName: r.subjectId
            ? subjectMap.get(r.subjectId)?.subjectName || null
            : 'Chủ nhiệm',
          npsGroup: r.npsGroup,
          criteriaAverage: r.criteriaAverage,
          feedbackTopic: r.feedbackTopic,
          comment: r.comment,
        }))
    : [];

  return {
    minSampleSize,
    overall,
    gvcnMetrics,
    gvbmMetrics,
    byTeacher,
    improvementTopics: Array.from(topicCounts.entries()).map(([topic, count]) => ({
      topic,
      count,
    })),
    anonymizedComments,
    governanceNotice:
      'Kết quả NPS được ẩn danh hoàn toàn danh tính PHHS và không sử dụng làm căn cứ duy nhất để xếp loại giáo viên.',
  };
}

/**
 * Tính toán Dashboard KPI dữ liệu thật cho 4 vai trò (A1, B1, C1, D1)
 */
export async function getCoordinationDashboardData(params: {
  userId: string;
  userRole: string;
  viewMode?: 'GVCN' | 'GVBM' | 'PARENT' | 'ADMIN_QA';
  academicYearId?: string;
  periodId?: string;
  campusId?: string;
  level?: string;
  programType?: string;
  grade?: string;
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  teacherId?: string;
  studentId?: string;
  status?: string;
  topic?: string;
  fromDate?: string;
  toDate?: string;
}) {
  await ensureCoordinationTables();

  const activeAy =
    (params.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: params.academicYearId } })
      : null) ||
    (await prisma.academicYear.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    })) ||
    (await prisma.academicYear.findFirst({ orderBy: { startDate: 'desc' } }));

  const effectiveAyId = params.academicYearId || activeAy?.id || undefined;
  const now = new Date();

  let filteredClassIds: string[] | undefined = undefined;
  if (params.classId) {
    filteredClassIds = [params.classId];
  } else if (params.level || params.programType || params.grade || params.campusId) {
    const matchingClasses = await prisma.class.findMany({
      where: {
        ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
        ...(params.campusId ? { campusId: params.campusId } : {}),
        ...(params.level ? { level: params.level } : {}),
        ...(params.programType ? { educationSystem: params.programType } : {}),
        ...(params.grade ? { grade: params.grade } : {}),
      },
      select: { id: true },
    });
    filteredClassIds = matchingClasses.map((c) => c.id);
  }

  let filteredTeacherIds: string[] | undefined = undefined;
  if (params.teacherId) {
    filteredTeacherIds = [params.teacherId];
  } else if (params.departmentId) {
    const deptTeachers = await prisma.teacher.findMany({
      where: { departmentId: params.departmentId },
      select: { id: true },
    });
    filteredTeacherIds = deptTeachers.map((t) => t.id);
  }

  await prisma.communicationCase.updateMany({
    where: {
      status: { notIn: ['RESOLVED', 'COMPLETED'] },
      slaDueAt: { lt: now },
      isOverdue: false,
    },
    data: { isOverdue: true },
  });

  const dateFilter =
    params.fromDate || params.toDate
      ? {
          ...(params.fromDate ? { gte: new Date(params.fromDate) } : {}),
          ...(params.toDate ? { lte: new Date(params.toDate) } : {}),
        }
      : undefined;

  const threadWhere: Record<string, unknown> = {
    ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
    ...(params.campusId ? { campusId: params.campusId } : {}),
    ...(filteredClassIds ? { classId: { in: filteredClassIds } } : {}),
    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    ...(filteredTeacherIds ? { teacherId: { in: filteredTeacherIds } } : {}),
    ...(params.studentId ? { studentId: params.studentId } : {}),
    ...(params.topic ? { topic: params.topic } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const caseWhere: Record<string, unknown> = {
    ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
    ...(params.campusId ? { campusId: params.campusId } : {}),
    ...(filteredClassIds ? { classId: { in: filteredClassIds } } : {}),
    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    ...(filteredTeacherIds ? { teacherId: { in: filteredTeacherIds } } : {}),
    ...(params.studentId ? { studentId: params.studentId } : {}),
    ...(params.topic ? { category: params.topic } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  if (params.userRole === 'PARENT' || params.viewMode === 'PARENT') {
    const parent = await prisma.parent.findUnique({ where: { userId: params.userId } });
    threadWhere.parentId = parent?.id || '__NONE__';
    caseWhere.parentId = parent?.id || '__NONE__';
  } else if (params.viewMode === 'GVCN') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: params.userId } });
    if (teacher) {
      const hClasses = await prisma.class.findMany({
        where: {
          homeroomTeacherId: teacher.id,
          ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
        },
        select: { id: true },
      });
      const hLinks = await prisma.teacherClassAssignment.findMany({
        where: {
          teacherId: teacher.id,
          roleInClass: { in: ['GVCN', 'HOMEROOM', 'CHU_NHIEM'] },
        },
        select: { classId: true },
      });
      const allowedClassIds = Array.from(
        new Set([...hClasses.map((c) => c.id), ...hLinks.map((l) => l.classId)])
      );
      const effectiveClasses = params.classId
        ? allowedClassIds.filter((id) => id === params.classId)
        : allowedClassIds;

      threadWhere.classId = { in: effectiveClasses };
      threadWhere.OR = [
        { teacherId: teacher.id },
        { visibility: { in: ['SHARED_WITH_GVCN', 'ESCALATED_QA'] } },
      ];
      caseWhere.classId = { in: effectiveClasses };
    }
  } else if (params.viewMode === 'GVBM') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: params.userId } });
    threadWhere.teacherId = teacher?.id || '__NONE__';
    threadWhere.threadType = { in: ['PARENT_GVBM', 'GVCN_GVBM_COORD'] };
    caseWhere.OR = [
      { teacherId: teacher?.id || '__NONE__' },
      { assignedToUserId: params.userId },
    ];
  }

  const [threads, cases, satisfactions, npsSummary, improvementActions] = await Promise.all([
    prisma.communicationThread.findMany({
      where: threadWhere,
      orderBy: { lastMessageAt: 'desc' },
    }),
    prisma.communicationCase.findMany({
      where: caseWhere,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.communicationSatisfaction.findMany({
      where: {
        ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
        ...(params.campusId ? { campusId: params.campusId } : {}),
        ...(filteredClassIds ? { classId: { in: filteredClassIds } } : {}),
        ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        ...(filteredTeacherIds ? { teacherId: { in: filteredTeacherIds } } : {}),
      },
    }),
    getNpsAnalyticsSummary({
      academicYearId: effectiveAyId,
      periodId: params.periodId,
      campusId: params.campusId,
      classId: params.classId,
      subjectId: params.subjectId,
      teacherId:
        params.viewMode === 'GVCN' || params.viewMode === 'GVBM'
          ? (await prisma.teacher.findUnique({ where: { userId: params.userId } }))?.id
          : params.teacherId,
      roleType:
        params.viewMode === 'GVCN'
          ? 'GVCN'
          : params.viewMode === 'GVBM'
            ? 'GVBM'
            : undefined,
      viewerRole: params.userRole,
    }),
    prisma.qualityImprovementAction.findMany({
      where: {
        ...(effectiveAyId ? { academicYearId: effectiveAyId } : {}),
        ...(params.campusId ? { campusId: params.campusId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalThreads = threads.length;
  const unreadMessagesCount =
    params.userRole === 'PARENT' || params.viewMode === 'PARENT'
      ? threads.reduce((acc, t) => acc + (t.unreadCountParent || 0), 0)
      : threads.reduce((acc, t) => acc + (t.unreadCountTeacher || 0), 0);

  const totalCases = cases.length;
  const pendingCasesCount = cases.filter((c) =>
    ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_INFO', 'REOPENED'].includes(c.status)
  ).length;
  const overdueCasesCount = cases.filter(
    (c) =>
      !['RESOLVED', 'COMPLETED'].includes(c.status) &&
      (c.isOverdue || new Date(c.slaDueAt) < now)
  ).length;
  const completedCasesCount = cases.filter((c) =>
    ['RESOLVED', 'COMPLETED'].includes(c.status)
  ).length;
  const reopenedCasesCount = cases.filter((c) => c.reopenedCount > 0 || c.status === 'REOPENED').length;

  const respondedThreads = threads.filter((t) => t.firstRespondedAt !== null);
  const onTimeThreads = respondedThreads.filter((t) => t.isOnTime === true);
  const resolvedCasesWithSla = cases.filter((c) => c.isResolvedOnTime !== null);
  const onTimeCases = resolvedCasesWithSla.filter((c) => c.isResolvedOnTime === true);

  const totalEvaluatedSla = respondedThreads.length + resolvedCasesWithSla.length;
  const totalOnTimeSla = onTimeThreads.length + onTimeCases.length;
  const onTimeResponseRate =
    totalEvaluatedSla > 0
      ? Number(((totalOnTimeSla / totalEvaluatedSla) * 100).toFixed(1))
      : null;

  const responseHoursList: number[] = [];
  for (const t of respondedThreads) {
    if (t.firstRespondedAt) {
      responseHoursList.push(
        calculateBusinessHoursElapsed(new Date(t.createdAt), new Date(t.firstRespondedAt))
      );
    }
  }
  responseHoursList.sort((a, b) => a - b);
  let medianResponseBusinessHours: number | null = null;
  if (responseHoursList.length > 0) {
    const mid = Math.floor(responseHoursList.length / 2);
    medianResponseBusinessHours =
      responseHoursList.length % 2 !== 0
        ? responseHoursList[mid]
        : Number(((responseHoursList[mid - 1] + responseHoursList[mid]) / 2).toFixed(2));
  }

  const completionRate =
    totalCases > 0 ? Number(((completedCasesCount / totalCases) * 100).toFixed(1)) : null;

  const reopenRate =
    totalCases > 0 ? Number(((reopenedCasesCount / totalCases) * 100).toFixed(1)) : null;

  const csatAverage =
    satisfactions.length > 0
      ? Number(
          (
            satisfactions.reduce((acc, s) => acc + s.csatScore, 0) / satisfactions.length
          ).toFixed(2)
        )
      : null;

  const topicFrequency = new Map<string, number>();
  for (const c of cases) {
    topicFrequency.set(c.category, (topicFrequency.get(c.category) || 0) + 1);
  }
  const recurringIssues = Array.from(topicFrequency.entries())
    .map(([code, count]) => ({
      code,
      label: COORDINATION_TOPICS.find((t) => t.code === code)?.label || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const hasData =
    totalThreads > 0 ||
    totalCases > 0 ||
    satisfactions.length > 0 ||
    npsSummary.overall.totalResponses > 0 ||
    improvementActions.length > 0;

  return {
    hasData,
    kpis: {
      totalThreads,
      unreadMessagesCount,
      pendingCasesCount,
      overdueCasesCount,
      completedCasesCount,
      onTimeResponseRate,
      medianResponseBusinessHours,
      completionRate,
      reopenRate,
      csatAverage,
      csatCount: satisfactions.length,
      npsGvcn: npsSummary.gvcnMetrics.npsScore,
      npsGvcnEligible: npsSummary.gvcnMetrics.isEligibleToPublish,
      npsGvcnCount: npsSummary.gvcnMetrics.totalResponses,
      npsGvbm: npsSummary.gvbmMetrics.npsScore,
      npsGvbmEligible: npsSummary.gvbmMetrics.isEligibleToPublish,
      npsGvbmCount: npsSummary.gvbmMetrics.totalResponses,
      npsOverall: npsSummary.overall.npsScore,
      npsOverallEligible: npsSummary.overall.isEligibleToPublish,
    },
    recurringIssues,
    npsSummary,
    improvementActionsCount: improvementActions.length,
  };
}

/**
 * Tạo hoặc cập nhật Nhiệm vụ Cải tiến Chất lượng (QualityImprovementAction - D5)
 */
export async function createOrUpdateImprovementAction(params: {
  id?: string;
  actorUserId: string;
  actorRole: string;
  academicYearId: string;
  campusId: string;
  departmentId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  sourceType?: string;
  title: string;
  content: string;
  verifiedRootCause: string;
  actionPlan: string;
  assigneeUserId: string;
  assigneeName?: string;
  dueDate: Date;
  evidenceUrl?: string;
  evidenceNote?: string;
  status?: string;
  verificationResult?: string;
  postImprovementEffectiveness?: string;
  recurrenceCount?: number;
  linkedPeriodId?: string | null;
}) {
  await ensureCoordinationTables();

  if (params.id) {
    const existing = await prisma.qualityImprovementAction.findUnique({
      where: { id: params.id },
    });
    if (!existing) throw new Error('Không tìm thấy nhiệm vụ cải tiến.');

    const isVerifying =
      params.status === 'VERIFIED_EFFECTIVE' || Boolean(params.verificationResult);

    const updated = await prisma.qualityImprovementAction.update({
      where: { id: params.id },
      data: {
        title: params.title || existing.title,
        content: params.content || existing.content,
        verifiedRootCause: params.verifiedRootCause || existing.verifiedRootCause,
        actionPlan: params.actionPlan || existing.actionPlan,
        evidenceUrl:
          params.evidenceUrl !== undefined ? params.evidenceUrl : existing.evidenceUrl,
        evidenceNote:
          params.evidenceNote !== undefined ? params.evidenceNote : existing.evidenceNote,
        status: params.status || existing.status,
        verificationResult:
          params.verificationResult !== undefined
            ? params.verificationResult
            : existing.verificationResult,
        verifiedByUserId: isVerifying ? params.actorUserId : existing.verifiedByUserId,
        verifiedAt: isVerifying ? new Date() : existing.verifiedAt,
        postImprovementEffectiveness:
          params.postImprovementEffectiveness !== undefined
            ? params.postImprovementEffectiveness
            : existing.postImprovementEffectiveness,
        recurrenceCount:
          params.recurrenceCount !== undefined
            ? params.recurrenceCount
            : existing.recurrenceCount,
      },
    });
    return updated;
  }

  const issueCode = `QIA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const created = await prisma.qualityImprovementAction.create({
    data: {
      issueCode,
      academicYearId: params.academicYearId,
      campusId: params.campusId,
      departmentId: params.departmentId || null,
      classId: params.classId || null,
      subjectId: params.subjectId || null,
      teacherId: params.teacherId || null,
      sourceType: params.sourceType || 'QA_AUDIT',
      title: params.title.trim(),
      content: params.content.trim(),
      verifiedRootCause: params.verifiedRootCause.trim(),
      actionPlan: params.actionPlan.trim(),
      assigneeUserId: params.assigneeUserId,
      assigneeName: params.assigneeName || null,
      assignedByUserId: params.actorUserId,
      dueDate: params.dueDate,
      status: 'OPEN',
      linkedPeriodId: params.linkedPeriodId || null,
      isHumanApproved: true,
    },
  });

  if (params.assigneeUserId && params.assigneeUserId !== params.actorUserId) {
    await dispatchCoordinationNotification({
      recipientUserId: params.assigneeUserId,
      notificationType: 'IMPROVEMENT_ASSIGNED',
      title: `Nhiệm vụ cải tiến mới: ${created.issueCode}`,
      body: `Bạn được phân công thực hiện nhiệm vụ cải tiến: "${created.title}".`,
      linkUrl: '/teacher/phoi-hop-giao-duc',
    });
  }

  return created;
}

/**
 * Gợi ý phân tích chủ đề & hành động cải tiến dựa trên dữ liệu đã xác thực (Giai đoạn 4 - Human-in-the-loop)
 */
export async function generateVerifiedImprovementSuggestions(params: {
  academicYearId: string;
  campusId?: string;
}) {
  await ensureCoordinationTables();

  const [cases, lowSatList] = await Promise.all([
    prisma.communicationCase.findMany({
      where: {
        academicYearId: params.academicYearId,
        ...(params.campusId ? { campusId: params.campusId } : {}),
      },
    }),
    prisma.communicationSatisfaction.findMany({
      where: {
        academicYearId: params.academicYearId,
        ...(params.campusId ? { campusId: params.campusId } : {}),
        csatScore: { lte: 3 },
      },
    }),
  ]);

  const suggestions: Array<{
    suggestedCode: string;
    category: string;
    categoryLabel: string;
    evidenceCount: number;
    overdueCount: number;
    reopenedCount: number;
    suggestedTitle: string;
    suggestedRootCauseHypothesis: string;
    suggestedActionPlan: string;
    requiresHumanApproval: true;
  }> = [];

  const byCategory = new Map<string, typeof cases>();
  for (const c of cases) {
    const list = byCategory.get(c.category) || [];
    list.push(c);
    byCategory.set(c.category, list);
  }

  for (const [cat, list] of byCategory.entries()) {
    const overdueCount = list.filter((c) => c.isOverdue).length;
    const reopenedCount = list.filter((c) => c.reopenedCount > 0).length;
    if (list.length >= 2 || overdueCount > 0 || reopenedCount > 0) {
      const topicDef = COORDINATION_TOPICS.find((t) => t.code === cat);
      const label = topicDef?.label || cat;
      suggestions.push({
        suggestedCode: `SUG-${cat}`,
        category: cat,
        categoryLabel: label,
        evidenceCount: list.length,
        overdueCount,
        reopenedCount,
        suggestedTitle: `Cải tiến quy trình phản hồi & hỗ trợ nhóm chủ đề "${label}"`,
        suggestedRootCauseHypothesis:
          overdueCount > 0
            ? `Ghi nhận ${overdueCount}/${list.length} yêu cầu quá hạn SLA hành chính hoặc cần phối hợp liên bộ môn.`
            : `Phát sinh lặp lại ${list.length} yêu cầu thuộc nhóm "${label}" (${reopenedCount} lần mở lại).`,
        suggestedActionPlan:
          cat === 'BAI_TAP_KIEM_TRA' || cat === 'KET_QUA_HOC_TAP'
            ? 'Tổ chuyên môn rà soát lịch thông báo bài tập/kiểm tra và chuẩn hóa phản hồi tiến độ học tập hàng tuần.'
            : 'GVCN và GVBM thống nhất đầu mối phản hồi sớm trong 8 giờ làm việc đầu tiên, thiết lập kế hoạch hỗ trợ học sinh cá nhân hóa.',
        requiresHumanApproval: true,
      });
    }
  }

  if (lowSatList.length > 0 && suggestions.length === 0) {
    suggestions.push({
      suggestedCode: 'SUG-CSAT-FOLLOWUP',
      category: 'PHOI_HOP_GIAO_DUC',
      categoryLabel: 'Chất lượng phản hồi sau xử lý (CSAT)',
      evidenceCount: lowSatList.length,
      overdueCount: 0,
      reopenedCount: 0,
      suggestedTitle: 'Nâng cao chất lượng giải quyết yêu cầu có điểm CSAT <= 3 sao',
      suggestedRootCauseHypothesis: `Có ${lowSatList.length} phản hồi CSAT đạt mức <= 3/5 sau khi đóng yêu cầu.`,
      suggestedActionPlan:
        'Ban KT&ĐBCL cùng GVCN rà soát lại bước xác minh kết quả trước khi chuyển trạng thái Hoàn tất.',
      requiresHumanApproval: true,
    });
  }

  return suggestions;
}
