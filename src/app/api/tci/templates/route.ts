import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTciActor } from "@/lib/tci/auth-context";
import {
    listTciTemplates,
    getActiveTciTemplate,
    saveTciTemplateDraft,
    cloneTciTemplateVersion,
    updateTciTemplateStatus,
} from "@/lib/tci/service";
import { buildTciAssessmentHtml } from "@/lib/tci/pdf-service";
import { DEFAULT_TCI_CRITERIA_16, DEFAULT_TCI_FOOTER_CONFIG, DEFAULT_TCI_EXPORT_CONFIG } from "@/lib/tci/constants";

export async function GET(req: NextRequest) {
    try {
        const actor = await getAuthenticatedTciActor();
        if (!actor) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "list";
        const templateId = searchParams.get("templateId");
        const academicYearId = searchParams.get("academicYearId") || undefined;
        const periodId = searchParams.get("periodId") || undefined;
        const educationSystemId = searchParams.get("educationSystemId") || undefined;
        const grade = searchParams.get("grade") || undefined;
        const status = searchParams.get("status") || undefined;

        if (mode === "preview_html") {
            const tpl =
                (await getActiveTciTemplate({ templateId, periodId, grade })) || {
                    code: "TCI_K1_DEFAULT",
                    name: "Phiếu khảo sát đầu vào môn TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi",
                    versionCode: "v1.0",
                    criteria: DEFAULT_TCI_CRITERIA_16,
                    footerConfig: DEFAULT_TCI_FOOTER_CONFIG,
                    exportConfig: DEFAULT_TCI_EXPORT_CONFIG,
                };

            const html = buildTciAssessmentHtml({
                recordId: "MAU-XEM-TRUOC",
                resultVersion: 1,
                templateCode: tpl.code,
                templateName: tpl.name,
                templateVersionCode: tpl.versionCode,
                studentId: "HS_MAU",
                studentCode: "HS26-0001",
                studentName: "Nguyễn Minh An (Học sinh mẫu)",
                studentDob: "2020-05-15",
                studentGender: "Nữ",
                grade: "Khối 1",
                campusName: "Cơ sở Sky-Line",
                periodName: "Đợt khảo sát đầu vào Lớp 1",
                assessmentDate: new Date().toISOString().slice(0, 10),
                assignedTeacherName: actor.userName,
                assessorName: actor.userName,
                criteriaConfig: tpl.criteria,
                footerConfig: tpl.footerConfig,
                exportConfig: tpl.exportConfig,
                criteriaResults: {},
                evidences: [],
                signatureStatus: "UNSIGNED",
            });

            return new NextResponse(html, {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        if (mode === "active") {
            const activeTemplate = await getActiveTciTemplate({
                templateId,
                academicYearId,
                periodId,
                educationSystemId,
                grade,
            });
            return NextResponse.json({ template: activeTemplate });
        }

        const templates = await listTciTemplates({
            academicYearId,
            periodId,
            educationSystemId,
            grade,
            status,
        });
        const activeTemplate =
            templates.find((t) => t.status === "ACTIVE") || templates[0] || null;

        return NextResponse.json({
            templates,
            activeTemplate,
        });
    } catch (error: any) {
        console.error("[GET /api/tci/templates] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi tải cấu hình mẫu phiếu TCI" },
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
        const action = body.action || "SAVE_DRAFT";

        if (action === "CLONE_VERSION") {
            const cloned = await cloneTciTemplateVersion({
                sourceTemplateId: body.sourceTemplateId || body.id,
                newName: body.newName,
                actor,
            });
            return NextResponse.json({
                success: true,
                message: `Đã sao chép sang phiên bản mới (${cloned.versionCode}) ở trạng thái Nháp.`,
                template: cloned,
            });
        }

        if (action === "ACTIVATE" || action === "DEACTIVATE" || action === "SET_DRAFT") {
            const statusMap: Record<string, "ACTIVE" | "INACTIVE" | "DRAFT"> = {
                ACTIVATE: "ACTIVE",
                DEACTIVATE: "INACTIVE",
                SET_DRAFT: "DRAFT",
            };
            const updated = await updateTciTemplateStatus({
                templateId: body.templateId || body.id,
                status: statusMap[action] || "ACTIVE",
                actor,
            });
            return NextResponse.json({
                success: true,
                message:
                    action === "ACTIVATE"
                        ? `Đã kích hoạt áp dụng mẫu phiếu (${updated.versionCode}).`
                        : `Đã cập nhật trạng thái mẫu phiếu (${updated.versionCode}).`,
                template: updated,
            });
        }

        const saved = await saveTciTemplateDraft({
            id: body.id,
            code: body.code,
            name: body.name || "Phiếu khảo sát Bộ chuẩn phát triển trẻ em 5–6 tuổi",
            academicYearId: body.academicYearId,
            periodId: body.periodId,
            educationSystemId: body.educationSystemId,
            grade: body.grade || "Khối 1",
            criteria: body.criteria,
            footerConfig: body.footerConfig,
            exportConfig: body.exportConfig,
            actor,
        });

        return NextResponse.json({
            success: true,
            message: `Đã lưu cấu hình mẫu phiếu TCI (${saved.versionCode}).`,
            template: saved,
        });
    } catch (error: any) {
        console.error("[POST /api/tci/templates] Error:", error);
        return NextResponse.json(
            { error: error.message || "Lỗi lưu mẫu phiếu TCI" },
            { status: 400 }
        );
    }
}
