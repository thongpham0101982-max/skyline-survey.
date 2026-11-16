import { NextResponse } from "next/server";
import { getAuthenticatedPvdhActor } from "@/lib/pvdh/auth-guard";
import { getPvdhDb } from "@/lib/pvdh/schema-init";
import {
  PvdhDomainError,
  getPvdhDocumentOutput,
  runBatchPvdhExportJob,
} from "@/lib/pvdh/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let studentId = searchParams.get("studentId");
    const recordId = searchParams.get("recordId");
    if (!studentId && recordId) {
      const rec = await getPvdhDb().pvdhAssessmentRecord.findUnique({ where: { id: recordId } });
      if (rec?.studentId) studentId = rec.studentId;
    }
    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId hoặc recordId." }, { status: 400 });
    }

    const format = searchParams.get("format") === "html" ? "html" : "pdf";
    const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const attemptParam = searchParams.get("attemptNumber");

    const doc = await getPvdhDocumentOutput({
      actor,
      studentId,
      attemptNumber: attemptParam ? Number(attemptParam) : undefined,
      format,
    });

    return new Response(new Uint8Array(doc.buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `${disposition}; filename="${doc.fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err: any) {
    if (err instanceof PvdhDomainError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    console.error("[API GET /api/pvdh/pdf] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xuất file PDF định hướng." },
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
    const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds : [];
    const rawType = body?.exportType || body?.mode;
    const exportType = rawType === "EXCEL_SUMMARY" ? "EXCEL_SUMMARY" : "PDF_ZIP";

    const jobResult = await runBatchPvdhExportJob({
      actor,
      studentIds,
      exportType,
    });

    if (body?.reportOnly) {
      return NextResponse.json({
        success: true,
        fileName: jobResult.fileName,
        report: jobResult.report,
      });
    }

    return new Response(new Uint8Array(jobResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": jobResult.contentType,
        "Content-Disposition": `attachment; filename="${jobResult.fileName}"`,
        "X-Export-Success-Count": String(
          jobResult.report.filter((r) => r.status === "SUCCESS").length
        ),
        "X-Export-Total-Count": String(jobResult.report.length),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err: any) {
    if (err instanceof PvdhDomainError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code, details: err.details },
        { status: err.statusCode }
      );
    }
    console.error("[API POST /api/pvdh/pdf] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi job xuất hàng loạt." },
      { status: 500 }
    );
  }
}
