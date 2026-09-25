import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await prisma.teacher.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        email: true,
        phone: true,
        position: true,
        positions: true,
        campusId: true,
        campus: {
          select: {
            id: true,
            campusCode: true,
            campusName: true
          }
        },
        departmentRel: {
          select: {
            id: true,
            code: true,
            name: true,
            divisionCode: true
          }
        },
        user: {
          select: {
            id: true,
            role: true,
            email: true,
            fullName: true
          }
        }
      },
      orderBy: { teacherName: 'asc' }
    });

    const formatted = teachers.map(t => {
      const pos = `${t.position || ''} ${t.positions || ''}`.toUpperCase();
      const role = (t.user?.role || '').toUpperCase();
      const deptCode = (t.departmentRel?.code || '').toUpperCase();
      const deptName = (t.departmentRel?.name || '').toUpperCase();
      const divisionCode = (t.departmentRel?.divisionCode || '').toUpperCase();

      const isCTHS = 
        role.includes('CTHS') || 
        role.includes('CONG_TAC_HOC_SINH') ||
        role.includes('BAN_CTHS') ||
        role.includes('GV_HDTN') ||
        role.includes('BP_NK') ||
        pos.includes('CTHS') ||
        pos.includes('TLHN') ||
        pos.includes('CÔNG TÁC HỌC SINH') ||
        deptCode.includes('CTHS') ||
        deptName.includes('CTHS') ||
        deptName.includes('CÔNG TÁC HỌC SINH') ||
        deptName.includes('TRẢI NGHIỆM') ||
        divisionCode === 'BP_HDNG_CTHS';

      return {
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        email: t.email || t.user?.email || '',
        phone: t.phone || '',
        position: t.position || '',
        positions: t.positions || '',
        campusId: t.campusId,
        campusCode: t.campus?.campusCode || '',
        campusName: t.campus?.campusName || '',
        departmentName: t.departmentRel?.name || '',
        isCTHS
      };
    });

    // Sắp xếp: Ưu tiên GV thuộc Tổ CTHS lên trước, sau đó theo tên tiếng Việt
    formatted.sort((a, b) => {
      if (a.isCTHS && !b.isCTHS) return -1;
      if (!a.isCTHS && b.isCTHS) return 1;
      return a.teacherName.localeCompare(b.teacherName, 'vi');
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching CTHS teachers:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
