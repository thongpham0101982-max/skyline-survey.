import { NextResponse } from "next/server";
import { getAuthenticatedPvdhActor } from "@/lib/pvdh/auth-guard";
import {
  PvdhDomainError,
  getOrInitStudentPvdhWorkspace,
  listGvcnHandoversForActor,
  listOrientationRecordsPaginated,
  requestPvdhPsychInterview,
  savePvdhRecord,
  switchRecordTemplateWithMapping,
} from "@/lib/pvdh/service";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err instanceof PvdhDomainError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code, details: err.details },
      { status: err.statusCode }
    );
  }
  console.error("[API /api/pvdh/records] Error:", err);
  return NextResponse.json(
    { success: false, error: err?.message || "Lỗi hệ thống khi xử lý phiếu định hướng." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedPvdhActor();
    if (!actor) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "single";

    if (mode === "gvcn_handovers") {
      if (actor.isParent) {
        return NextResponse.json({ success: false, error: "Không có quyền truy cập." }, { status: 403 });
      }
      const handovers = await listGvcnHandoversForActor(actor);
      return NextResponse.json({ success: true, handovers });
    }

    if (mode === "list") {
      if (actor.isParent) {
        return NextResponse.json({ success: false, error: "Không có quyền truy cập." }, { status: 403 });
      }
      const res = await listOrientationRecordsPaginated({
        actor,
        periodId: searchParams.get("periodId") || undefined,
        campusId: searchParams.get("campusId") || undefined,
        grade: searchParams.get("grade") || undefined,
        program: searchParams.get("program") || undefined,
        assigneeUserId: searchParams.get("assigneeUserId") || undefined,
        workflowStatus: searchParams.get("workflowStatus") || undefined,
        search: searchParams.get("search") || undefined,
        page: Number(searchParams.get("page") || 1),
        pageSize: Number(searchParams.get("pageSize") || 20),
      });
      return NextResponse.json({ success: true, ...res });
    }

    const studentId = searchParams.get("studentId") || searchParams.get("studentCode");
    const fallbackStudentCode = searchParams.get("studentCode");
    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId hoặc studentCode." }, { status: 400 });
    }
    const attemptParam = searchParams.get("attemptNumber");
    let workspace: any;
    try {
      workspace = await getOrInitStudentPvdhWorkspace({
        actor,
        studentId,
        attemptNumber: attemptParam ? Number(attemptParam) : undefined,
      });
    } catch (e: any) {
      if (
        e instanceof PvdhDomainError &&
        e.code === "STUDENT_NOT_FOUND" &&
        fallbackStudentCode &&
        fallbackStudentCode !== studentId
      ) {
        workspace = await getOrInitStudentPvdhWorkspace({
          actor,
          studentId: fallbackStudentCode,
          attemptNumber: attemptParam ? Number(attemptParam) : undefined,
        });
      } else {
        throw e;
      }
    }
    return NextResponse.json({ success: true, ...workspace });
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
    const action = String(body?.action || "SAVE_DRAFT");
    const host = request.headers.get("host") || "ssm.skylineschool.edu.vn";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}`;

    if (action === "SWITCH_TEMPLATE") {
      const workspace = await switchRecordTemplateWithMapping({
        actor,
        recordId: body.recordId,
        reason: body.reason || "Đồng bộ theo khối dự kiến mới của hồ sơ",
      });
      return NextResponse.json({ success: true, ...workspace });
    }

    if (action === "REQUEST_PSYCH_INTERVIEW") {
      const workspace = await requestPvdhPsychInterview({
        actor,
        studentId: body.studentId,
        recordId: body.recordId,
        expectedLockVersion: body.expectedLockVersion,
        payload: body.payload,
        selectedPsychTeacherId: body.selectedPsychTeacherId || null,
        referralNote: body.referralNote,
        baseUrl,
      });
      return NextResponse.json({ success: true, ...workspace });
    }

    if (action === "SAVE_DRAFT" || action === "COMPLETE") {
      const workspace = await savePvdhRecord({
        actor,
        studentId: body.studentId,
        recordId: body.recordId,
        expectedLockVersion: body.expectedLockVersion,
        mode: action === "COMPLETE" ? "COMPLETE" : "DRAFT",
        completionScope: body.completionScope,
        payload: body.payload || body,
        baseUrl,
      });
      return NextResponse.json({ success: true, ...workspace });
    }

    return NextResponse.json({ success: false, error: "Thao tác không hợp lệ." }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}
