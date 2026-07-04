import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { type, code, name, sortOrder, status } = body;
    
    if (!type || !code || !name) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const updatedCategory = await prisma.activityCategory.update({
      where: { id },
      data: {
        type,
        code,
        name,
        sortOrder: sortOrder || 0,
        status: status || 'ACTIVE',
      }
    });

    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error('Failed to update ActivityCategory:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // Check if category is used by any activities (we will skip the check for now or you can implement it later)
    
    await prisma.activityCategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Failed to delete ActivityCategory:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}