import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveSlcUserContext } from "@/lib/skyline-connect/service";
import { buildSafeSkillDownloadPackage } from "@/lib/skyline-connect/skills-service";
import { ensureSlcSchema } from "@/lib/skyline-connect/schema-init";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Vui lòng đăng nhập để tải Skill môn học." },
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
    const pkg = await buildSafeSkillDownloadPackage(ctx, id);

    return new NextResponse(new Uint8Array(pkg.buffer), {
      status: 200,
      headers: {
        "Content-Type": pkg.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(pkg.fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: any) {
    const msg = String(err?.message || "Không thể tải gói Skill môn học.");
    const isPerm = msg.includes("PERMISSION_DENIED");
    const isNotFound = msg.includes("NOT_FOUND");
    return NextResponse.json(
      {
        error: isPerm ? "PERMISSION_DENIED" : isNotFound ? "NOT_FOUND" : "DOWNLOAD_ERROR",
        message: msg.replace("PERMISSION_DENIED: ", "").replace("NOT_FOUND: ", ""),
      },
      { status: isPerm ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
