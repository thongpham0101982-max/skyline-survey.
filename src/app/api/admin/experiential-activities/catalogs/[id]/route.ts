import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';

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
  return await hasModulePermission(userRole, ['EXPERIENTIAL_ACTIVITIES', 'EXP_ACT_MANAGE'], 'canUpdate');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { id } = await params;
    const catalog = await prisma.activityCatalog.findUnique({
      where: { id },
      include: {
        group: true,
        type: true,
        theme: true,
        records: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            organizerId: true,
            teacherId: true
          }
        }
      }
    });

    if (!catalog) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động trong danh mục' }, { status: 404 });
    }

    let meta: any = {};
    if (catalog.description && catalog.description.startsWith('{')) {
      try {
        meta = JSON.parse(catalog.description);
      } catch {}
    } else {
      meta.plainDescription = catalog.description || '';
    }

    return NextResponse.json({
      id: catalog.id,
      code: catalog.code,
      name: catalog.name,
      level: catalog.level,
      status: catalog.status,
      records: catalog.records,
      meta
    });
  } catch (error: any) {
    console.error('Error getting catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền cập nhật' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, meta = {}, action } = body;

    const existing = await prisma.activityCatalog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động trong danh mục' }, { status: 404 });
    }

    // Merge existing meta with new meta
    let currentMeta: any = {};
    if (existing.description && existing.description.startsWith('{')) {
      try {
        currentMeta = JSON.parse(existing.description);
      } catch {}
    }

    const updatedMeta = { ...currentMeta, ...meta };

    // Action: ALLOCATE_CAMPUSES (Đẩy hoạt động xuống cơ sở)
    if (action === 'ALLOCATE_CAMPUSES' && Array.isArray(body.allocatedCampuses)) {
      updatedMeta.allocatedCampuses = body.allocatedCampuses;
    }

    const updated = await prisma.activityCatalog.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        level: updatedMeta.educationLevel || existing.level,
        status: body.status !== undefined ? body.status : existing.status,
        description: JSON.stringify(updatedMeta)
      }
    });

    return NextResponse.json({
      success: true,
      catalog: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        meta: updatedMeta
      }
    });
  } catch (error: any) {
    console.error('Error updating catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const cancelInstead = searchParams.get('cancelInstead') === 'true';

    const existing = await prisma.activityCatalog.findUnique({
      where: { id },
      include: {
        records: {
          select: {
            id: true,
            participants: { select: { id: true } }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 });
    }

    if (cancelInstead) {
      await prisma.activityCatalog.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json({ success: true, message: 'Đã chuyển hoạt động sang trạng thái HỦY' });
    }

    const hasParticipants = existing.records.some(r => r.participants.length > 0);
    if (hasParticipants) {
      return NextResponse.json({ 
        error: `Không thể xóa vĩnh viễn vì hoạt động đã có học sinh tham gia đánh giá. Bạn có thể chuyển sang trạng thái "HỦY" để ngưng áp dụng.`,
        canCancelInstead: true
      }, { status: 400 });
    }

    // Clean up empty records
    const recordIds = existing.records.map(r => r.id);
    if (recordIds.length > 0) {
      await prisma.activityRecord.deleteMany({ where: { id: { in: recordIds } } });
    }

    await prisma.activityCatalog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa hoạt động khỏi danh mục thành công' });
  } catch (error: any) {
    console.error('Error deleting catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
