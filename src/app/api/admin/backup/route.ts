import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { Readable } from "stream";

const BACKUP_DIR = path.join(process.cwd(), "data-backups");

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role || "";
    const isAdmin = ["ADMIN", "SUPERADMIN"].includes(userRole.toUpperCase());

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadFileName = searchParams.get("download");

    if (downloadFileName) {
      // Validate filename to avoid path traversal
      const safeName = path.basename(downloadFileName);
      let filePath = path.join(BACKUP_DIR, safeName);
      let isGzSourceForDb = false;

      // Hỗ trợ giải nén On-the-fly qua luồng Stream nếu quản trị viên tải tệp .db nhưng server chỉ lưu tệp nén .db.gz
      if (!fs.existsSync(filePath)) {
        if (safeName.endsWith(".db")) {
          const gzAlternative = path.join(BACKUP_DIR, `${safeName}.gz`);
          if (fs.existsSync(gzAlternative)) {
            filePath = gzAlternative;
            isGzSourceForDb = true;
          } else {
            return NextResponse.json({ error: "File not found." }, { status: 404 });
          }
        } else {
          return NextResponse.json({ error: "File not found." }, { status: 404 });
        }
      }

      // Ghi nhận Audit Log quản trị an ninh
      try {
        const clientIp =
          req.headers.get("x-forwarded-for")?.split(",")[0] ||
          req.headers.get("x-real-ip") ||
          "127.0.0.1";
        await logActivity(
          session.user.id || (session.user as any).email || "ADMIN",
          (session.user as any).email || "",
          "DOWNLOAD_BACKUP",
          "data-backups",
          safeName,
          null,
          {
            filename: safeName,
            ip: clientIp,
            mode: isGzSourceForDb ? "stream_decompressed_db" : "stream_direct"
          },
          clientIp
        );
      } catch (logErr) {
        console.warn("[AuditLog Warning]:", logErr);
      }

      if (isGzSourceForDb) {
        // Tìm kích thước gốc từ _meta.json (nếu có) để hiển thị tiến trình tải trên trình duyệt
        const metaFileName = safeName.replace(/\.db$/, "_meta.json");
        const metaPath = path.join(BACKUP_DIR, metaFileName);
        let expectedDbSize: number | undefined;
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            if (meta.dbSizeBytes && Number(meta.dbSizeBytes) > 0) {
              expectedDbSize = Number(meta.dbSizeBytes);
            }
          } catch {}
        }

        const decompressedNodeStream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
        const webStream = Readable.toWeb(decompressedNodeStream) as ReadableStream;

        const headers: Record<string, string> = {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Cache-Control": "no-store"
        };
        if (expectedDbSize) {
          headers["Content-Length"] = expectedDbSize.toString();
        }

        return new Response(webStream, { headers });
      }

      const stat = fs.statSync(filePath);
      const fileNodeStream = fs.createReadStream(filePath);
      const webStream = Readable.toWeb(fileNodeStream) as ReadableStream;
      const contentType = safeName.endsWith(".gz")
        ? "application/gzip"
        : safeName.endsWith(".db")
          ? "application/x-sqlite3"
          : "application/octet-stream";

      return new Response(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Content-Length": stat.size.toString(),
          "Cache-Control": "no-store"
        }
      });
    }

    // Return backup list if not downloading
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const metaFiles = files
      .filter((f) => f.startsWith("skyline_backup_") && f.endsWith("_meta.json"))
      .map((f) => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), "utf8"));
          return content;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups: metaFiles });
  } catch (err: any) {
    console.error("[Backup API Error]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
