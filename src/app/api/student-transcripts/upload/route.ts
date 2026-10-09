import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const studentCode = formData.get("studentCode") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên" }, { status: 400 });
    }

    // Giới hạn 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Dung lượng file vượt quá giới hạn 15MB" }, { status: 400 });
    }

    // Đảm bảo thư mục lưu trữ tồn tại
    const uploadDir = path.join(process.cwd(), "public", "uploads", "transcripts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Tạo tên file an toàn
    const originalName = file.name;
    const ext = path.extname(originalName) || ".pdf";
    const cleanBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]/g, "_");
    const uniqueFileName = `${cleanBaseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/transcripts/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      file: {
        name: originalName,
        url: publicUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error("Lỗi tải lên học bạ:", error);
    return NextResponse.json({ error: "Lỗi xử lý file tải lên: " + (error?.message || "") }, { status: 500 });
  }
}
