import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';
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
  return await hasModulePermission(userRole, ['EXPERIENTIAL_ACTIVITIES', 'EXP_ACT_MANAGE'], 'canRead');
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập Danh mục HĐTN & Ngoại khóa' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    const level = searchParams.get('level'); // MN, TIEU_HOC, THCS, THPT
    const programType = searchParams.get('programType'); // HE_S, SONG_NGU, QUOC_TE
    const sheetCode = searchParams.get('sheetCode'); // MN, TH_S, THCS_S...
    const grade = searchParams.get('grade');
    const search = searchParams.get('q') || '';

    const catalogs = await prisma.activityCatalog.findMany({
      include: {
        group: true,
        type: true,
        theme: true,
        records: {
          select: {
            id: true,
            status: true,
            academicYearId: true,
            organizerId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsedCatalogs = catalogs.map(c => {
      let meta: ActivityCatalogMeta = {
        academicYearId: '',
        educationLevel: 'TIEU_HOC',
        programType: 'HE_S',
        sheetCode: 'TH_S',
        grades: [],
        themeName: '',
        integratedSubjects: '',
        educationalContent: '',
        learningOutcomes: '',
        organizationFormat: 'Trải nghiệm',
        timeFrame: '',
        semester: 1,
        expectedLocation: '',
        partners: '',
        primarySubjectName: '',
        coopSubjectNames: '',
        deliverables: '',
        notes: '',
        plainDescription: '',
        allocatedCampuses: []
      };

      if (c.description && c.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(c.description);
          meta = { ...meta, ...parsed };
        } catch {}
      } else {
        meta.plainDescription = c.description || '';
      }

      // Ensure level is set
      if (c.level) {
        meta.educationLevel = c.level as any;
      }

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        groupId: c.groupId,
        groupName: c.group?.name || '',
        typeId: c.typeId,
        typeName: c.type?.name || '',
        themeId: c.themeId,
        themeNameFromCat: c.theme?.name || '',
        level: c.level,
        status: c.status,
        recordsCount: c.records?.length || 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        meta
      };
    });

    let filtered = parsedCatalogs;

    if (academicYearId && academicYearId !== 'ALL') {
      filtered = filtered.filter(item => !item.meta.academicYearId || item.meta.academicYearId === academicYearId);
    }
    if (level && level !== 'ALL') {
      filtered = filtered.filter(item => item.meta.educationLevel === level || item.level === level);
    }
    if (programType && programType !== 'ALL') {
      filtered = filtered.filter(item => item.meta.programType === programType);
    }
    if (sheetCode && sheetCode !== 'ALL') {
      filtered = filtered.filter(item => item.meta.sheetCode === sheetCode);
    }
    if (grade && grade !== 'ALL') {
      filtered = filtered.filter(item => item.meta.grades && item.meta.grades.includes(grade));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.meta.themeName && item.meta.themeName.toLowerCase().includes(q)) ||
        (item.meta.primarySubjectName && item.meta.primarySubjectName.toLowerCase().includes(q)) ||
        (item.meta.integratedSubjects && item.meta.integratedSubjects.toLowerCase().includes(q)) ||
        (item.meta.expectedLocation && item.meta.expectedLocation.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Error fetching activity catalogs:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền thêm mới Danh mục HĐTN & Ngoại khóa' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      meta = {}
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Tên hoạt động ngoại khóa' }, { status: 400 });
    }

    // Ensure fallback group & type
    let fallbackGroup = await prisma.activityCategory.findFirst({ where: { type: 'GROUP' } });
    if (!fallbackGroup) {
      fallbackGroup = await prisma.activityCategory.findFirst();
    }
    if (!fallbackGroup) {
      fallbackGroup = await prisma.activityCategory.create({
        data: {
          type: 'GROUP',
          code: 'HDTN_CHUNG',
          name: 'Hoạt động trải nghiệm chung'
        }
      });
    }

    let fallbackType = await prisma.activityCategory.findFirst({ where: { type: 'TYPE' } });
    if (!fallbackType) {
      fallbackType = fallbackGroup;
    }

    const recordCode = (code && code.trim()) ? code.trim() : `HDNK-${Date.now().toString().slice(-6)}`;
    
    // Check code duplication
    const existing = await prisma.activityCatalog.findUnique({ where: { code: recordCode } });
    const finalCode = existing ? `${recordCode}-${Math.floor(Math.random() * 1000)}` : recordCode;

    const catalog = await prisma.activityCatalog.create({
      data: {
        code: finalCode,
        name: name.trim(),
        groupId: fallbackGroup.id,
        typeId: fallbackType.id,
        level: meta.educationLevel || 'TIEU_HOC',
        description: JSON.stringify(meta),
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({
      success: true,
      catalog: {
        id: catalog.id,
        code: catalog.code,
        name: catalog.name,
        meta
      }
    });
  } catch (error: any) {
    console.error('Error creating activity catalog:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
