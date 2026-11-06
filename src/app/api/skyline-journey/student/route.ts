import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-session";
import {
  getStudentJourneyOverview,
  saveStudentStageDraft,
  submitStudentStageAction,
  submitStudentWelcomeSurvey
} from "@/lib/skyline-journey/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session || !session.studentId) {
      return NextResponse.json(
        { error: "Phiên đăng nhập Học sinh đã hết hạn. Em vui lòng đăng nhập lại nhé!" },
        { status: 401 }
      );
    }

    const gradeParam = req.nextUrl?.searchParams?.get("grade") || undefined;
    const overview = await getStudentJourneyOverview(session.studentId, gradeParam);
    return NextResponse.json(overview);
  } catch (error: any) {
    console.error("[GET /api/skyline-journey/student] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể tải dữ liệu Hành trình Sky-Line" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session || !session.studentId) {
      return NextResponse.json(
        { error: "Phiên đăng nhập Học sinh đã hết hạn. Em vui lòng đăng nhập lại nhé!" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "SUBMIT_STAGE").toUpperCase();

    if (action === "SUBMIT_WELCOME_SURVEY") {
      const surveyResult = await submitStudentWelcomeSurvey(session.studentId, {
        interestLevel: String(body?.interestLevel || "VERY_LOVE"),
        interestLabel: String(body?.interestLabel || "Rất yêu thích"),
        favoriteActivities: Array.isArray(body?.favoriteActivities)
          ? body.favoriteActivities
          : [],
        note: body?.note ? String(body.note) : "",
        characterId: body?.characterId ? String(body.characterId) : "SKYLINE_EXPLORER",
        characterName: body?.characterName
          ? String(body.characterName)
          : "Chiến Binh Chim Sky-Line"
      });
      const updatedOverview = await getStudentJourneyOverview(session.studentId);
      return NextResponse.json({
        ...surveyResult,
        overview: updatedOverview
      });
    }

    const lessonCode = String(body?.lessonCode || "").trim();

    if (!lessonCode) {
      return NextResponse.json(
        { error: "Thiếu mã bài học/chặng (lessonCode)" },
        { status: 400 }
      );
    }

    // Security rule: Never trust studentId, score, or completion status from client payload
    if (action === "SAVE_DRAFT") {
      const saved = await saveStudentStageDraft(session.studentId, {
        lessonCode,
        actionPayload: body?.actionPayload || {},
        studentReflection: body?.studentReflection
      });
      return NextResponse.json(saved);
    }

    const result = await submitStudentStageAction(session.studentId, {
      lessonCode,
      actionPayload: body?.actionPayload || {},
      studentReflection: body?.studentReflection,
      durationSeconds: Number(body?.durationSeconds || 0)
    });

    const updatedOverview = await getStudentJourneyOverview(session.studentId);

    return NextResponse.json({
      ...result,
      overview: updatedOverview
    });
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg === "STAGE_LOCKED") {
      return NextResponse.json(
        {
          error:
            "Chặng phiêu lưu này chưa được mở khóa. Em hãy hoàn thành chặng trước hoặc chờ thầy/cô mở chặng nhé!",
          code: "STAGE_LOCKED"
        },
        { status: 403 }
      );
    }
    if (msg === "STAGE_NOT_FOUND_OR_UNASSIGNED") {
      return NextResponse.json(
        {
          error: "Chặng học tập không tồn tại hoặc không thuộc chương trình của lớp em.",
          code: "STAGE_NOT_FOUND_OR_UNASSIGNED"
        },
        { status: 404 }
      );
    }
    console.error("[POST /api/skyline-journey/student] Error:", error);
    return NextResponse.json(
      { error: "Không thể lưu kết quả chặng. Em có thể bấm 'Thử gửi lại' nhé!" },
      { status: 500 }
    );
  }
}
