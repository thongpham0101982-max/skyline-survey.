import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user?.role || "").toUpperCase();

    if (userRole !== "ADMIN" && userRole !== "TBP") {
      return Response.json({ error: "Thao tác yêu cầu quyền Quản trị hoặc Ban ĐHCM." }, { status: 403 });
    }

    const docs = await prisma.knowledgeDocument.findMany({
      orderBy: { createdAt: "desc" }
    });

    return Response.json({ success: true, documents: docs });
  } catch (error: any) {
    console.error("Knowledge Admin API GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user?.role || "").toUpperCase();

    if (userRole !== "ADMIN" && userRole !== "TBP") {
      return Response.json({ error: "Thao tác yêu cầu quyền Quản trị hoặc Ban ĐHCM." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      title,
      category = "GENERAL",
      version = "1.0",
      schoolYear = "2026-2027",
      effectiveDate = new Date().toISOString().split("T")[0],
      source,
      content,
      roleScope = ["ADMIN", "TEACHER", "PARENT", "STUDENT"],
      campusScope = ["ALL"],
      status = "ACTIVE"
    } = body;

    if (!title || !content || !source) {
      return Response.json({ error: "Vui lòng nhập đầy đủ Tiêu đề, Số hiệu văn bản (Nguồn) và Nội dung quy định." }, { status: 400 });
    }

    if (id) {
      // Update existing
      const updated = await prisma.knowledgeDocument.update({
        where: { id },
        data: {
          title,
          category,
          version,
          schoolYear,
          effectiveDate,
          source,
          content,
          roleScope: typeof roleScope === "string" ? roleScope : JSON.stringify(roleScope),
          campusScope: typeof campusScope === "string" ? campusScope : JSON.stringify(campusScope),
          status
        }
      });
      return Response.json({ success: true, document: updated });
    }

    // Create new
    const created = await prisma.knowledgeDocument.create({
      data: {
        title,
        category,
        version,
        schoolYear,
        effectiveDate,
        source,
        content,
        roleScope: typeof roleScope === "string" ? roleScope : JSON.stringify(roleScope),
        campusScope: typeof campusScope === "string" ? campusScope : JSON.stringify(campusScope),
        status,
        createdBy: session?.user?.name || "Ban ĐHCM"
      }
    });

    return Response.json({ success: true, document: created });
  } catch (error: any) {
    console.error("Knowledge Admin API POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user?.role || "").toUpperCase();

    if (userRole !== "ADMIN") {
      return Response.json({ error: "Chỉ Quản trị viên cấp cao mới có quyền xóa văn bản tri thức." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Thiếu mã tài liệu cần xóa." }, { status: 400 });
    }

    await prisma.knowledgeDocument.delete({
      where: { id }
    });

    return Response.json({ success: true, message: "Đã xóa văn bản tri thức thành công." });
  } catch (error: any) {
    console.error("Knowledge Admin API DELETE error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
