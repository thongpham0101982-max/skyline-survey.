import { NextResponse } from "next/server";
import { getAuthenticatedPvdhActor } from "@/lib/pvdh/auth-guard";
import { getPvdhDb, ensurePvdhSchema } from "@/lib/pvdh/schema-init";
import {
  PvdhDomainError,
  listKsdvFileTemplatesWithMappings,
  listPvdhTemplatesWithVersions,
  saveKsdvFileTemplateAndMappings,
} from "@/lib/pvdh/service";
import {
  sanitizeSpreadsheetCell,
  validateExportMappings,
  validateSafeScoreFormula,
} from "@/lib/pvdh/validation";

export const dynamic = "force-dynamic";

const SAMPLE_PREVIEW_CONTEXT: Record<string, any> = {
  "student.studentCode": "HS260108",
  "student.fullName": "Nguyễn Minh Khôi",
  "student.dateOfBirth": "15/05/2015",
  "student.grade": "Khối 6",
  "student.program": "HNS",
  "period.code": "KS_DAU_NAM_26",
  "period.name": "Khảo sát đầu năm 2026–2027",
  "campus.name": "Cơ sở 1",
  "score.components[0]": 4.0,
  "score.components[1]": 5.5,
  "score.compositeScore": 9.5,
  "score.status": "Đạt",
  "score.remark": "Nắm chắc kiến thức trọng tâm, trình bày rõ ràng.",
  "tci.criteriaResults": "16/16 chỉ số (Đạt: 15, Không đạt: 0, Không làm: 1)",
  "tci.summaryCounts": "Đạt 15/16 | Không đạt 0/16 | Không làm 1/16 | Chưa nhập 0/16",
  "tci.evidences.indicator_61": "[Ảnh bài tô màu Câu 16 / STT 61]",
  "tci.signature": "[Ký xác nhận bằng ảnh chữ ký]",
  "pvdh.student.studentCode": "HS260108",
  "pvdh.student.fullName": "Nguyễn Minh Khôi",
  "pvdh.student.dateOfBirth": "15/05/2015",
  "pvdh.student.grade": "Khối 6",
  "pvdh.student.program": "HNS",
  "pvdh.student.oldSchoolClass": "TH Sky-Line – Lớp 5.1",
  "pvdh.student.registeredCampus": "Cơ sở 1",
  "pvdh.meta.interviewDate": "16/11/2026",
  "pvdh.meta.interviewerName": "Cô Trần Thu Hà",
  "pvdh.meta.interviewerTitle": "Giáo viên phỏng vấn",
  "pvdh.parent.fullName": "Ông Nguyễn Văn Nam",
  "pvdh.parent.relationship": "Phụ huynh (Bố)",
  "pvdh.parent.contactChannel": "Điện thoại / Zalo",
  "pvdh.studentInterview.q1": "Học sinh tự đánh giá nắm tốt môn Toán và Khoa học, cần rèn thêm viết luận dài.",
  "pvdh.teacherObservation.strengthsInterests": "Giao tiếp lễ phép, chủ động nêu ví dụ thực tế.",
  "pvdh.orientationPlan.strengthsPriority": "Tư duy logic tốt; ưu tiên hỗ trợ phương pháp ghi chép đa môn đầu cấp THCS.",
  "pvdh.orientationPlan.goalsActions": "Hoàn thành sổ tay kế hoạch tuần trong 4 tuần đầu năm học.",
  "pvdh.orientationPlan.furtherTopics": "Không",
  "pvdh.orientationPlan.handoverNotes": "Bàn giao GVCN lớp 6 theo dõi nề nếp tự quản tháng đầu.",
};

