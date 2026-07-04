import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let whereClause = {};
    if (type) {
      whereClause = { type };
    }

    const categories = await prisma.activityCategory.findMany({
      where: whereClause,
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch ActivityCategory:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, code, name, sortOrder, status } = body;
    
    if (!type || !code || !name) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newCategory = await prisma.activityCategory.create({
      data: {
        type,
        code,
        name,
        sortOrder: sortOrder || 0,
        status: status || 'ACTIVE',
      }
    });

    return NextResponse.json({ success: true, data: newCategory });
  } catch (error) {
    console.error('Failed to create ActivityCategory:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
