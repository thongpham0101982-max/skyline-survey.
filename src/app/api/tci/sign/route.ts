import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import { signAndCompleteTciAssessment, resolveActorSignatureProfile } from "@/lib/tci/service";

export async function GET() {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }
        const profile = await resolveActorSignatureProfile(actor);
        return NextResponse.json({ profile });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Lỗi kiểm tra chữ ký" },
            { status: 500 }
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
        const studentId = String(body.studentId || "").trim();
        if (!studentId) {
            return NextResponse.json({ error: "Thiếu mã học sinh (studentId)." }, { status: 400 });
        }

        const result = await signAndCompleteTciAssessment({
            studentId,
            periodId: body.periodId,
            assessmentDate: body.assessmentDate,
            criteriaResults: body.criteriaResults,
            generalComment: body.generalComment,
            highlightsComment: body.highlightsComment,
            supportNeededComment: body.supportNeededComment,
            teacherRecommendation: body.teacherRecommendation,
            hasUploadingOrErroredEvidence: Boolean(body.hasUploadingOrErroredEvidence),
            actor,
        });

        return NextResponse.json({
            success: true,
            alreadySigned: result.alreadySigned,
            message: result.alreadySigned
                ? "Phiếu này đã được ký xác nhận trước đó."
                : "Đã ký xác nhận hoàn thành và lưu trữ bản PDF bất biến thành công.",
            ...result.bundle,
        });
    } catch (error: any) {
        console.error("[POST /api/tci/sign] Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Lỗi khi ký và xác nhận hoàn thành phiếu TCI",
                code: error.code || "SIGN_ERROR",
                redirectUrl: error.redirectUrl || null,
                validation: error.validation || null,
            },
            { status: 400 }
        );
    }
}
