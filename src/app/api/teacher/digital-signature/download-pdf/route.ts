import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PdfSigningService } from "@/lib/digital-signature/pdf-signing-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const userRole = ((session?.user as any)?.role || "").toUpperCase();

    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Thiếu mã tài liệu (documentId)" }, { status: 400 });
    }

    const pAny = prisma as any;
    const doc = await pAny.signableDocument.findUnique({
      where: { id: documentId },
      include: {
        student: true,
        class: true,
        signatures: {
          where: { requestStatus: "SUCCESS" },
          orderBy: { orderIndex: "desc" },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
    }

    // 1. Phân quyền truy cập
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL", "GDCS"].includes(userRole);
    const isParent = userRole === "PARENT";
    const isStudent = userRole === "STUDENT" || userRole === "HOC_SINH";

    if (isParent || isStudent) {
      // Phụ huynh và học sinh CHỈ được xem và tải tài liệu ĐÃ CÔNG BỐ
      if (doc.publicationStatus !== "PUBLISHED") {
        return NextResponse.json(
          { error: "Tài liệu này chưa được Nhà trường công bố chính thức tới Phụ huynh và Học sinh." },
          { status: 403 }
        );
      }
    } else if (!isAdmin) {
      // Giáo viên: Kiểm tra phân công
      const teacher = await pAny.teacher.findUnique({ where: { userId } }).catch(() => null);
      if (teacher) {
        const isHomeroom =
          doc.class?.homeroomTeacherId === teacher.id ||
          doc.class?.homeroomTeacherId?.includes(teacher.id);

        const isAssigned = await pAny.teachingAssignment.findFirst({
          where: {
            teacherId: teacher.id,
            classId: doc.classId,
          },
        }).catch(() => null);

        if (!isHomeroom && !isAssigned) {
          return NextResponse.json(
            { error: "Bạn không có quyền tải tài liệu của học sinh ngoài phạm vi phân công giảng dạy." },
            { status: 403 }
          );
        }
      }
    }

    // 2. Tìm tệp PDF đã ký
    const latestSuccessSig = doc.signatures[0];
    if (!latestSuccessSig || !latestSuccessSig.signedPdfPath) {
      return NextResponse.json(
        { error: "Tài liệu này chưa hoàn tất ký số hoặc chưa có tệp PDF ký số được lưu trữ." },
        { status: 404 }
      );
    }

    const pdfBuffer = PdfSigningService.getSignedPdf(latestSuccessSig.signedPdfPath);
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp PDF đã ký trên hệ thống lưu trữ an toàn." },
        { status: 404 }
      );
    }

    // Ghi log tải tệp
    await pAny.signatureAuditLog.create({
      data: {
        documentId: doc.id,
        signatureId: latestSuccessSig.id,
        action: "DOWNLOAD_PDF",
        actorId: userId,
        actorName: session?.user?.name || "Người dùng",
        actorRole: userRole,
        details: JSON.stringify({
          documentCode: doc.documentCode,
          version: doc.version,
          pdfPath: latestSuccessSig.signedPdfPath,
        }),
      },
    }).catch(() => null);

    const safeFileName = `${doc.documentCode}_v${doc.version}_signed.pdf`;
    const asciiFileName = safeFileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_");

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Lỗi khi tải tệp PDF đã ký:", err);
    return NextResponse.json({ error: err.message || "Lỗi tải tệp" }, { status: 500 });
  }
}
