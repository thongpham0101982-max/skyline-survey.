import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SECURITY_HEADERS = {
  "Content-Type": "application/pdf",
  "Accept-Ranges": "bytes",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Authorization, Content-Type",
  "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
  "Content-Security-Policy": "frame-ancestors 'self' https://ssm.skylineschool.edu.vn http://localhost:3000 http://192.168.10.239:3000 https://*.skylineschool.edu.vn",
  "Cross-Origin-Resource-Policy": "cross-origin"
};

/**
 * OPTIONS: Preflight check for PDF viewers & CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: SECURITY_HEADERS
  });
}

function resolvePdfPath(textbook: { id: string; storageKey: string }): string | null {
  let filePath = textbook.storageKey;
  if (filePath && fs.existsSync(filePath)) {
    return filePath;
  }
  const textbookDir = path.join(process.cwd(), "public", "uploads", "textbooks", textbook.id);
  if (fs.existsSync(textbookDir)) {
    const files = fs.readdirSync(textbookDir);
    const pdfFile = files.find((f) => f.toLowerCase().endsWith(".pdf"));
    if (pdfFile) {
      return path.join(textbookDir, pdfFile);
    }
  }
  return null;
}

/**
 * HEAD: Inspect headers without body (for PDF page viewers & Range detection)
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      select: { id: true, title: true, storageKey: true, fileSize: true }
    });

    if (!textbook) {
      return new NextResponse(null, { status: 404 });
    }

    const filePath = resolvePdfPath(textbook);
    const fileSize = filePath && fs.existsSync(filePath) ? fs.statSync(filePath).size : (textbook.fileSize || 65536);

    return new NextResponse(null, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        "Content-Length": String(fileSize),
        "Content-Disposition": `inline; filename="${encodeURIComponent(textbook.title)}.pdf"`
      }
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET: Phục vụ file PDF sách giáo khoa có kiểm tra xác thực và hỗ trợ HTTP Range (Streaming)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Xác thực linh hoạt: session đăng nhập HOẶC referer hợp lệ trong hệ sinh thái Sky-Line / iframe subresource
    const session = await auth();
    const referer = req.headers.get("referer") || "";
    const secFetchDest = req.headers.get("sec-fetch-dest") || "";
    const isInternalSkylineOrigin =
      referer.includes("skylineschool.edu.vn") ||
      referer.includes("localhost") ||
      referer.includes("192.168.") ||
      ["iframe", "embed", "object"].includes(secFetchDest);

    if (!session?.user && !isInternalSkylineOrigin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      select: { id: true, title: true, storageKey: true, fileSize: true }
    });

    if (!textbook) {
      return new NextResponse("Textbook not found", { status: 404 });
    }

    let filePath = resolvePdfPath(textbook);

    // Fallback: nếu chưa có file, tạo một file PDF tạm thời
    if (!filePath || !fs.existsSync(filePath)) {
      const minimalPdf = Buffer.from(
        `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF`
      );
      return new NextResponse(minimalPdf, {
        headers: {
          ...SECURITY_HEADERS,
          "Content-Disposition": `inline; filename="${encodeURIComponent(textbook.title)}.pdf"`,
          "Content-Length": String(minimalPdf.length)
        }
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    if (range) {
      // Xử lý HTTP Range (Streaming từng trang cho PDF reader)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        }
      });

      return new NextResponse(stream, {
        status: 206,
        headers: {
          ...SECURITY_HEADERS,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(chunksize),
          "Content-Disposition": `inline; filename="${encodeURIComponent(textbook.title)}.pdf"`
        }
      });
    }

    // Không có Range: Trả về toàn bộ file
    const fileStream = fs.createReadStream(filePath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      }
    });

    return new NextResponse(stream, {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Length": String(fileSize),
        "Content-Disposition": `inline; filename="${encodeURIComponent(textbook.title)}.pdf"`
      }
    });
  } catch (error: any) {
    console.error("Serve Textbook PDF Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
