import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniDb } from '@/lib/alumni/alumni-db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || '';
  const db = getAlumniDb();

  try {
    let sql = `SELECT * FROM AlumniCatalog WHERE 1=1`;
    const args: any[] = [];
    if (type && type !== 'all') {
      sql += ` AND type = ?`;
      args.push(type);
    }
    sql += ` ORDER BY type ASC, usageCount DESC, name ASC`;

    const res = await db.execute({ sql, args });
    return NextResponse.json({ success: true, count: res.rows.length, data: res.rows });
  } catch (error: any) {
    console.error('Error fetching alumni catalogs:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh mục' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const db = getAlumniDb();

  try {
    const body = await req.json();
    const { type, code, name, nameEn, parentCode } = body;

    if (!type || !code || !name) {
      return NextResponse.json({ error: 'Vui lòng điền đủ loại, mã và tên danh mục' }, { status: 400 });
    }

    const id = 'cat_' + type.toLowerCase() + '_' + code.toLowerCase().replace(/[^a-z0-9]/g, '_');

    await db.execute({
      sql: `INSERT INTO AlumniCatalog (id, type, code, name, nameEn, parentCode, isVerified, usageCount)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0)
            ON CONFLICT(type, code) DO UPDATE SET
              name = excluded.name,
              nameEn = excluded.nameEn,
              parentCode = excluded.parentCode,
              updatedAt = CURRENT_TIMESTAMP`,
      args: [id, type, code, name, nameEn || null, parentCode || null]
    });

    return NextResponse.json({ success: true, message: 'Đã lưu danh mục thành công' });
  } catch (error: any) {
    console.error('Error saving alumni catalog:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu danh mục' }, { status: 500 });
  }
}
