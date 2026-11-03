import React from 'react';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VerifyStudentClient from './client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return {
    title: `Hồ sơ Học tập ${code} | Hệ thống Giáo dục Sky-Line`,
    description: `Cổng xác thực và tra cứu Hồ sơ Học tập học sinh thuộc Hệ thống Giáo dục Sky-Line`,
  };
}

export default async function VerifyStudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ t?: string }>;
}) {
  const { code } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const tokenParam = resolvedSearch?.t || null;

  const cleanCode = decodeURIComponent(code || '')
    .replace(/[{}\\\/]/g, '')
    .trim();

  // 1. Bắt buộc xác thực đăng nhập trước khi xem dữ liệu (Mục 5)
  const session = await auth();
  if (!session?.user) {
    const cb = `/profile/verify/${encodeURIComponent(cleanCode)}${
      tokenParam ? `?t=${encodeURIComponent(tokenParam)}` : ''
    }`;
    redirect(`/login?callbackUrl=${encodeURIComponent(cb)}&role=PARENT`);
  }

  let student: any = null;
  let alumniProfile: any = null;
  let mapping: any = null;
  let qrConfig: any = null;

  try {
    // 2. Kiểm tra trạng thái mã QR (Active / Disabled / Token rotation)
    qrConfig = await prisma.assessmentConfig
      .findFirst({
        where: {
          categoryType: 'STUDENT_NAMEPLATE_QR',
          code: cleanCode,
        },
      })
      .catch(() => null);

    // 3. Tìm kiếm học sinh trong hệ thống K-12
    student = await prisma.student.findFirst({
      where: {
        OR: [{ studentCode: cleanCode }, { id: cleanCode }],
      },
      orderBy: { id: 'desc' },
      include: {
        campus: true,
        class: true,
        academicYear: true,
        photo: true,
        achievements: {
          take: 5,
          include: {
            achievement: true,
          },
        },
      },
    });

    // 4. Tìm kiếm trong phân hệ Cựu học sinh (Alumni)
    try {
      alumniProfile = await (prisma as any).alumniProfile.findFirst({
        where: { studentCode: cleanCode },
        include: {
          qrTokens: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
      });
    } catch (_) {}

    // 5. Tìm mã phụ VnEdu nếu có
    mapping = await prisma.studentCodeMapping.findFirst({
      where: { databaseCode: cleanCode },
      select: { markFileCode: true },
    });
  } catch (dbErr) {
    // Không ghi thông tin cá nhân học sinh vào log
  }

  // Kiểm tra trường hợp QR bị vô hiệu hóa hoặc liên kết cũ đã bị thay đổi
  if (qrConfig) {
    let requiredToken: string | null = null;
    try {
      const parsed = JSON.parse(qrConfig.name || '{}');
      requiredToken = parsed.token || null;
    } catch {
      requiredToken = null;
    }

    if (qrConfig.status === 'DISABLED') {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#2E1065] to-[#001D1D] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              ✕
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">
              Mã QR Đang Tạm Khóa
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Liên kết mã QR cá nhân này hiện đã được tạm khóa bởi Nhà trường hoặc Giáo viên chủ nhiệm. Vui lòng liên hệ GVCN để được hỗ trợ.
            </p>
            <a
              href="/parent"
              className="inline-block px-6 py-2.5 bg-[#5B21B6] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#4C1D95] transition"
            >
              Về Trang chủ SSM
            </a>
          </div>
        </div>
      );
    }

    if (requiredToken && requiredToken !== tokenParam) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#2E1065] to-[#001D1D] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              !
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">
              Liên Kết QR Đã Được Cấp Mới
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Mã QR trên bản in cũ này đã được thay đổi liên kết bảo mật mới. Vui lòng sử dụng bảng tên mới nhất hoặc truy cập trực tiếp từ Cổng Phụ Huynh.
            </p>
            <a
              href="/parent/children/profile"
              className="inline-block px-6 py-2.5 bg-[#5B21B6] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#4C1D95] transition"
            >
              Mở Hồ sơ Học tập của Con
            </a>
          </div>
        </div>
      );
    }
  }

  if (!student && !alumniProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#003B3A] to-[#001D1D] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            !
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">
            Hồ Sơ Chưa Được Kích Hoạt
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Mã học sinh <strong className="font-mono text-[#003B3A]">{cleanCode || 'Chưa xác định'}</strong> chưa được ghi nhận dữ liệu định danh trên hệ thống.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-[#00A19A] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#00736E] transition"
          >
            Về Trang chủ SSM
          </a>
        </div>
      </div>
    );
  }

  // 6. KIỂM TRA PHÂN QUYỀN XEM HỒ SƠ (Mục 5 & Mục 8)
  // - Phụ huynh chỉ được xem hồ sơ của học sinh được liên kết với tài khoản phụ huynh đó
  // - GVCN chỉ được xem học sinh thuộc lớp mình phụ trách
  // - Quản lý cơ sở xem học sinh thuộc cơ sở được phân quyền
  // - Ban KT&ĐBCL / Quản trị xem theo phân quyền hệ thống
  const userId = String((session.user as any)?.id || '');
  const userRole = String((session.user as any)?.role || 'PARENT')
    .toUpperCase()
    .trim();

  let isAuthorized = false;
  let fullProfileUrl = '/parent/children/profile';

  if (
    ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'KT_DBCL', 'KTDBCL', 'BAN_DHCM'].some(
      (r) => userRole === r || userRole.includes(r)
    )
  ) {
    isAuthorized = true;
    fullProfileUrl = `/admin/ho-so-hoc-sinh?search=${encodeURIComponent(cleanCode)}`;
  } else if (
    ['GDCS', 'GĐCS', 'GD_CS', 'GĐ_CS', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'BGH_CS', 'BGH_MN'].some(
      (r) => userRole === r || userRole.includes(r)
    )
  ) {
    const [campusAssignments, managedCampuses, teacher] = await Promise.all([
      prisma.userCampusAssignment
        .findMany({ where: { userId }, select: { campusId: true } })
        .catch(() => []),
      prisma.campus
        .findMany({ where: { managerId: userId }, select: { id: true } })
        .catch(() => []),
      prisma.teacher
        .findUnique({ where: { userId }, select: { campusId: true } })
        .catch(() => null),
    ]);
    const allowedIds = new Set<string>([
      ...campusAssignments.map((a) => a.campusId),
      ...managedCampuses.map((c) => c.id),
      ...(teacher?.campusId ? [teacher.campusId] : []),
    ]);
    isAuthorized = allowedIds.size === 0 || (student?.campusId && allowedIds.has(student.campusId));
    fullProfileUrl = `/admin/ho-so-hoc-sinh?search=${encodeURIComponent(cleanCode)}`;
  } else if (['TEACHER', 'GV_MN', 'GV', 'GIAO_VIEN', 'GVNN'].includes(userRole)) {
    const teacher = await prisma.teacher
      .findUnique({
        where: { userId },
        select: { id: true, homeroomClass: true },
      })
      .catch(() => null);
    if (teacher && student?.class) {
      const isGvcn =
        student.class.homeroomTeacherId?.includes(teacher.id) ||
        (teacher.homeroomClass && student.class.className === teacher.homeroomClass);
      if (isGvcn) {
        isAuthorized = true;
      } else {
        const teachingCount = await prisma.teachingAssignment
          .count({
            where: { teacherId: teacher.id, classId: student.classId },
          })
          .catch(() => 0);
        isAuthorized = teachingCount > 0;
      }
    }
    fullProfileUrl = `/teacher/ho-so-hoc-sinh`;
  } else if (userRole === 'PARENT') {
    const parent = await prisma.parent
      .findUnique({
        where: { userId },
        include: {
          students: {
            where: { status: 'ACTIVE' },
            include: {
              student: { select: { id: true, studentCode: true } },
            },
          },
        },
      })
      .catch(() => null);

    if (parent && Array.isArray(parent.students)) {
      const linked = parent.students.some(
        (link) =>
          link.student?.studentCode === cleanCode ||
          link.studentId === student?.id
      );
      if (linked) {
        isAuthorized = true;
        fullProfileUrl = `/parent/children/profile?studentId=${encodeURIComponent(student?.id || '')}`;
      }
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#2E1065] via-[#1E1B4B] to-[#0F172A] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-100">
          <div className="w-16 h-16 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl border border-purple-200">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Giới Hạn Quyền Truy Cập Hồ Sơ
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Theo quy định bảo mật dữ liệu học sinh của <strong>Hệ thống Giáo dục Sky-Line</strong>, quyền xem Hồ sơ học tập qua mã QR chỉ giới hạn cho <strong>Tài khoản Phụ huynh được liên kết trực tiếp với học sinh</strong> hoặc <strong>Giáo viên chủ nhiệm phụ trách lớp</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <a
              href={userRole === 'PARENT' ? '/parent/children/profile' : '/teacher'}
              className="px-5 py-2.5 bg-[#5B21B6] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#4C1D95] transition"
            >
              {userRole === 'PARENT' ? 'Xem Hồ sơ con của tôi' : 'Về Trang công tác'}
            </a>
            <a
              href="/login?role=PARENT"
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Đổi tài khoản
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isAlumni =
    !!alumniProfile ||
    student?.status === 'ALUMNI' ||
    student?.status === 'GRADUATED';
  const alumniToken = alumniProfile?.qrTokens?.[0]?.publicToken || null;

  const photoBase64 = student?.photo?.photoData
    ? `data:${student.photo.contentType || 'image/jpeg'};base64,${student.photo.photoData}`
    : null;

  const serializedStudent = student
    ? {
        id: student.id,
        studentCode: student.studentCode,
        vneduCode: mapping?.markFileCode || null,
        studentName: student.studentName,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
        gender: student.gender,
        className: student.class?.className || 'Sky-Line',
        grade: student.class?.grade || null,
        campusName: student.campus?.campusName || 'Hệ thống Giáo dục Sky-Line',
        yearName: student.academicYear?.name || '2025-2026',
        photoUrl: photoBase64,
        status: student.status,
        achievements: (student.achievements || []).map((a: any) => ({
          name: a.achievement?.name || 'Thành tích nổi bật',
          level: a.achievement?.level || 'Trường',
        })),
      }
    : null;

  return (
    <VerifyStudentClient
      student={serializedStudent}
      isAlumni={isAlumni}
      alumniToken={alumniToken}
      cleanCode={cleanCode}
      fullProfileUrl={fullProfileUrl}
    />
  );
}
