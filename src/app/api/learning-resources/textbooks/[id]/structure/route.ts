import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy cấu trúc chi tiết Chương - Bài của sách
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const chapters = await prisma.textbookChapter.findMany({
      where: { textbookId: id },
      orderBy: { sortOrder: "asc" },
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    return NextResponse.json({ success: true, data: chapters });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Lưu hoặc Phê duyệt cấu trúc Chương - Bài (Human-in-the-loop approval)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const currentUserId = (session.user as any).id || "SYSTEM";
    const currentUserEmail = session.user.email || "system@skylineschool.edu.vn";

    const body = await req.json();
    const { chapters, markReady } = body;

    if (!Array.isArray(chapters)) {
      return NextResponse.json({ error: "Danh sách Chương - Bài không hợp lệ." }, { status: 400 });
    }

    // 1. Xóa cấu trúc cũ và lưu cấu trúc mới đã được người dùng chỉnh sửa/xác nhận
    await prisma.textbookChapter.deleteMany({ where: { textbookId: id } });

    let chIndex = 1;
    for (const ch of chapters) {
      const createdChapter = await prisma.textbookChapter.create({
        data: {
          textbookId: id,
          chapterNumber: ch.chapterNumber || `Chương ${chIndex}`,
          title: ch.title || `Chương ${chIndex}`,
          sortOrder: ch.sortOrder || chIndex++
        }
      });

      if (Array.isArray(ch.lessons)) {
        let lesIndex = 1;
        for (const les of ch.lessons) {
          await prisma.textbookLesson.create({
            data: {
              chapterId: createdChapter.id,
              lessonNumber: les.lessonNumber || `Bài ${lesIndex}`,
              title: les.title || `Bài ${lesIndex}`,
              pageStart: Number(les.pageStart || 1),
              pageEnd: Number(les.pageEnd || les.pageStart || 1),
              summary: les.summary || null,
              keywords: les.keywords ? JSON.stringify(les.keywords) : null,
              sortOrder: les.sortOrder || lesIndex++
            }
          });
        }
      }
    }

    // 2. Nếu bấm Phê duyệt (markReady = true), chuyển trạng thái sang READY
    if (markReady) {
      await prisma.textbook.update({
        where: { id },
        data: {
          processingStatus: "READY",
          aiIndexStatus: "INDEXED"
        }
      });
    }

    await logActivity(
      currentUserId,
      currentUserEmail,
      markReady ? "TEXTBOOK_STRUCTURE_APPROVED" : "TEXTBOOK_STRUCTURE_UPDATED",
      "Textbook",
      id,
      null,
      { chaptersCount: chapters.length, markReady }
    );

    return NextResponse.json({
      success: true,
      message: markReady
        ? "Đã phê duyệt và xuất bản cấu trúc Sách giáo khoa thành công!"
        : "Đã lưu bản nháp cấu trúc Chương - Bài thành công."
    });
  } catch (error: any) {
    console.error("Structure update error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
