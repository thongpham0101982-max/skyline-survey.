import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import {
  getTextbooks,
  calculateFileHash,
  validateSourceUrl,
  checkTextbookDuplicate
} from "@/lib/textbooks/service";
import { startTextbookProcessing } from "@/lib/textbooks/processor";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách Sách giáo khoa theo bộ lọc
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade") || "ALL";
    const subjectId = searchParams.get("subjectId") || "ALL";
    const seriesId = searchParams.get("seriesId") || "ALL";
    const publisherId = searchParams.get("publisherId") || "ALL";
    const processingStatus = searchParams.get("processingStatus") || "ALL";
    const sourceType = searchParams.get("sourceType") || "ALL";
    const search = searchParams.get("search") || "";

    const textbooks = await getTextbooks({
      grade,
      subjectId,
      seriesId,
      publisherId,
      processingStatus,
      sourceType,
      search
    });

    return NextResponse.json({
      success: true,
      data: textbooks
    });
  } catch (error: any) {
    console.error("GET Textbooks Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Tạo mới hoặc Tải lên SGK (Upload PDF hoặc Import URL)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    const currentUserId = (session.user as any).id || "SYSTEM";
    const currentUserEmail = session.user.email || "system@skylineschool.edu.vn";

    let title = "";
    let subjectId = "";
    let grade = "";
    let seriesId = "";
    let publisherId = "";
    let volume = "TAP_1";
    let editionYear = 2024;
    let isbn = "";
    let sourceType = "UPLOAD_PDF";
    let sourceUrl = "";
    let licenseNote = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let fileSize = 0;
    let fileHash: string | undefined = undefined;

    // 1. Xử lý FormData khi upload file PDF
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = String(formData.get("title") || "").trim();
      subjectId = String(formData.get("subjectId") || "").trim();
      grade = String(formData.get("grade") || "").trim();
      seriesId = String(formData.get("seriesId") || "").trim();
      publisherId = String(formData.get("publisherId") || "").trim();
      volume = String(formData.get("volume") || "TAP_1").trim();
      editionYear = Number(formData.get("editionYear") || 2024);
      isbn = String(formData.get("isbn") || "").trim();
      sourceType = String(formData.get("sourceType") || "UPLOAD_PDF").trim();
      sourceUrl = String(formData.get("sourceUrl") || "").trim();
      licenseNote = String(formData.get("licenseNote") || "").trim();

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        fileName = file.name;
        fileSize = file.size;
        fileHash = calculateFileHash(fileBuffer);
      }
    } else {
      // 2. Xử lý JSON khi import URL
      const body = await req.json();
      title = (body.title || "").trim();
      subjectId = (body.subjectId || "").trim();
      grade = String(body.grade || "").trim();
      seriesId = (body.seriesId || "").trim();
      publisherId = (body.publisherId || "").trim();
      volume = body.volume || "TAP_1";
      editionYear = Number(body.editionYear || 2024);
      isbn = (body.isbn || "").trim();
      sourceType = body.sourceType || "IMPORT_URL";
      sourceUrl = (body.sourceUrl || "").trim();
      licenseNote = (body.licenseNote || "").trim();
    }

    // 3. Validation cơ bản
    if (!subjectId || !grade || !seriesId || !publisherId) {
      return NextResponse.json(
        { error: "Vui lòng chọn đầy đủ Môn học, Khối lớp, Bộ sách và Nhà xuất bản." },
        { status: 400 }
      );
    }

    // Nếu không nhập tiêu đề, tự động sinh từ thông tin đã chọn
    if (!title) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { subjectName: true } });
      const series = await prisma.textbookSeries.findUnique({ where: { id: seriesId }, select: { name: true } });
      const volText = volume === "TAP_1" ? "Tập 1" : volume === "TAP_2" ? "Tập 2" : "Toàn tập";
      title = `${subject?.subjectName || "Môn"} ${grade} - ${volText} (${series?.name || "SGK"})`;
    }

    // 4. Kiểm tra Whitelist nếu là Import URL (Mục VII)
    let sourceId: string | null = null;
    if (sourceType === "IMPORT_URL" && sourceUrl) {
      const check = await validateSourceUrl(sourceUrl);
      if (!check.valid) {
        return NextResponse.json(
          { error: check.reason || "URL không thuộc danh mục nguồn được phê duyệt (Whitelist)." },
          { status: 400 }
        );
      }
      sourceId = check.source?.id || null;
    }

    // 5. Kiểm tra chống trùng dữ liệu (Mục XXIII)
    const dupCheck = await checkTextbookDuplicate({
      subjectId,
      grade,
      seriesId,
      publisherId,
      volume,
      editionYear,
      fileHash
    });

    if (dupCheck.duplicate) {
      return NextResponse.json(
        {
          error: dupCheck.message || "Sách giáo khoa này đã tồn tại trong hệ thống.",
          existingId: dupCheck.existingTextbook?.id,
          duplicate: true
        },
        { status: 409 }
      );
    }

    // 6. Lưu file vật lý vào thư mục bảo vệ
    const bookId = "tb_" + Date.now();
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "textbooks", bookId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let storageKey = "";
    let fileUrl = "";

    if (fileBuffer) {
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      storageKey = path.join(uploadsDir, safeName).replace(/\\/g, "/");
      fs.writeFileSync(storageKey, fileBuffer);
      fileUrl = `/api/learning-resources/textbooks/${bookId}/file`;
    } else {
      // Đối với URL hoặc tài liệu tham chiếu
      storageKey = path.join(uploadsDir, "document.pdf").replace(/\\/g, "/");
      // Tạo placeholder file nhẹ nếu không có buffer
      fs.writeFileSync(storageKey, Buffer.from("%PDF-1.4 Mock Digital Textbook"));
      fileUrl = `/api/learning-resources/textbooks/${bookId}/file`;
    }

    // 7. Tạo bản ghi Textbook trong cơ sở dữ liệu
    const newTextbook = await prisma.textbook.create({
      data: {
        id: bookId,
        title,
        subjectId,
        grade,
        seriesId,
        publisherId,
        sourceId,
        volume,
        editionYear,
        isbn: isbn || null,
        coverUrl: `/api/learning-resources/textbooks/${bookId}/cover`,
        sourceType,
        sourceUrl: sourceUrl || null,
        fileUrl,
        storageKey,
        fileHash: fileHash || null,
        fileSize,
        totalPages: 120, // ước tính mặc định, processor sẽ cập nhật
        licenseNote: licenseNote || null,
        processingStatus: "NEW",
        aiIndexStatus: "PENDING",
        createdById: currentUserId
      },
      include: {
        subject: { select: { subjectName: true } },
        series: { select: { name: true } },
        publisher: { select: { name: true } }
      }
    });

    // 8. Ghi Audit Log (Mục XXIV)
    await logActivity(
      currentUserId,
      currentUserEmail,
      "TEXTBOOK_UPLOAD",
      "Textbook",
      newTextbook.id,
      null,
      { title, grade, subjectId, seriesId, volume }
    );

    // 9. Khởi động tiến trình xử lý ngầm (Background Worker - Mục XXV)
    startTextbookProcessing(newTextbook.id, currentUserId, currentUserEmail).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Tải lên và khởi tạo SGK thành công. Hệ thống đang tiến hành bóc tách cấu trúc ngầm.",
      data: newTextbook
    });
  } catch (error: any) {
    console.error("POST Textbook Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi khởi tạo sách giáo khoa." },
      { status: 500 }
    );
  }
}
