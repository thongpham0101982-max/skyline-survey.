import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const catalogs = await prisma.activityCatalog.findMany({
      include: {
        group: true,
        type: true,
        theme: true
      },
      orderBy: [
        { code: 'asc' }
      ]
    });
    
    return NextResponse.json({ success: true, data: catalogs });
  } catch (error) {
    console.error('Failed to fetch ActivityCatalog:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, groupId, typeId, themeId, level, description, status } = body;
    
    if (!code || !name || !groupId || !typeId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newCatalog = await prisma.activityCatalog.create({
      data: {
        code,
        name,
        groupId,
        typeId,
        themeId,
        level,
        description,
        status: status || 'ACTIVE',
      }
    });

    return NextResponse.json({ success: true, data: newCatalog });
  } catch (error) {
    console.error('Failed to create ActivityCatalog:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
