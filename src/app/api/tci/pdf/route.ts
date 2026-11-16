import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import { getStudentTciDocumentOutput } from "@/lib/tci/service";

export async function GET(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const periodId = searchParams.get("periodId") || undefined;
        const resultVersionParam = searchParams.get("resultVersion");
        const resultVersion = resultVersionParam ? Number(resultVersionParam) : null;
        const formatParam = (searchParams.get("format") || "pdf").toLowerCase();
        const format: "pdf" | "html" | "word" =
            formatParam === "html" ? "html" : formatParam === "word" ? "word" : "pdf";
        const disposition = searchParams.get("disposition") || "attachment";

        if (!studentId) {
            return NextResponse.json({ error: "Thiếu mã học sinh (studentId)." }, { status: 400 });
        }

        const output = await getStudentTciDocumentOutput({
            studentId,
            periodId,
            resultVersion,
            format,
            actor,
        });

        const headers: Record<string, string> = {
            "Content-Type": output.contentType,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        };

        if (format !== "html") {
            const safeDisposition = disposition === "inline" ? "inline" : "attachment";
            headers["Content-Disposition"] = `${safeDisposition}; filename="${encodeURIComponent(
                output.fileName
            )}"`;
        }

        return new NextResponse(new Uint8Array(output.buffer), {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error("[GET /api/tci/pdf] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi tải phiếu khảo sát TCI" },
            { status: 403 }
        );
    }
}
