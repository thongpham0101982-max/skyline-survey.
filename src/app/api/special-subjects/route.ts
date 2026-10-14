import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const level = searchParams.get("level");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (level && level !== "ALL") {
      where.levels = { contains: level };
    }

    const subjects = await (prisma as any).specialSubject.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        curriculums: {
          include: {
            versions: {
              select: { id: true, versionCode: true, status: true, academicYearId: true }
            }
          }
        },
        _count: {
          select: {
            assignments: true
          }
        }
      }
    });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    console.error("[SpecialSubject GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS) {
      return NextResponse.json({ error: "Forbidden: Không có quyền cấu hình môn đặc thù" }, { status: 403 });
    }

    const body = await req.json();
    const { id, code, name, levels, campuses, description, icon, color, status, sortOrder } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Mã và tên môn là bắt buộc" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "_");

    const subject = await (prisma as any).specialSubject.upsert({
      where: { code: normalizedCode },
      update: {
        name: name.trim(),
        levels: Array.isArray(levels) ? levels.join(",") : (levels || "PRIMARY"),
        campuses: Array.isArray(campuses) ? campuses.join(",") : (campuses || "ALL"),
        description: description || null,
        icon: icon || "BookOpen",
        color: color || "#00A19A",
        status: status || "ACTIVE",
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0
      },
      create: {
        id: id || undefined,
        code: normalizedCode,
        name: name.trim(),
        levels: Array.isArray(levels) ? levels.join(",") : (levels || "PRIMARY"),
        campuses: Array.isArray(campuses) ? campuses.join(",") : (campuses || "ALL"),
        description: description || null,
        icon: icon || "BookOpen",
        color: color || "#00A19A",
        status: status || "ACTIVE",
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0
      }
    });

    return NextResponse.json({ subject, message: "Lưu môn đặc thù thành công" });
  } catch (error: any) {
    console.error("[SpecialSubject POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
