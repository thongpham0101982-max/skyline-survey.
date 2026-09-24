import { NextResponse } from 'next/server';
import { generateActivityCatalogTemplate } from '@/lib/experiential/excel-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = generateActivityCatalogTemplate();
    const filename = `Mau_Ke_Hoach_HD_Ngoai_Khoa_${new Date().getFullYear()}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('Error generating catalog template:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
