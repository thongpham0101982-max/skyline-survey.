import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import { reviewTciAssessmentRecord, reopenSignedTciAssessment } from "@/lib/tci/service";

export async function POST(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const body = await req.json();
        const studentId = String(body.studentId || "").trim();
        if (!studentId) {
            return NextResponse.json({ error: "Thiếu mã học sinh (studentId)." }, { status: 400 });
        }

        const action = String(body.action || "REVIEW").toUpperCase();

        if (action === "REOPEN") {
            const bundle = await reopenSignedTciAssessment({
                studentId,
                periodId: body.periodId,
                reason: String(body.reason || ""),
                actor,
            });
            return NextResponse.json({
                success: true,
                message: `Đã mở khóa và tạo phiên bản kết quả mới (v${bundle.record.resultVersion}) yêu cầu giáo viên ký lại. Bản đã ký trước đó vẫn được lưu nguyên vẹn trong lịch sử.`,
                ...bundle,
            });
        }

        const decision =
            body.decision === "SUPPLEMENT_REQUESTED" ? "SUPPLEMENT_REQUESTED" : "APPROVED";

        const bundle = await reviewTciAssessmentRecord({
            studentId,
            periodId: body.periodId,
            decision,
            reviewNote: body.reviewNote,
            actor,
        });

        return NextResponse.json({
            success: true,
            message:
                decision === "APPROVED"
                    ? "Đã phê duyệt kết quả khảo sát môn TCI."
                    : "Đã gửi yêu cầu bổ sung kết quả môn TCI.",
            ...bundle,
        });
    } catch (error: any) {
        console.error("[POST /api/tci/review] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi xử lý xét duyệt / mở khóa phiếu TCI" },
            { status: 400 }
        );
    }
}
