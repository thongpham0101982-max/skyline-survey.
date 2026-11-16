import { NextResponse } from "next/server";
import { getAuthenticatedPvdhActor } from "@/lib/pvdh/auth-guard";
import {
  PvdhDomainError,
  acknowledgePvdhHandoverByGvcn,
  executePvdhWorkflowTransition,
  handoverConfirmedPvdhToGvcn,
} from "@/lib/pvdh/service";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err instanceof PvdhDomainError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code, details: err.details },
      { status: err.statusCode }
    );
  }
  console.error("[API /api/pvdh/workflow] Error:", err);
  return NextResponse.json(
    { success: false, error: err?.message || "Lỗi xử lý luồng trạng thái phiếu định hướng." },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "HANDOVER_TO_GVCN") {
      const handover = await handoverConfirmedPvdhToGvcn({
        actor,
        recordId: body.recordId,
        targetClassId: body.targetClassId,
        includeSensitiveNotes: Boolean(body.includeSensitiveNotes),
        handoverNote: body.handoverNote,
      });
      return NextResponse.json({ success: true, handover });
    }

    if (action === "ACKNOWLEDGE_HANDOVER") {
      const handover = await acknowledgePvdhHandoverByGvcn({
        actor,
        handoverId: body.handoverId,
        gvcnFeedbackNote: body.gvcnFeedbackNote,
      });
      return NextResponse.json({ success: true, handover });
    }

    if (
      ["SUBMIT_REVIEW", "RETURN_SUPPLEMENT", "VERIFY_LOCK", "REOPEN", "CREATE_NEW_ATTEMPT"].includes(
        action
      )
    ) {
      const workspace = await executePvdhWorkflowTransition({
        actor,
        recordId: body.recordId,
        action: action as any,
        reasonOrNote: body.reasonOrNote,
        useSignatureProfile: Boolean(body.useSignatureProfile),
      });
      return NextResponse.json({ success: true, ...workspace });
    }

    return NextResponse.json({ success: false, error: "Thao tác quy trình không hợp lệ." }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}
