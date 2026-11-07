import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewPost } from "@/lib/skyline-connect/permissions";
import { resolveSlcUserContext } from "@/lib/skyline-connect/service";
import { ensureSlcSchema } from "@/lib/skyline-connect/schema-init";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Vui lòng đăng nhập để truy cập tệp đính kèm." },
        { status: 401 }
      );
    }

    const ctx = await resolveSlcUserContext(session.user as any);
    if (!ctx) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Không xác định được hồ sơ người dùng." },
        { status: 401 }
      );
    }

    await ensureSlcSchema();
    const { id } = await context.params;
    const pAny = prisma as any;

    const attachment = await pAny.slcAttachment.findUnique({
      where: { id },
    });

    if (!attachment || attachment.isDeleted) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Tệp đính kèm không tồn tại hoặc đã bị xóa." },
        { status: 404 }
      );
    }

    // If attached to a comment, ensure the comment is NOT deleted or hidden
    if (attachment.commentId) {
      const comment = await pAny.slcComment.findUnique({
        where: { id: attachment.commentId },
      });
      if (!comment || comment.isDeleted || comment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Bình luận chứa tệp này đã bị xóa hoặc ẩn." },
          { status: 404 }
        );
      }
    }

    // Enforce inherited post permission (Rule IV & IX.4: "Tệp phải kế thừa quyền bài", "không phục vụ tệp trực tiếp khi chưa kiểm tra quyền")
    if (attachment.postId) {
      const post = await pAny.slcPost.findUnique({
        where: { id: attachment.postId },
      });
      if (!post) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Bài đăng gốc không tồn tại." },
          { status: 404 }
        );
      }

      let groupVisibility: string | null = null;
      if (post.groupId) {
        const grp = await pAny.slcGroup.findUnique({ where: { id: post.groupId } });
        groupVisibility = grp?.visibility || "PRIVATE";
      }

      if (
        !canViewPost(ctx, {
          id: post.id,
          authorId: post.authorId,
          status: post.status,
          visibility: post.visibility,
          campusId: post.campusId,
          groupId: post.groupId,
          groupVisibility,
        })
      ) {
        return NextResponse.json(
          {
            error: "PERMISSION_DENIED",
            message: "Thầy/Cô không có quyền truy cập tệp đính kèm thuộc phạm vi hạn chế này.",
          },
          { status: 403 }
        );
      }
    } else if (attachment.uploaderId !== ctx.userId) {
      return NextResponse.json(
        { error: "PERMISSION_DENIED", message: "Không có quyền truy cập tệp nháp của người khác." },
        { status: 403 }
      );
    }

    const storageDir = path.join(process.cwd(), ".slc_private_uploads");
    const diskPath = path.join(storageDir, attachment.safeFileName);
    if (!fs.existsSync(diskPath)) {
      return NextResponse.json(
        { error: "FILE_MISSING", message: "Tệp vật lý không tồn tại trên máy chủ." },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(diskPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err?.message || "Lỗi khi tải tệp đính kèm." },
      { status: 500 }
    );
  }
}