export async function GET() {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    if (actor.isParent) {
      return NextResponse.json({ success: false, error: "Không có quyền truy cập." }, { status: 403 });
    }

    const [fileTemplates, pvdhTemplates] = await Promise.all([
      listKsdvFileTemplatesWithMappings(),
      listPvdhTemplatesWithVersions(),
    ]);

    return NextResponse.json({
      success: true,
      fileTemplates,
      pvdhTemplates,
      canManageConfig: actor.canManageConfig,
    });
  } catch (err: any) {
    console.error("[API GET /api/admin/ksdv-file-configs] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải cấu hình file khảo sát." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || "SAVE");

    if (action === "VALIDATE_PREVIEW") {
      const mappings = Array.isArray(body?.mappings) ? body.mappings : [];
      const resultType = String(body?.resultType || "SCORE");
      const exportFormat = String(body?.exportFormat || "HTML_PDF");
      const mapCheck = validateExportMappings({
        resultType,
        exportFormat,
        mappings,
      });

      let formulaCheck: { valid: boolean; error?: string } = { valid: true };
      if (resultType === "SCORE" && body?.schemaConfig?.formula === "CUSTOM") {
        formulaCheck = validateSafeScoreFormula(
          String(body.schemaConfig.formulaCustom || ""),
          Number(body.schemaConfig.columnCount || 10)
        );
      }

      const previewRows = mappings.map((m: any) => {
        const rawSample = SAMPLE_PREVIEW_CONTEXT[m.sourcePath] ?? `[Giá trị từ ${m.sourcePath}]`;
        const formatted =
          exportFormat === "XLSX" ? sanitizeSpreadsheetCell(rawSample) : String(rawSample);
        return {
          fieldKey: m.fieldKey,
          sourcePath: m.sourcePath,
          targetFormat: m.targetFormat || exportFormat,
          targetRef: m.targetRef,
          sampleOutput: formatted,
        };
      });

      return NextResponse.json({
        success: true,
        valid: mapCheck.valid && formulaCheck.valid,
        errors: [
          ...(formulaCheck.valid ? [] : [formulaCheck.error!]),
          ...mapCheck.errors,
        ],
        warnings: mapCheck.warnings,
        previewRows,
      });
    }

    const saved = await saveKsdvFileTemplateAndMappings({
      actor,
      id: body.id,
      code: body.code,
      name: body.name,
      resultType: body.resultType,
      subjectId: body.subjectId,
      subjectCode: body.subjectCode,
      subjectName: body.subjectName,
      academicYearId: body.academicYearId,
      periodIds: body.periodIds,
      educationSystems: body.educationSystems,
      campusIds: body.campusIds,
      grades: body.grades,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      priorityOrder: body.priorityOrder !== undefined ? Number(body.priorityOrder) : 100,
      exportFormat: body.exportFormat || "HTML_PDF",
      pageSize: body.pageSize || "A4",
      pageOrientation: body.pageOrientation || "PORTRAIT",
      copyCount: Number(body.copyCount || 1),
      signatureBlocks: body.signatureBlocks,
      fileNamePattern: body.fileNamePattern,
      schemaConfig: body.schemaConfig,
      sourceVerified: body.sourceVerified !== false,
      missingSourceNote: body.missingSourceNote,
      mappings: Array.isArray(body.mappings) ? body.mappings : [],
      publishNow: action === "PUBLISH" || Boolean(body.publishNow),
    });

    const fileTemplates = await listKsdvFileTemplatesWithMappings();
    return NextResponse.json({
      success: true,
      ...saved,
      fileTemplates,
    });
  } catch (err: any) {
    if (err instanceof PvdhDomainError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code, details: err.details },
        { status: err.statusCode }
      );
    }
    console.error("[API POST /api/admin/ksdv-file-configs] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi lưu cấu hình file khảo sát." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor || !actor.canManageConfig) {
      return NextResponse.json({ success: false, error: "Không có quyền xóa." }, { status: 403 });
    }
    await ensurePvdhSchema();
    const db = getPvdhDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu id." }, { status: 400 });
    }
    const existing = await db.ksdvFileTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy cấu hình." }, { status: 404 });
    }
    if (existing.status === "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Cấu hình đang áp dụng không thể xóa trực tiếp. Vui lòng chuyển sang Ngừng áp dụng.",
        },
        { status: 409 }
      );
    }
    await db.ksdvExportMapping.deleteMany({ where: { fileTemplateId: id } });
    await db.ksdvFileTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa cấu hình." },
      { status: 500 }
    );
  }
}
