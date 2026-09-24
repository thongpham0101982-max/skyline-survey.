import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';
import { parseActivityCatalogWorkbook, ParsedCatalogRow } from '@/lib/experiential/excel-parser';
import { ActivityCatalogMeta } from '@/lib/experiential/catalog-types';

export const dynamic = 'force-dynamic';

async function checkAdminOrCTHSPermission(session: any) {
  if (!session?.user?.id) return false;
  const userRole = (session?.user as any)?.role || '';
  const upper = userRole.toUpperCase().trim();
  const ALLOWED = [
    'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN', 
    'KT_DBCL', 'KTDBCL', 'GDCS', 'GIAO_VU_CS', 'GIAO_VU', 
    'BGH', 'QLCM', 'TTCM', 
    'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS', 'GV_HDTN', 'BP_NK'
  ];
  if (ALLOWED.some(r => upper.includes(r))) return true;
  return await hasModulePermission(userRole, ['EXPERIENTIAL_ACTIVITIES', 'EXP_ACT_MANAGE'], 'canCreate');
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện import Danh mục HĐTN' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'preview'; // 'preview' | 'save'
    const academicYearId = searchParams.get('academicYearId') || '';

    // Handle Multipart Form Data (File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'Vui lòng chọn file Excel để tải lên' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parseResult = parseActivityCatalogWorkbook(buffer, academicYearId);

      if (mode === 'preview') {
        return NextResponse.json(parseResult);
      }

      // If mode === 'save', save directly
      const result = await saveRowsToCatalogs(parseResult.validRows, academicYearId);
      return NextResponse.json({
        success: true,
        savedCount: result.savedCount,
        updatedCount: result.updatedCount,
        errors: result.errors
      });
    }

    // Handle JSON (Save confirmed rows)
    const body = await req.json();
    const { rows, targetAcademicYearId } = body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Danh sách dòng dữ liệu import không hợp lệ' }, { status: 400 });
    }

    const result = await saveRowsToCatalogs(rows, targetAcademicYearId || academicYearId);
    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      updatedCount: result.updatedCount,
      errors: result.errors
    });
  } catch (error: any) {
    console.error('Error importing activity catalogs:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function saveRowsToCatalogs(rows: ParsedCatalogRow[], academicYearId?: string) {
  // Ensure fallback categories
  let fallbackGroup = await prisma.activityCategory.findFirst({ where: { type: 'GROUP' } });
  if (!fallbackGroup) {
    fallbackGroup = await prisma.activityCategory.create({
      data: { type: 'GROUP', code: 'HDTN_CHUNG', name: 'Hoạt động trải nghiệm chung' }
    });
  }

  let fallbackType = await prisma.activityCategory.findFirst({ where: { type: 'TYPE' } });
  if (!fallbackType) {
    fallbackType = fallbackGroup;
  }

  let savedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (!row.activityName || !row.activityName.trim()) continue;

      const actName = row.activityName.trim();
      const meta: ActivityCatalogMeta = {
        academicYearId: academicYearId || '',
        educationLevel: row.educationLevel,
        programType: row.programType,
        sheetCode: row.sheetCode,
        grades: row.grades || [row.grade],
        themeName: row.themeName || '',
        integratedSubjects: row.integratedSubjects || '',
        educationalContent: row.educationalContent || '',
        learningOutcomes: row.learningOutcomes || '',
        organizationFormat: row.organizationFormat || 'Trải nghiệm',
        timeFrame: row.timeFrame || '',
        semester: row.semester || 1,
        expectedLocation: row.expectedLocation || '',
        partners: row.partners || '',
        primarySubjectName: row.primarySubjectName || '',
        coopSubjectNames: row.coopSubjectNames || '',
        deliverables: row.deliverables || '',
        notes: row.notes || '',
        allocatedCampuses: []
      };

      // Check if catalog already exists by name and level
      const existing = await prisma.activityCatalog.findFirst({
        where: {
          name: actName,
          level: row.educationLevel
        }
      });

      if (existing) {
        // Merge metadata
        let currentMeta: any = {};
        if (existing.description && existing.description.startsWith('{')) {
          try {
            currentMeta = JSON.parse(existing.description);
          } catch {}
        }
        const mergedMeta = { ...currentMeta, ...meta };

        await prisma.activityCatalog.update({
          where: { id: existing.id },
          data: {
            description: JSON.stringify(mergedMeta),
            updatedAt: new Date()
          }
        });
        updatedCount++;
      } else {
        const catCode = `HDNK-${row.sheetCode}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`;
        await prisma.activityCatalog.create({
          data: {
            code: catCode,
            name: actName,
            groupId: fallbackGroup.id,
            typeId: fallbackType.id,
            level: row.educationLevel,
            description: JSON.stringify(meta),
            status: 'ACTIVE'
          }
        });
        savedCount++;
      }
    } catch (err: any) {
      errors.push(`Lỗi dòng "${row.activityName}": ${err.message}`);
    }
  }

  return { savedCount, updatedCount, errors };
}
