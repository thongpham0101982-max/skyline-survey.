import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStudentVerifyUrl } from '@/lib/student/lifelong-qr';
import { sortVietnameseStudents } from '@/lib/vietnameseSort';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type AccessScope = 'ADMIN_KTDBCL' | 'CAMPUS_MANAGER' | 'GVCN' | 'DENIED';

interface ResolvedAccess {
  scope: AccessScope;
  userId: string;
  role: string;
  teacherId?: string;
  homeroomClassName?: string | null;
  allowedCampusIds: string[];
}

/**
 * Xác định phạm vi phân quyền theo đúng quy định Mục 8:
 * - Ban KT&ĐBCL / Quản trị: Toàn hệ thống + quản lý mẫu & cấu hình QR
 * - Quản lý cơ sở: Xem và in bảng tên các lớp thuộc cơ sở được phân quyền
 * - GVCN: Chỉ được xem và in bảng tên của học sinh thuộc lớp mình phụ trách chủ nhiệm
 */
async function resolveUserAccess(session: any): Promise<ResolvedAccess> {
  const userId = String(session?.user?.id || '');
  const userEmail = String(session?.user?.email || '');
  const rawRole = String(session?.user?.role || '').toUpperCase().trim();

  if (!userId) {
    return { scope: 'DENIED', userId: '', role: rawRole, allowedCampusIds: [] };
  }

  const isAdminOrKtdbcl = [
    'ADMIN',
    'SUPER_ADMIN',
    'SUPERADMIN',
    'ADMINISTRATOR',
    'KT_DBCL',
    'KTDBCL',
    'BAN_DHCM',
  ].some((r) => rawRole === r || rawRole.includes(r));

  if (isAdminOrKtdbcl) {
    return {
      scope: 'ADMIN_KTDBCL',
      userId,
      role: rawRole,
      allowedCampusIds: [],
    };
  }

  const isCampusManager = [
    'GDCS',
    'GĐCS',
    'GD_CS',
    'GĐ_CS',
    'GIAO_VU_CS',
    'GIAO_VU',
    'BGH',
    'BGH_CS',
    'BGH_MN',
    'BGH MN',
  ].some((r) => rawRole === r || rawRole.includes(r));

  // Tìm thông tin Teacher và phân công cơ sở nếu có
  const [teacher, campusAssignments, managedCampuses] = await Promise.all([
    prisma.teacher
      .findFirst({
        where: {
          OR: [
            { userId },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        select: {
          id: true,
          campusId: true,
          homeroomClass: true,
          position: true,
        },
      })
      .catch(() => null),
    prisma.userCampusAssignment
      .findMany({
        where: { userId },
        select: { campusId: true },
      })
      .catch(() => []),
    prisma.campus
      .findMany({
        where: { managerId: userId },
        select: { id: true },
      })
      .catch(() => []),
  ]);

  const campusIdSet = new Set<string>();
  campusAssignments.forEach((ca) => {
    if (ca.campusId) campusIdSet.add(ca.campusId);
  });
  managedCampuses.forEach((mc) => {
    if (mc.id) campusIdSet.add(mc.id);
  });
  if (teacher?.campusId) {
    campusIdSet.add(teacher.campusId);
  }

  if (isCampusManager || managedCampuses.length > 0) {
    return {
      scope: 'CAMPUS_MANAGER',
      userId,
      role: rawRole,
      teacherId: teacher?.id,
      homeroomClassName: teacher?.homeroomClass,
      allowedCampusIds: Array.from(campusIdSet),
    };
  }

  if (teacher) {
    return {
      scope: 'GVCN',
      userId,
      role: rawRole,
      teacherId: teacher.id,
      homeroomClassName: teacher.homeroomClass,
      allowedCampusIds: teacher.campusId ? [teacher.campusId] : [],
    };
  }

  return { scope: 'DENIED', userId, role: rawRole, allowedCampusIds: [] };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const access = await resolveUserAccess(session);
    if (access.scope === 'DENIED') {
      return NextResponse.json(
        { error: 'Tài khoản không có quyền truy cập chức năng In bảng tên Họp PHHS.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedYearId = searchParams.get('academicYearId') || '';
    const requestedCampusId = searchParams.get('campusId') || '';
    const requestedClassId = searchParams.get('classId') || '';

    // 1. Lấy danh sách Năm học kèm Chủ đề năm học (theme / yearThemes)
    const rawAcademicYears = await prisma.academicYear.findMany({
      where: { isOff: false },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        theme: true,
        yearThemes: true,
      },
    });

    const academicYears = rawAcademicYears.map((ay) => {
      let resolvedTheme = (ay.theme || '').trim();
      let parsedThemes: Array<{ id?: string; title?: string; typeName?: string; isPrimary?: boolean }> = [];
      if (ay.yearThemes) {
        try {
          const arr = JSON.parse(ay.yearThemes);
          if (Array.isArray(arr)) {
            parsedThemes = arr;
            if (!resolvedTheme) {
              const primary = arr.find((t: any) => t?.isPrimary) || arr[0];
              if (primary?.title) resolvedTheme = String(primary.title).trim();
            }
          }
        } catch {}
      }
      if (!resolvedTheme) {
        resolvedTheme = 'Vững nội lực - Hướng tương lai';
      }
      return {
        ...ay,
        theme: resolvedTheme,
        parsedThemes,
      };
    });

    let activeYearId = requestedYearId;
    if (!activeYearId || !academicYears.some((y) => y.id === activeYearId)) {
      const currentActive =
        academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
      activeYearId = currentActive?.id || '';
    }

    // 2. Lấy danh sách Lớp học theo đúng phạm vi phân quyền
    let classWhere: any = {
      status: 'ACTIVE',
      ...(activeYearId ? { academicYearId: activeYearId } : {}),
    };

    if (access.scope === 'GVCN') {
      const gvcnClassAssignments = access.teacherId
        ? await prisma.teacherClassAssignment
            .findMany({
              where: {
                teacherId: access.teacherId,
                status: 'ACTIVE',
                OR: [{ roleInClass: 'GVCN' }, { roleInClass: 'HOMEROOM' }],
              },
              select: { classId: true },
            })
            .catch(() => [])
        : [];
      const assignedIds = gvcnClassAssignments.map((a) => a.classId);

      const orConditions: any[] = [];
      if (access.teacherId) {
        orConditions.push({ homeroomTeacherId: access.teacherId });
        orConditions.push({ homeroomTeacherId: { contains: access.teacherId } });
      }
      if (assignedIds.length > 0) {
        orConditions.push({ id: { in: assignedIds } });
      }
      if (access.homeroomClassName) {
        orConditions.push({ className: access.homeroomClassName });
      }

      if (orConditions.length === 0) {
        return NextResponse.json({
          success: true,
          accessScope: access.scope,
          canManageConfig: false,
          academicYears,
          selectedAcademicYearId: activeYearId,
          campuses: [],
          classes: [],
          selectedClass: null,
          students: [],
        });
      }
      classWhere.OR = orConditions;
    } else if (access.scope === 'CAMPUS_MANAGER') {
      if (access.allowedCampusIds.length > 0) {
        classWhere.campusId =
          requestedCampusId && access.allowedCampusIds.includes(requestedCampusId)
            ? requestedCampusId
            : { in: access.allowedCampusIds };
      }
    } else if (access.scope === 'ADMIN_KTDBCL') {
      if (requestedCampusId && requestedCampusId !== 'ALL') {
        classWhere.campusId = requestedCampusId;
      }
    }

    let classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
        academicYear: { select: { id: true, name: true } },
        _count: {
          select: {
            students: {
              where: {
                status: { not: 'TRANSFERRED_OUT' },
                NOT: { studentCode: { startsWith: '2' } },
              },
            },
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { className: 'asc' }],
    });

    // Fallback nếu GVCN có lớp ở năm học khác khi năm hiện tại chưa gán
    if (classes.length === 0 && access.scope === 'GVCN' && !requestedYearId) {
      const fallbackWhere = { ...classWhere };
      delete fallbackWhere.academicYearId;
      classes = await prisma.class.findMany({
        where: fallbackWhere,
        include: {
          campus: { select: { id: true, campusCode: true, campusName: true } },
          academicYear: { select: { id: true, name: true } },
          _count: {
            select: {
              students: {
                where: {
                  status: { not: 'TRANSFERRED_OUT' },
                  NOT: { studentCode: { startsWith: '2' } },
                },
              },
            },
          },
        },
        orderBy: [{ academicYearId: 'desc' }, { className: 'asc' }],
      });
      if (classes.length > 0) {
        activeYearId = classes[0].academicYearId;
      }
    }

    // 3. Tổng hợp danh sách Cơ sở được phép xem
    let campuses: Array<{ id: string; campusCode: string; campusName: string }> = [];
    if (access.scope === 'ADMIN_KTDBCL') {
      campuses = await prisma.campus.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, campusCode: true, campusName: true },
        orderBy: { campusCode: 'asc' },
      });
    } else if (access.scope === 'CAMPUS_MANAGER') {
      campuses = await prisma.campus.findMany({
        where:
          access.allowedCampusIds.length > 0
            ? { id: { in: access.allowedCampusIds } }
            : { status: 'ACTIVE' },
        select: { id: true, campusCode: true, campusName: true },
        orderBy: { campusCode: 'asc' },
      });
    } else {
      const map = new Map<string, { id: string; campusCode: string; campusName: string }>();
      classes.forEach((c) => {
        if (c.campus) map.set(c.campus.id, c.campus);
      });
      campuses = Array.from(map.values());
    }

    // 4. Chọn lớp mục tiêu
    const selectedClass =
      classes.find((c) => c.id === requestedClassId) || classes[0] || null;

    if (!selectedClass) {
      return NextResponse.json({
        success: true,
        accessScope: access.scope,
        canManageConfig: access.scope === 'ADMIN_KTDBCL',
        academicYears,
        selectedAcademicYearId: activeYearId,
        campuses,
        classes: [],
        selectedClass: null,
        students: [],
      });
    }

    // 5. Lấy danh sách học sinh hiện hành của lớp đã chọn (không bao gồm HS đã chuyển đi)
    const rawStudents = await prisma.student.findMany({
      where: {
        classId: selectedClass.id,
        status: { not: 'TRANSFERRED_OUT' },
        NOT: {
          studentCode: { startsWith: '2' },
        },
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        englishName: true,
        gender: true,
        status: true,
        classId: true,
        campusId: true,
        academicYearId: true,
      },
    });

    const sortedStudents = sortVietnameseStudents(
      rawStudents,
      (s) => s.studentName
    );

    // 6. Tra cứu cấu hình trạng thái QR và trạng thái Ảnh trên Cổng ảnh học sinh (StudentPhoto)
    const studentCodes = sortedStudents.map((s) => s.studentCode).filter(Boolean);
    const studentIds = sortedStudents.map((s) => s.id).filter(Boolean);

    // Tìm tất cả bản ghi Student cùng mã học sinh (để đồng bộ ảnh xuyên suốt các năm học giống /api/student-photos/[studentId])
    const allMatchingStudentsByCode =
      studentCodes.length > 0
        ? await prisma.student
            .findMany({
              where: { studentCode: { in: studentCodes } },
              select: { id: true, studentCode: true },
            })
            .catch(() => [])
        : [];

    const allCandidateStudentIds = Array.from(
      new Set([
        ...studentIds,
        ...allMatchingStudentsByCode.map((m) => m.id),
      ])
    );

    const [qrConfigs, existingPhotos] = await Promise.all([
      studentCodes.length > 0
        ? prisma.assessmentConfig
            .findMany({
              where: {
                categoryType: 'STUDENT_NAMEPLATE_QR',
                code: { in: studentCodes },
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      allCandidateStudentIds.length > 0
        ? prisma.studentPhoto
            .findMany({
              where: { studentId: { in: allCandidateStudentIds } },
              select: { studentId: true, updatedAt: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const photoStudentIdSet = new Set(existingPhotos.map((p) => p.studentId));
    const codeHasPhotoSet = new Set<string>();
    allMatchingStudentsByCode.forEach((m) => {
      if (photoStudentIdSet.has(m.id) && m.studentCode) {
        codeHasPhotoSet.add(m.studentCode);
      }
    });

    const qrConfigMap = new Map<
      string,
      { status: 'ACTIVE' | 'DISABLED'; token: string | null }
    >();
    qrConfigs.forEach((cfg) => {
      let token: string | null = null;
      try {
        const parsed = JSON.parse(cfg.name || '{}');
        token = parsed.token || null;
      } catch {
        token = null;
      }
      qrConfigMap.set(cfg.code, {
        status: cfg.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
        token,
      });
    });

    // 7. Xây dựng danh sách học sinh trả về kèm Verify URL an toàn & Ảnh từ Cổng ảnh học sinh
    const activeAcademicYearObj =
      academicYears.find((y) => y.id === selectedClass.academicYearId) ||
      academicYears.find((y) => y.id === activeYearId) ||
      academicYears[0];
    const resolvedAcademicYearTheme =
      activeAcademicYearObj?.theme || 'Vững nội lực - Hướng tương lai';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'students');
    const students = sortedStudents.map((s) => {
      const qrMeta = qrConfigMap.get(s.studentCode);
      const qrStatus = qrMeta?.status || 'ACTIVE';
      const qrToken = qrMeta?.token || null;
      const baseVerifyUrl = getStudentVerifyUrl(s.studentCode);
      const verifyUrl = qrToken
        ? `${baseVerifyUrl}?t=${encodeURIComponent(qrToken)}`
        : baseVerifyUrl;

      let hasPortalPhoto =
        photoStudentIdSet.has(s.id) || codeHasPhotoSet.has(s.studentCode);

      if (!hasPortalPhoto) {
        try {
          for (const candidate of [s.id, s.studentCode]) {
            if (!candidate) continue;
            for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
              if (fs.existsSync(path.join(uploadDir, `${candidate}.${ext}`))) {
                hasPortalPhoto = true;
                break;
              }
            }
            if (hasPortalPhoto) break;
          }
        } catch {}
      }

      const photoUrl = `/api/student-photos/${encodeURIComponent(s.id)}?code=${encodeURIComponent(s.studentCode || '')}`;

      return {
        id: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        englishName: s.englishName,
        gender: s.gender,
        classId: selectedClass.id,
        className: selectedClass.className,
        grade: selectedClass.grade || '',
        level: selectedClass.level || '',
        educationSystem: selectedClass.educationSystem || 'Global',
        campusId: selectedClass.campusId,
        campusCode: selectedClass.campus?.campusCode || 'CS1',
        campusName: selectedClass.campus?.campusName || 'Sky-Line',
        academicYearId: selectedClass.academicYearId,
        academicYearName: selectedClass.academicYear?.name || '2026-2027',
        academicYearTheme: resolvedAcademicYearTheme,
        qrStatus,
        qrToken,
        verifyUrl,
        hasPortalPhoto,
        photoUrl,
      };
    });

    return NextResponse.json({
      success: true,
      accessScope: access.scope,
      canManageConfig: access.scope === 'ADMIN_KTDBCL',
      academicYears,
      selectedAcademicYearId: activeYearId,
      selectedAcademicYearTheme: resolvedAcademicYearTheme,
      campuses,
      classes: classes.map((c) => ({
        id: c.id,
        classCode: c.classCode,
        className: c.className,
        grade: c.grade,
        level: c.level,
        educationSystem: c.educationSystem || '',
        campusId: c.campusId,
        campusCode: c.campus?.campusCode || 'CS1',
        campusName: c.campus?.campusName || 'Sky-Line',
        academicYearId: c.academicYearId,
        academicYearName: c.academicYear?.name || '',
        studentCount: c._count?.students || 0,
      })),
      selectedClass: {
        id: selectedClass.id,
        classCode: selectedClass.classCode,
        className: selectedClass.className,
        grade: selectedClass.grade,
        level: selectedClass.level,
        educationSystem: selectedClass.educationSystem || '',
        campusId: selectedClass.campusId,
        campusCode: selectedClass.campus?.campusCode || 'CS1',
        campusName: selectedClass.campus?.campusName || 'Sky-Line',
        academicYearId: selectedClass.academicYearId,
        academicYearName: selectedClass.academicYear?.name || '',
        academicYearTheme: resolvedAcademicYearTheme,
      },
      students,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Không thể tải dữ liệu bảng tên học sinh.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Quản lý vô hiệu hóa / kích hoạt lại hoặc đổi liên kết mã QR cá nhân (Mục 5 & Mục 8)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const access = await resolveUserAccess(session);
    if (access.scope === 'DENIED') {
      return NextResponse.json({ error: 'Không có quyền thực hiện' }, { status: 403 });
    }

    const body = await req.json();
    const { action, studentCode, classId, targetStatus } = body;

    if (!studentCode || !classId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin mã học sinh hoặc lớp học' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền của người dùng đối với lớp chứa học sinh này
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, campusId: true, homeroomTeacherId: true, className: true },
    });

    if (!targetClass) {
      return NextResponse.json({ error: 'Lớp học không tồn tại' }, { status: 404 });
    }

    if (access.scope === 'GVCN') {
      const isHomeroom =
        (access.teacherId &&
          targetClass.homeroomTeacherId?.includes(access.teacherId)) ||
        (access.homeroomClassName &&
          targetClass.className === access.homeroomClassName);
      if (!isHomeroom) {
        return NextResponse.json(
          { error: 'GVCN chỉ được phép thao tác trên lớp mình chủ nhiệm' },
          { status: 403 }
        );
      }
    } else if (access.scope === 'CAMPUS_MANAGER') {
      if (
        access.allowedCampusIds.length > 0 &&
        !access.allowedCampusIds.includes(targetClass.campusId)
      ) {
        return NextResponse.json(
          { error: 'Lớp học ngoài phạm vi cơ sở được phân quyền' },
          { status: 403 }
        );
      }
    }

    const cleanCode = String(studentCode).trim();
    const existing = await prisma.assessmentConfig.findFirst({
      where: {
        categoryType: 'STUDENT_NAMEPLATE_QR',
        code: cleanCode,
      },
    });

    let currentMeta: { token?: string | null; updatedAt?: string } = {};
    if (existing?.name) {
      try {
        currentMeta = JSON.parse(existing.name);
      } catch {
        currentMeta = {};
      }
    }

    if (action === 'toggleQrStatus') {
      const newStatus =
        targetStatus === 'DISABLED'
          ? 'DISABLED'
          : targetStatus === 'ACTIVE'
            ? 'ACTIVE'
            : existing?.status === 'DISABLED'
              ? 'ACTIVE'
              : 'DISABLED';

      const payloadStr = JSON.stringify({
        ...currentMeta,
        updatedAt: new Date().toISOString(),
      });

      if (existing) {
        await prisma.assessmentConfig.update({
          where: { id: existing.id },
          data: { status: newStatus, name: payloadStr },
        });
      } else {
        await prisma.assessmentConfig.create({
          data: {
            categoryType: 'STUDENT_NAMEPLATE_QR',
            code: cleanCode,
            status: newStatus,
            name: payloadStr,
          },
        });
      }

      const baseVerifyUrl = getStudentVerifyUrl(cleanCode);
      const verifyUrl = currentMeta.token
        ? `${baseVerifyUrl}?t=${encodeURIComponent(currentMeta.token)}`
        : baseVerifyUrl;

      return NextResponse.json({
        success: true,
        qrStatus: newStatus,
        qrToken: currentMeta.token || null,
        verifyUrl,
      });
    }

    if (action === 'rotateQrToken') {
      const newToken = crypto.randomBytes(6).toString('hex');
      const payloadStr = JSON.stringify({
        token: newToken,
        updatedAt: new Date().toISOString(),
      });

      if (existing) {
        await prisma.assessmentConfig.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', name: payloadStr },
        });
      } else {
        await prisma.assessmentConfig.create({
          data: {
            categoryType: 'STUDENT_NAMEPLATE_QR',
            code: cleanCode,
            status: 'ACTIVE',
            name: payloadStr,
          },
        });
      }

      const verifyUrl = `${getStudentVerifyUrl(cleanCode)}?t=${encodeURIComponent(newToken)}`;

      return NextResponse.json({
        success: true,
        qrStatus: 'ACTIVE',
        qrToken: newToken,
        verifyUrl,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Không thể cập nhật cấu hình mã QR' },
      { status: 500 }
    );
  }
}
