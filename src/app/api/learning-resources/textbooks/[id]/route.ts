import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy chi tiết một cuốn SGK kèm cây thư mục Chương - Bài
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
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        subject: true,
        series: true,
        publisher: true,
        schoolYear: true,
        source: true,
        chapters: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" }
            }
          }
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    if (!textbook) {
      return NextResponse.json({ error: "Không tìm thấy sách giáo khoa." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: textbook });
  } catch (error: any) {
    console.error("GET Textbook Detail Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Cập nhật thông tin SGK (Metadata hoặc Trạng thái phê duyệt)
 */
export async function PUT(
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

    const oldTextbook = await prisma.textbook.findUnique({ where: { id } });
    if (!oldTextbook) {
      return NextResponse.json({ error: "Không tìm thấy sách giáo khoa." }, { status: 404 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.volume !== undefined) updateData.volume = body.volume;
    if (body.editionYear !== undefined) updateData.editionYear = Number(body.editionYear);
    if (body.isbn !== undefined) updateData.isbn = String(body.isbn).trim();
    if (body.licenseNote !== undefined) updateData.licenseNote = String(body.licenseNote).trim();
    if (body.processingStatus !== undefined) updateData.processingStatus = body.processingStatus;
    if (body.aiIndexStatus !== undefined) updateData.aiIndexStatus = body.aiIndexStatus;
    if (body.totalPages !== undefined) updateData.totalPages = Number(body.totalPages);

    const updatedTextbook = await prisma.textbook.update({
      where: { id },
      data: updateData,
      include: {
        subject: true,
        series: true,
        publisher: true
      }
    });

    await logActivity(
      currentUserId,
      currentUserEmail,
      "TEXTBOOK_EDIT",
      "Textbook",
      id,
      oldTextbook,
      updateData
    );

    return NextResponse.json({
      success: true,
      message: "Cập nhật sách giáo khoa thành công.",
      data: updatedTextbook
    });
  } catch (error: any) {
    console.error("PUT Textbook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Xóa SGK và các file vật lý liên quan
 */
export async function DELETE(
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

    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return NextResponse.json({ error: "Không tìm thấy sách giáo khoa." }, { status: 404 });
    }

    // 1. Xóa các file vật lý
    const uploadDir = path.join(process.cwd(), "public", "uploads", "textbooks", id);
    if (fs.existsSync(uploadDir)) {
      try {
        fs.rmSync(uploadDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Could not delete physical textbook folder:", e);
      }
    }

    // 2. Xóa bản ghi trong DB (Cascade sẽ xóa Chapters, Lessons, Pages, Chunks, Jobs)
    await prisma.textbook.delete({ where: { id } });

    // 3. Ghi Audit Log
    await logActivity(
      currentUserId,
      currentUserEmail,
      "TEXTBOOK_DELETE",
      "Textbook",
      id,
      textbook,
      null
    );

    return NextResponse.json({
      success: true,
      message: "Đã xóa sách giáo khoa thành công."
    });
  } catch (error: any) {
    console.error("DELETE Textbook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
