import { NextResponse } from "next/server";
import { getAuthenticatedPvdhActor } from "@/lib/pvdh/auth-guard";
import { PVDH_SEED_TEMPLATES } from "@/lib/pvdh/constants";
import { buildPvdhDocumentHtml } from "@/lib/pvdh/pdf-service";
import {
  PvdhDomainError,
  clonePvdhTemplate,
  createNewPvdhTemplateVersion,
  deletePvdhTemplate,
  listPvdhTemplatesWithVersions,
  resolveApplicablePvdhTemplate,
  setPvdhTemplatePublishStatus,
  updatePvdhTemplateVersion,
} from "@/lib/pvdh/service";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err instanceof PvdhDomainError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code, details: err.details },
      { status: err.statusCode }
    );
  }
  console.error("[API /api/pvdh/templates] Error:", err);
  return NextResponse.json(
    { success: false, error: err?.message || "Lỗi hệ thống khi xử lý mẫu định hướng." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    if (actor.isParent) {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "list";

    if (mode === "resolve") {
      const grade = searchParams.get("grade") || "1";
      const system = searchParams.get("system") || "ALL";
      const campusId = searchParams.get("campusId") || "ALL";
      const periodId = searchParams.get("periodId") || "ALL";
      const resolved = await resolveApplicablePvdhTemplate({
        grade,
        educationSystem: system,
        campusId,
        periodId,
      });
      return NextResponse.json({ success: true, ...resolved });
    }

    if (mode === "preview_html") {
      const code = searchParams.get("code") || "BM.KTĐBCL.31";
      const templates = await listPvdhTemplatesWithVersions();
      const found = templates.find((t: any) => t.code === code) || templates[0];
      const ver = found?.activeVersion;
      const seedFallback = PVDH_SEED_TEMPLATES.find((s) => s.code === code) || PVDH_SEED_TEMPLATES[0];
      const effLayout = ver?.exportLayout || seedFallback.exportLayout;
      const isBm = effLayout?.layoutVariant === "BM_KTDBCL_ABCD";

      const html = buildPvdhDocumentHtml({
        recordId: "PREVIEW-MAU",
        attemptNumber: 1,
        templateCode: found?.code || seedFallback.code,
        templateName: found?.name || seedFallback.name,
        templateVersionCode: ver?.versionCode || "v1.0",
        studentId: "PREVIEW",
        studentCode: "HS-XEM-TRUOC",
        studentName: isBm ? "" : "[Họ và tên học sinh]",
        studentDob: null,
        grade: `Khối ${(found?.grades || seedFallback.grades)[0] || "1"}`,
        programName: isBm ? "" : "[Hệ/Chương trình]",
        oldSchoolAndClass: "[Trường/lớp đang học]",
        registeredCampus: isBm ? "" : "[Cơ sở đăng ký]",
        periodCode: "DOT-KS",
        periodName: isBm ? "" : "[Đợt khảo sát]",
        academicYearName: "",
        interviewDate: null,
        studentInterviewerName: isBm ? "" : actor.userName,
        studentInterviewerTitle: "Giáo viên phỏng vấn",
        parentFullName: isBm ? "" : "[Họ tên PHHS]",
        parentRelationship: isBm ? "" : "[Quan hệ với HS]",
        parentContactChannel: "[Điện thoại / Kênh liên hệ]",
        sections: ver?.sections || seedFallback.sections,
        fields: ver?.fields || seedFallback.fields,
        exportLayout: effLayout,
        studentResponses: {},
        parentResponses: {},
        teacherSummary: {
          d01: "",
          d02: "",
          d03: "",
          d04: "",
          sheetStatus: "",
          psychInterviewRequested: false,
        },
        planFurtherTopics: [],
        workflowStatus: "DRAFT",
        isLocked: false,
      });

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }

    const templates = await listPvdhTemplatesWithVersions();
    return NextResponse.json({
      success: true,
      templates,
      canManageConfig: actor.canManageConfig,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "UPDATE_VERSION") {
      const updated = await updatePvdhTemplateVersion({
        actor,
        templateId: body.templateId,
        versionId: body.versionId,
        name: body.name,
        description: body.description,
        grades: body.grades,
        educationSystems: body.educationSystems,
        campusIds: body.campusIds,
        periodIds: body.periodIds,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo,
        priorityOrder: body.priorityOrder !== undefined ? Number(body.priorityOrder) : undefined,
        sections: body.sections,
        fields: body.fields,
        exportLayout: body.exportLayout,
        changeSummary: body.changeSummary,
      });
      return NextResponse.json({ success: true, template: updated });
    }

    if (action === "CREATE_NEW_VERSION") {
      const created = await createNewPvdhTemplateVersion({
        actor,
        templateId: body.templateId,
        baseVersionId: body.baseVersionId,
        changeSummary: body.changeSummary,
      });
      const templates = await listPvdhTemplatesWithVersions();
      return NextResponse.json({ success: true, version: created, templates });
    }

    if (action === "CLONE_TEMPLATE") {
      const cloned = await clonePvdhTemplate({
        actor,
        sourceTemplateId: body.sourceTemplateId,
        newCode: body.newCode,
        newName: body.newName,
        priorityOrder: body.priorityOrder !== undefined ? Number(body.priorityOrder) : undefined,
      });
      const templates = await listPvdhTemplatesWithVersions();
      return NextResponse.json({ success: true, template: cloned, templates });
    }

    if (action === "PUBLISH" || action === "DEACTIVATE") {
      const res = await setPvdhTemplatePublishStatus({
        actor,
        templateId: body.templateId,
        versionId: body.versionId,
        targetStatus: action === "PUBLISH" ? "ACTIVE" : "INACTIVE",
      });
      const templates = await listPvdhTemplatesWithVersions();
      return NextResponse.json({ success: true, ...res, templates });
    }

    return NextResponse.json({ success: false, error: "Action không hợp lệ." }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    if (!templateId) {
      return NextResponse.json({ success: false, error: "Thiếu templateId." }, { status: 400 });
    }
    const res = await deletePvdhTemplate({ actor, templateId });
    return NextResponse.json({ success: true, ...res });
  } catch (err) {
    return handleError(err);
  }
}
