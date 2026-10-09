import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';
import { MASTER_ACTIVITIES_2026_2027 } from '@/lib/experiential/master-catalog-data';
import { ActivityCatalogMeta } from '@/lib/experiential/catalog-types';

export const dynamic = 'force-dynamic';

async function checkAdminOrBdhcmPermission(session: any) {
  if (!session?.user?.id) return false;
  const userRole = (session?.user as any)?.role || '';
  const upper = userRole.toUpperCase().trim();
  const ALLOWED = [
    'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN', 
    'KT_DBCL', 'KTDBCL', 'GDCS', 'BGH', 'QLCM', 'TTCM', 
    'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS'
  ];
  if (ALLOWED.some(r => upper.includes(r))) return true;
  return await hasModulePermission(userRole, ['EXPERIENTIAL_ACTIVITIES', 'EXP_ACT_CATALOGS'], 'canWrite');
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrBdhcmPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện đồng bộ Master Catalog' }, { status: 403 });
    }

    // 1. Tìm hoặc xác định nhóm và loại mặc định
    let defaultGroup = await prisma.activityCategory.findFirst({
      where: { type: 'GROUP', code: 'HTNC' }
    });
    if (!defaultGroup) {
      defaultGroup = await prisma.activityCategory.findFirst({
        where: { type: 'GROUP' }
      });
    }

    let defaultType = await prisma.activityCategory.findFirst({
      where: { type: 'TYPE', code: 'TNNK' }
    });
    if (!defaultType) {
      defaultType = await prisma.activityCategory.findFirst({
        where: { type: 'TYPE' }
      });
    }

    if (!defaultGroup || !defaultType) {
      return NextResponse.json({ error: 'Chưa cấu hình ActivityCategory (GROUP hoặc TYPE) trong hệ thống' }, { status: 500 });
    }

    // 2. Tìm năm học 2026-2027
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: 'ACTIVE' }
    });
    const academicYearId = activeYear?.id || '';

    // 3. Đồng bộ 29 hoạt động từ MASTER_ACTIVITIES_2026_2027
    const results = [];

    for (const item of MASTER_ACTIVITIES_2026_2027) {
      const meta: ActivityCatalogMeta = {
        academicYearId,
        activityCategory: 'TRAI_NGHIEM_DU_AN',
        educationLevel: item.educationLevel,
        educationLevels: [item.educationLevel],
        programType: item.programType,
        programTypes: [item.programType],
        sheetCode: item.sheetCode,
        grades: item.grades,
        themeName: item.themeName,
        integratedSubjects: item.integratedSubjects,
        educationalContent: item.educationalContent,
        learningOutcomes: item.learningOutcomes,
        organizationFormat: item.organizationFormat || 'Trải nghiệm',
        timeFrame: item.timeFrame,
        semester: item.semester,
        expectedLocation: item.expectedLocation,
        primarySubjectName: item.primarySubjectName,
        coopSubjectNames: item.integratedSubjects,
        deliverables: item.deliverables,
        notes: `Phụ lục ${item.appendixNumber} – Kế hoạch 2026-2027`,
        evaluationConfig: item.evaluationConfig,
        allocatedCampuses: []
      };

      const existing = await prisma.activityCatalog.findUnique({
        where: { code: item.code }
      });

      if (existing) {
        // Cập nhật
        const updated = await prisma.activityCatalog.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            level: item.educationLevel,
            status: 'ACTIVE',
            description: JSON.stringify(meta)
          }
        });
        results.push({ action: 'UPDATED', code: updated.code, name: updated.name });
      } else {
        // Tạo mới
        const created = await prisma.activityCatalog.create({
          data: {
            code: item.code,
            name: item.name,
            groupId: defaultGroup.id,
            typeId: defaultType.id,
            level: item.educationLevel,
            status: 'ACTIVE',
            description: JSON.stringify(meta)
          }
        });
        results.push({ action: 'CREATED', code: created.code, name: created.name });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${results.length} hoạt động Master Catalog từ 7 Phụ lục Kế hoạch 2026-2027`,
      count: results.length,
      items: results
    });

  } catch (error: any) {
    console.error('Error syncing master catalogs:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi hệ thống khi đồng bộ Master Catalog' }, { status: 500 });
  }
}
