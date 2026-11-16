import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import {
    uploadTciProductEvidence,
    rotateTciProductEvidence,
    deleteTciProductEvidence,
    assertActorCanAccessStudentTci,
} from "@/lib/tci/service";
import { ensureTciSchema, getTciDb } from "@/lib/tci/schema-init";

export async function GET(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        await ensureTciSchema();
        const { searchParams } = new URL(req.url);
        const evidenceId = searchParams.get("evidenceId");
        if (!evidenceId) {
            return NextResponse.json({ error: "Thiếu mã ảnh sản phẩm (evidenceId)." }, { status: 400 });
        }

        const db = getTciDb();
        const ev = await db.tciProductEvidence.findUnique({ where: { id: evidenceId } });
        if (!ev || ev.status !== "ACTIVE") {
            return NextResponse.json({ error: "Không tìm thấy ảnh sản phẩm." }, { status: 404 });
        }

        // Kiểm tra quyền xem ở server (không cho phép truy cập trái phép)
        await assertActorCanAccessStudentTci({
            actor,
            studentId: ev.studentId,
            periodId: ev.periodId,
            mode: "VIEW",
        });

        return NextResponse.json({ evidence: ev });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Không có quyền xem ảnh sản phẩm." },
            { status: 403 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const body = await req.json();
        const action = body.action || "UPLOAD";

        if (action === "ROTATE") {
            const updated = await rotateTciProductEvidence({
                evidenceId: String(body.evidenceId || ""),
                rotationDeg: Number(body.rotationDeg || 0),
                rotatedImageDataBase64: body.rotatedImageDataBase64 || null,
                actor,
            });
            return NextResponse.json({
                success: true,
                message: "Đã cập nhật hướng xoay ảnh sản phẩm.",
                evidence: updated,
            });
        }

        const created = await uploadTciProductEvidence({
            studentId: String(body.studentId || ""),
            periodId: body.periodId,
            criterionId: String(body.criterionId || "TCI_C16"),
            fileName: String(body.fileName || "SanPham_Cau16.jpg"),
            mimeType: String(body.mimeType || "image/jpeg"),
            imageDataBase64: String(body.imageDataBase64 || ""),
            rotationDeg: Number(body.rotationDeg || 0),
            replaceEvidenceId: body.replaceEvidenceId || null,
            actor,
        });

        return NextResponse.json({
            success: true,
            message: "Đã tải lên ảnh sản phẩm bài làm thành công.",
            evidence: created,
        });
    } catch (error: any) {
        console.error("[POST /api/tci/evidence] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi tải ảnh sản phẩm" },
            { status: 400 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const evidenceId = searchParams.get("evidenceId");
        if (!evidenceId) {
            return NextResponse.json({ error: "Thiếu mã ảnh sản phẩm cần xóa." }, { status: 400 });
        }

        await deleteTciProductEvidence({
            evidenceId,
            actor,
        });

        return NextResponse.json({
            success: true,
            message: "Đã xóa ảnh sản phẩm.",
        });
    } catch (error: any) {
        console.error("[DELETE /api/tci/evidence] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi xóa ảnh sản phẩm" },
            { status: 400 }
        );
    }
}
