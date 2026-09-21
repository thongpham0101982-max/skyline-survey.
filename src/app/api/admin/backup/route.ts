import { NextRequest, NextResponse } from "next/navigation";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

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
      const filePath = path.join(BACKUP_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const contentType = safeName.endsWith(".gz") 
        ? "application/gzip" 
        : safeName.endsWith(".db") 
        ? "application/x-sqlite3" 
        : "application/octet-stream";

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
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
