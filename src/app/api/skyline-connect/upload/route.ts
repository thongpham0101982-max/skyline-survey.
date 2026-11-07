import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateUploadFile } from "@/lib/skyline-connect/security";
import { resolveSlcUserContext } from "@/lib/skyline-connect/service";
import { ensureSlcSchema } from "@/lib/skyline-connect/schema-init";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Vui lòng đăng nhập để tải tệp lên." },
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const postId = (formData.get("postId") as string | null) || null;
    const commentId = (formData.get("commentId") as string | null) || null;

    if (!file) {
      return NextResponse.json(
        { error: "MISSING_FILE", message: "Vui lòng chọn tệp đính kèm." },
        { status: 400 }
      );
    }

    const validation = validateUploadFile({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: "INVALID_FILE", message: validation.error },
        { status: 400 }
      );
    }

    // Store in private storage directory (NOT directly served without permission check)
    const storageDir = path.join(process.cwd(), ".slc_private_uploads");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const diskPath = path.join(storageDir, validation.safeFileName);
    fs.writeFileSync(diskPath, buffer);

    const pAny = prisma as any;
    const attachment = await pAny.slcAttachment.create({
      data: {
        postId,
        commentId,
        uploaderId: ctx.userId,
        fileName: file.name,
        safeFileName: validation.safeFileName,
        mimeType: file.type.toLowerCase(),
        fileSize: file.size,
        fileUrl: "", // Updated right below with protected endpoint URL
        attachmentType: validation.attachmentType,
      },
    });

    const protectedUrl = `/api/skyline-connect/attachments/${attachment.id}`;
    const updated = await pAny.slcAttachment.update({
      where: { id: attachment.id },
      data: { fileUrl: protectedUrl },
    });

    return NextResponse.json({
      ok: true,
      attachment: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "UPLOAD_ERROR",
        message: err?.message || "Không thể tải tệp lên.",
      },
      { status: 500 }
    );
  }
}
