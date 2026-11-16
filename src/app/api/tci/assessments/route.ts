import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import {
    getOrInitStudentTciRecord,
    saveTciAssessmentDraft,
    resolveActorSignatureProfile,
    canReviewTciResult,
} from "@/lib/tci/service";
import { ensureTciSchema, getTciDb } from "@/lib/tci/schema-init";
import { TCI_SUBJECT_CODE } from "@/lib/tci/constants";

export async function GET(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const studentIdsParam = searchParams.get("studentIds");
        const periodId = searchParams.get("periodId") || undefined;
        const resultVersionParam = searchParams.get("resultVersion");
        const resultVersion = resultVersionParam ? Number(resultVersionParam) : null;

        // Trả về danh sách tóm tắt TCI theo mảng studentIds (phục vụ bảng Kết quả khảo sát / Danh sách GV)
        if (!studentId && studentIdsParam) {
            await ensureTciSchema();
            const ids = studentIdsParam
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            const db = getTciDb();
            const records =
                ids.length > 0
                    ? await db.tciAssessmentRecord.findMany({
                          where: {
                              studentId: { in: ids },
                              subjectCode: TCI_SUBJECT_CODE,
                              isLatestVersion: true,
                          },
                      })
                    : [];

            const mapByStudentId: Record<string, any> = {};
            for (const r of records) {
                mapByStudentId[r.studentId] = r;
            }
            return NextResponse.json({ recordsByStudentId: mapByStudentId });
        }

        if (!studentId) {
            await ensureTciSchema();
            const db = getTciDb();
            const where: Record<string, any> = {
                subjectCode: TCI_SUBJECT_CODE,
                isLatestVersion: true,
            };
            if (periodId && periodId !== "ALL") {
                where.periodId = periodId;
            }
            if (!canReviewTciResult(actor.role) && actor.teacherId) {
                where.assignedTeacherId = actor.teacherId;
            }
            const records = await db.tciAssessmentRecord.findMany({
                where,
                orderBy: [{ updatedAt: "desc" }],
                take: 500,
            });
            return NextResponse.json({ records });
        }

        const bundle = await getOrInitStudentTciRecord({
            studentId,
            periodId,
            resultVersion,
            actor,
        });

        const signatureProfile = await resolveActorSignatureProfile(actor);

        return NextResponse.json({
            ...bundle,
            actorSignatureProfile: {
                hasSignature: signatureProfile.hasSignature,
                signatureType: signatureProfile.signatureType,
                signerName: signatureProfile.signerName,
                provider: signatureProfile.provider || null,
            },
        });
    } catch (error: any) {
        console.error("[GET /api/tci/assessments] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi tải phiếu đánh giá TCI" },
            { status: 400 }
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

        const bundle = await saveTciAssessmentDraft({
            studentId,
            periodId: body.periodId,
            assessmentDate: body.assessmentDate,
            criteriaResults: body.criteriaResults,
            generalComment: body.generalComment,
            highlightsComment: body.highlightsComment,
            supportNeededComment: body.supportNeededComment,
            teacherRecommendation: body.teacherRecommendation,
            expectedLockVersion:
                typeof body.expectedLockVersion === "number" ? body.expectedLockVersion : null,
            actor,
        });

        return NextResponse.json({
            success: true,
            message: "Đã lưu nháp kết quả đánh giá môn TCI.",
            ...bundle,
        });
    } catch (error: any) {
        console.error("[POST /api/tci/assessments] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi lưu nháp phiếu đánh giá TCI" },
            { status: 400 }
        );
    }
}
