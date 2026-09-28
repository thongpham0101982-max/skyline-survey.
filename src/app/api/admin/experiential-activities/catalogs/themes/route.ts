import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { DEFAULT_EDUCATIONAL_THEMES, EducationalThemeItem } from '@/lib/experiential/catalog-types';

export const dynamic = 'force-dynamic';

const THEMES_CONFIG_CODE = 'EXPERIENTIAL_EDUCATIONAL_THEMES';

// GET: Lấy danh sách Chủ đề Giáo dục
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const config = await (prisma as any).assessmentConfig.findFirst({
      where: {
        categoryType: 'SYSTEM_SETTING',
        code: THEMES_CONFIG_CODE
      }
    });

    if (config?.description) {
      try {
        const parsed = JSON.parse(config.description);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(parsed);
        }
      } catch (e) {
        console.error('Error parsing educational themes:', e);
      }
    }

    return NextResponse.json(DEFAULT_EDUCATIONAL_THEMES);
  } catch (err: any) {
    console.error('Error fetching educational themes:', err);
    return NextResponse.json(DEFAULT_EDUCATIONAL_THEMES);
  }
}

// POST: Lưu hoặc khôi phục danh sách Chủ đề Giáo dục
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { action, themes } = body;

    // Action: Khôi phục danh mục 12 chủ đề chuẩn mặc định
    if (action === 'RESET_DEFAULT') {
      const existing = await (prisma as any).assessmentConfig.findFirst({
        where: {
          categoryType: 'SYSTEM_SETTING',
          code: THEMES_CONFIG_CODE
        }
      });

      if (existing) {
        await (prisma as any).assessmentConfig.update({
          where: { id: existing.id },
          data: {
            name: 'Danh mục Chủ đề Giáo dục HĐTN',
            description: JSON.stringify(DEFAULT_EDUCATIONAL_THEMES),
            updatedAt: new Date()
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Đã khôi phục danh mục chủ đề giáo dục mặc định',
        themes: DEFAULT_EDUCATIONAL_THEMES
      });
    }

    if (!Array.isArray(themes) || themes.length === 0) {
      return NextResponse.json({ error: 'Danh sách chủ đề không hợp lệ' }, { status: 400 });
    }

    // Chuẩn hóa danh sách chủ đề
    const sanitizedThemes: EducationalThemeItem[] = themes.map((t: any, idx: number) => ({
      id: t.id || `theme_${Date.now()}_${idx}`,
      code: (t.code || t.name || `THEME_${idx}`).toUpperCase().trim().replace(/[\s–—-]+/g, '_'),
      name: (t.name || '').trim(),
      description: (t.description || '').trim(),
      badgeCls: t.badgeCls || 'bg-teal-50 text-teal-800 border-teal-200/80',
      borderCls: t.borderCls || 'border-teal-400',
      tagColor: t.tagColor || '#00A19A',
      isSystem: Boolean(t.isSystem)
    })).filter(t => t.name.length > 0);

    const existing = await (prisma as any).assessmentConfig.findFirst({
      where: {
        categoryType: 'SYSTEM_SETTING',
        code: THEMES_CONFIG_CODE
      }
    });

    if (existing) {
      await (prisma as any).assessmentConfig.update({
        where: { id: existing.id },
        data: {
          name: 'Danh mục Chủ đề Giáo dục HĐTN',
          description: JSON.stringify(sanitizedThemes),
          updatedAt: new Date()
        }
      });
    } else {
      await (prisma as any).assessmentConfig.create({
        data: {
          categoryType: 'SYSTEM_SETTING',
          code: THEMES_CONFIG_CODE,
          name: 'Danh mục Chủ đề Giáo dục HĐTN',
          description: JSON.stringify(sanitizedThemes),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cấu hình danh mục chủ đề giáo dục thành công',
      themes: sanitizedThemes
    });
  } catch (err: any) {
    console.error('Error saving educational themes:', err);
    return NextResponse.json({ error: err.message || 'Lỗi khi lưu chủ đề giáo dục' }, { status: 500 });
  }
}
