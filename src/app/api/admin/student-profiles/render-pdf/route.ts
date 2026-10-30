import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";

// Allowed roles for generating student profile PDFs
const ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "KT_DBCL",
  "KTDBCL",
  "GDCS",
  "GD_CS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "BGH",
  "TEACHER",
  "GV_MN",
];

// Singleton browser instance for high performance and zero process-churn
let sharedBrowser: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  if (browserInitPromise) {
    return browserInitPromise;
  }

  browserInitPromise = (async () => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
        ],
      });

      browser.on("disconnected", () => {
        sharedBrowser = null;
        browserInitPromise = null;
      });

      sharedBrowser = browser;
      return browser;
    } finally {
      browserInitPromise = null;
    }
  })();

  return browserInitPromise;
}

const staticFileDataUrlCache = new Map<string, string>();

function getMimeTypeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

/**
 * Chuyển đổi toàn bộ đường dẫn ảnh nội bộ (/images/..., /uploads/..., /api/student-photos/...)
 * trong HTML sang dạng Base64 Data URI trực tiếp từ ổ đĩa và CSDL trước khi đưa vào Puppeteer.
 * Đảm bảo 100% không bao giờ mất hình nền hay mất ảnh học sinh khi xuất PDF.
 */
async function inlineAllLocalImagesInHtml(rawHtml: string): Promise<string> {
  const srcRegex = /(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi;
  const matches = Array.from(rawHtml.matchAll(srcRegex));
  if (matches.length === 0) return rawHtml;

  const uniqueUrls = Array.from(
    new Set(
      matches
        .map((m) => m[2])
        .filter((u) => u && !u.startsWith("data:"))
    )
  );

  if (uniqueUrls.length === 0) return rawHtml;

  const resolvedMap = new Map<string, string>();

  for (const rawUrl of uniqueUrls) {
    try {
      const decodedUrl = rawUrl.replace(/&amp;/g, "&");
      let pathname = decodedUrl;
      let searchParams = new URLSearchParams();

      if (decodedUrl.startsWith("http://") || decodedUrl.startsWith("https://")) {
        const parsed = new URL(decodedUrl);
        pathname = parsed.pathname;
        searchParams = parsed.searchParams;
      } else {
        const qIdx = decodedUrl.indexOf("?");
        if (qIdx !== -1) {
          pathname = decodedUrl.slice(0, qIdx);
          searchParams = new URLSearchParams(decodedUrl.slice(qIdx + 1));
        }
      }

      // 1. Trường hợp ảnh tĩnh trong thư mục public (/images/..., /uploads/..., /logo.png...)
      if (
        pathname.startsWith("/images/") ||
        pathname.startsWith("/uploads/") ||
        pathname.startsWith("/icons/") ||
        pathname === "/logo.png" ||
        pathname === "/logo-skyline.png"
      ) {
        const safeRelPath = pathname.replace(/^\/+/, "");
        const fullDiskPath = path.join(process.cwd(), "public", safeRelPath);
        if (fs.existsSync(fullDiskPath)) {
          const stat = fs.statSync(fullDiskPath);
          const cacheKey = `${pathname}:${stat.mtimeMs}`;
          if (staticFileDataUrlCache.has(cacheKey)) {
            resolvedMap.set(rawUrl, staticFileDataUrlCache.get(cacheKey)!);
            continue;
          }
          const buf = fs.readFileSync(fullDiskPath);
          const mime = getMimeTypeFromExt(fullDiskPath);
          const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
          staticFileDataUrlCache.set(cacheKey, dataUrl);
          resolvedMap.set(rawUrl, dataUrl);
          continue;
        }
      }

      // 2. Trường hợp ảnh học sinh từ Cổng ảnh học sinh (/api/student-photos/[studentId]?code=...)
      if (pathname.startsWith("/api/student-photos/")) {
        const rawStudentId = decodeURIComponent(
          pathname.replace("/api/student-photos/", "").split("/")[0] || ""
        ).trim();
        const codeParam = (searchParams.get("code") || "").trim();

        let photo = null;
        if (rawStudentId) {
          photo = await prisma.studentPhoto
            .findUnique({ where: { studentId: rawStudentId } })
            .catch(() => null);
        }

        if (!photo) {
          const terms = [rawStudentId, codeParam].filter(Boolean);
          if (terms.length > 0) {
            const st = await prisma.student
              .findFirst({
                where: {
                  OR: [
                    { id: { in: terms } },
                    { studentCode: { in: terms } },
                  ],
                },
                select: { id: true, studentCode: true },
              })
              .catch(() => null);

            if (st?.studentCode) {
              const allWithCode = await prisma.student
                .findMany({
                  where: { studentCode: st.studentCode },
                  select: { id: true },
                })
                .catch(() => []);
              const allIds = Array.from(
                new Set([st.id, ...allWithCode.map((x) => x.id)])
              );
              photo = await prisma.studentPhoto
                .findFirst({
                  where: { studentId: { in: allIds } },
                  orderBy: { updatedAt: "desc" },
                })
                .catch(() => null);
            }
          }
        }

        if (photo && photo.photoData) {
          let dataUrl = photo.photoData;
          if (!dataUrl.startsWith("data:")) {
            const ct = photo.contentType || "image/jpeg";
            dataUrl = `data:${ct};base64,${dataUrl}`;
          }
          resolvedMap.set(rawUrl, dataUrl);
          continue;
        }

        // Fallback kiểm tra file ảnh trong public/uploads/students
        for (const candidate of [rawStudentId, codeParam].filter(Boolean)) {
          let foundDisk = false;
          for (const ext of ["jpg", "jpeg", "png", "webp"]) {
            const localPhotoPath = path.join(
              process.cwd(),
              "public",
              "uploads",
              "students",
              `${candidate}.${ext}`
            );
            if (fs.existsSync(localPhotoPath)) {
              const buf = fs.readFileSync(localPhotoPath);
              const mime = getMimeTypeFromExt(localPhotoPath);
              resolvedMap.set(rawUrl, `data:${mime};base64,${buf.toString("base64")}`);
              foundDisk = true;
              break;
            }
          }
          if (foundDisk) break;
        }
      }
    } catch (_) {}
  }

  if (resolvedMap.size === 0) return rawHtml;

  return rawHtml.replace(srcRegex, (fullMatch, prefix, srcVal, suffix) => {
    const inlined = resolvedMap.get(srcVal);
    if (inlined) {
      return `${prefix}${inlined}${suffix}`;
    }
    return fullMatch;
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userRole = String((session?.user as any)?.role || "").toUpperCase();
    const isAllowed = ALLOWED_ROLES.some((r) => userRole.includes(r));
    if (!isAllowed) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await req.json();
    const { html, fileName, landscape, margin } = body;
    const isLandscape = Boolean(landscape);

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Thiếu nội dung HTML cần xuất" }, { status: 400 });
    }

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Tỉ lệ A4 chuẩn 384 DPI (deviceScaleFactor: 4) giúp ảnh và đồ họa sắc nét tối đa khi in
      await page.setViewport({
        width: isLandscape ? 1123 : 794,
        height: isLandscape ? 794 : 1123,
        deviceScaleFactor: 4,
      });
      await page.emulateMediaType("print");

      // Nhúng trực tiếp toàn bộ hình nền và ảnh học sinh sang Base64 để không phụ thuộc mạng/cookie
      const inlinedHtml = await inlineAllLocalImagesInHtml(html);

      // Nạp HTML và chờ tải xong tài nguyên
      await page.setContent(inlinedHtml, {
        waitUntil: "load",
        timeout: 25000,
      });

      // Đợi hoàn thành tải font chữ và giải mã (decode) 100% hình ảnh trước khi xuất PDF
      try {
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
          const imgs = Array.from(document.images);
          await Promise.all(
            imgs.map(async (img) => {
              if (!img.complete) {
                await new Promise((resolve) => {
                  img.onload = img.onerror = resolve;
                  setTimeout(resolve, 4000);
                });
              }
              if (typeof img.decode === "function") {
                await img.decode().catch(() => {});
              }
            })
          );
        });
      } catch (_) {}

      // Xuất PDF chuẩn A4, bảo toàn đồ họa nền (printBackground: true) và kích thước @page
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: isLandscape,
        printBackground: true,
        preferCSSPageSize: true,
        scale: 1,
        margin: margin || {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      });

      await page.close();

      const safeFileName = fileName || "Ho_so_hoc_sinh.pdf";
      const asciiFileName = safeFileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9_\-\.]/g, "_");
      const encodedFileName = encodeURIComponent(safeFileName);

      return new Response(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    } catch (pageError: any) {
      try {
        await page.close();
      } catch (_) {}
      throw pageError;
    }
  } catch (error: any) {
    console.error("Lỗi khi render PDF hồ sơ học sinh:", error);
    return NextResponse.json(
      { error: "Lỗi kết xuất PDF: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
