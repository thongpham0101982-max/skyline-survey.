import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateSuggestedInterviewQuestions,
  draftCriterionComment,
  synthesizeAdmissionSummary
} from "@/lib/orientation/ai-admission-assistant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...payload } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Missing action in request body" }, { status: 400 });
    }

    switch (action) {
      case "suggest_questions": {
        const {
          grade,
          gradeGroupKey,
          criterionName,
          categoryLabel,
          guideline,
          studentName,
          currentNotes,
          existingQuestions
        } = payload;

        const result = await generateSuggestedInterviewQuestions({
          grade,
          gradeGroupKey,
          criterionName,
          categoryLabel,
          guideline,
          studentName,
          currentNotes,
          existingQuestions
        });

        return NextResponse.json(result);
      }

      case "draft_comment": {
        const {
          criterionName,
          rating,
          rawNotes,
          guideline,
          studentName,
          grade
        } = payload;

        const result = await draftCriterionComment({
          criterionName,
          rating,
          rawNotes,
          guideline,
          studentName,
          grade
        });

        return NextResponse.json(result);
      }

      case "synthesize_summary": {
        const {
          student,
          criteriaAnswers,
          parentData,
          surveyScores
        } = payload;

        const result = await synthesizeAdmissionSummary({
          student,
          criteriaAnswers,
          parentData,
          surveyScores
        });

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: `Hành động không hỗ trợ: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("AI Assistant API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Đã xảy ra lỗi khi xử lý Trợ lý AI Admission"
      },
      { status: 500 }
    );
  }
}
