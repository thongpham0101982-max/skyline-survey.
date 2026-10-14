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
    const subjectId = searchParams.get("subjectId");
    const level = searchParams.get("level");
    const grade = searchParams.get("grade");
    const versionId = searchParams.get("versionId");

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (level && level !== "ALL") where.level = level;

    const curriculums = await (prisma as any).specialCurriculum.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        subject: {
          select: { id: true, code: true, name: true, color: true, icon: true }
        },
        versions: {
          where: versionId ? { id: versionId } : undefined,
          orderBy: { createdAt: "desc" },
          include: {
            gradeConfigs: {
              where: grade && grade !== "ALL" ? { grade } : undefined,
              orderBy: { grade: "asc" },
              include: {
                criteria: {
                  include: {
                    rubricLevels: {
                      orderBy: { sortOrder: "asc" }
                    }
                  }
                }
              }
            },
            topics: {
              where: grade && grade !== "ALL" ? { grade } : undefined,
              orderBy: [{ grade: "asc" }, { sortOrder: "asc" }]
            },
            lessons: {
              where: grade && grade !== "ALL" ? { grade } : undefined,
              orderBy: [{ grade: "asc" }, { periodIndex: "asc" }],
              include: {
                topic: { select: { id: true, name: true, code: true } }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ curriculums });
  } catch (error: any) {
    console.error("[SpecialCurriculum GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic) {
      return NextResponse.json({ error: "Forbidden: Không có quyền quản lý chương trình" }, { status: 403 });
    }

    const body = await req.json();
    const { action, curriculumId, versionId, status } = body;

    // Action: Change status (e.g. Publish version)
    if (action === "publish_version" && versionId) {
      const updated = await (prisma as any).specialCurriculumVersion.update({
        where: { id: versionId },
        data: {
          status: status || "PUBLISHED",
          approvedBy: session.userId,
          approvedAt: new Date()
        }
      });
      return NextResponse.json({ version: updated, message: "Đã cập nhật trạng thái phiên bản" });
    }

    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    console.error("[SpecialCurriculum POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
