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
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== 'ALL') {
      filtered = filtered.filter(item => item.status === statusParam);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.meta.themeName && item.meta.themeName.toLowerCase().includes(q)) ||
        (item.meta.primarySubjectName && item.meta.primarySubjectName.toLowerCase().includes(q)) ||
        (item.meta.integratedSubjects && item.meta.integratedSubjects.toLowerCase().includes(q)) ||
        (item.meta.expectedLocation && item.meta.expectedLocation.toLowerCase().includes(q)) ||
        (item.meta.cthsTeacherName && item.meta.cthsTeacherName.toLowerCase().includes(q))
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
        status: body.status || 'ACTIVE'
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

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật Danh mục HĐTN & Ngoại khóa' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ids = [], cthsTeacherId, cthsTeacherCode, cthsTeacherName, cthsTeacherEmail, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất một hoạt động' }, { status: 400 });
    }

    // Action: Chuyển trạng thái hàng loạt (HỦY / KÍCH HOẠT)
    if (action === 'BULK_UPDATE_STATUS') {
      const targetStatus = (status === 'CANCELLED' || status === 'HUY') ? 'CANCELLED' : 'ACTIVE';
      await prisma.activityCatalog.updateMany({
        where: { id: { in: ids } },
        data: { status: targetStatus }
      });

      return NextResponse.json({
        success: true,
        message: targetStatus === 'CANCELLED' 
          ? `Đã chuyển ${ids.length} hoạt động sang trạng thái HỦY` 
          : `Đã kích hoạt lại ${ids.length} hoạt động thành công`,
        count: ids.length,
        status: targetStatus
      });
    }

    // Action: Gán GV Tổ CTHS hàng loạt
    if (action === 'BULK_ASSIGN_CTHS') {
      const catalogs = await prisma.activityCatalog.findMany({
        where: { id: { in: ids } }
      });

      let updatedCount = 0;
      for (const cat of catalogs) {
        let currentMeta: any = {};
        if (cat.description && cat.description.startsWith('{')) {
          try {
            currentMeta = JSON.parse(cat.description);
          } catch {}
        }

        const updatedMeta = {
          ...currentMeta,
          cthsTeacherId: cthsTeacherId || '',
          cthsTeacherCode: cthsTeacherCode || '',
          cthsTeacherName: cthsTeacherName || '',
          cthsTeacherEmail: cthsTeacherEmail || ''
        };

        await prisma.activityCatalog.update({
          where: { id: cat.id },
          data: {
            description: JSON.stringify(updatedMeta)
          }
        });
        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Đã gán GV Tổ CTHS (${cthsTeacherName || 'Chưa gán'}) cho ${updatedCount} hoạt động thành công`,
        count: updatedCount
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in bulk PUT catalogs:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa Danh mục HĐTN & Ngoại khóa' }, { status: 403 });
    }

    const body = await req.json();
    const { ids = [], forceDelete = false, cancelInstead = false } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất một hoạt động' }, { status: 400 });
    }

    // Nếu người dùng chọn phương án "Chuyển sang trạng thái HỦY"
    if (cancelInstead) {
      await prisma.activityCatalog.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json({
        success: true,
        message: `Đã chuyển ${ids.length} hoạt động sang trạng thái HỦY thành công`,
        count: ids.length,
        status: 'CANCELLED'
      });
    }

    const catalogs = await prisma.activityCatalog.findMany({
      where: { id: { in: ids } },
      include: {
        records: {
          select: {
            id: true,
            participants: { select: { id: true } }
          }
        }
      }
    });

    if (catalogs.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động cần xóa' }, { status: 404 });
    }

    // Kiểm tra hoạt động đã có học sinh tham gia đánh giá
    const withParticipants = catalogs.filter(c => c.records.some(r => r.participants.length > 0));
    if (withParticipants.length > 0 && !forceDelete) {
      return NextResponse.json({
        error: `Không thể xóa vĩnh viễn vì có ${withParticipants.length} hoạt động (${withParticipants.map(c => `"${c.name}"`).join(', ')}) đã có học sinh tham gia đánh giá.`,
        canCancelInstead: true,
        withParticipantsCount: withParticipants.length,
        withParticipantsNames: withParticipants.map(c => c.name)
      }, { status: 400 });
    }

    // Xóa triệt để các participants, evidences, records nếu forceDelete = true
    const recordIds = catalogs.flatMap(c => c.records.map(r => r.id));
    if (recordIds.length > 0) {
      await prisma.activityParticipant.deleteMany({
        where: { recordId: { in: recordIds } }
      });
      await prisma.activityEvidence.deleteMany({
        where: { recordId: { in: recordIds } }
      });
      await prisma.activityRecord.deleteMany({
        where: { id: { in: recordIds } }
      });
    }

    const deleteResult = await prisma.activityCatalog.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công ${deleteResult.count} hoạt động khỏi danh mục`,
      count: deleteResult.count
    });
  } catch (error: any) {
    console.error('Error bulk deleting catalogs:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

