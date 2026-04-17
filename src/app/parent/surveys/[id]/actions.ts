"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function submitSurveyAction(data: any) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) throw new Error("Unauthorized")

  const parent = await prisma.parent.findUnique({ where: { userId } })
  if (!parent) throw new Error("Parent not found")

  const { surveyPeriodId, studentId, responses } = data

  let form = await prisma.surveyForm.findFirst({
    where: { parentId: parent.id, studentId, surveyPeriodId }
  })

  if (form && (form.status === "SUBMITTED" || form.status === "COMPLETED")) {
    return { error: "PH đã khảo sát không thể khảo sát lần 2." }
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return { error: "Student not found" }

  let npsScoreRaw: number | null = null;
  let npsCategory: string | null = null;

  if (form) {
    await prisma.surveyResponse.deleteMany({ where: { formId: form.id } })
  } else {
    form = await prisma.surveyForm.create({
      data: {
        surveyPeriodId,
        parentId: parent.id,
        studentId: student.id,
        classId: student.classId,
        campusId: student.campusId,
        academicYearId: student.academicYearId,
        status: "DRAFT"
      }
    })
  }

  let totalRating = 0;
  let ratingCount = 0;

  for (const r of responses) {
    if (r.type === "NPS") {
      npsScoreRaw = Number(r.value)
      if (npsScoreRaw >= 9) npsCategory = "PROMOTER"
      else if (npsScoreRaw >= 7) npsCategory = "PASSIVE"
      else npsCategory = "DETRACTOR"
    } else if (r.type === "RATING" || r.type === "LIKERT") {
      // Note: LIKERT is string, but Rating is number. Safely attempt parse.
      const val = Number(r.value)
      if (!isNaN(val)) {
        totalRating += val
        ratingCount++
      }
    }

    let numericScore = null;
    let textAnswer = null;
    let choiceAnswer = null;

    if (r.type === "NPS" || r.type === "RATING") {
      numericScore = Number(r.value);
    } else if (r.type === "TEXT") {
      textAnswer = String(r.value);
    } else if (r.type === "CHECKBOX" && Array.isArray(r.value)) {
      choiceAnswer = JSON.stringify(r.value);
    } else {
      choiceAnswer = String(r.value);
    }

    await prisma.surveyResponse.create({
      data: {
        formId: form.id,
        questionId: r.questionId,
        numericScore,
        textAnswer,
        choiceAnswer
      }
    })
  }

  await prisma.surveyForm.update({
    where: { id: form.id },
    data: { 
      status: "SUBMITTED",
      submittedByEmail: session.user!.email,
      submissionDateTime: new Date(),
      npsScoreRaw, 
      npsCategory,
      overallAverageScore: ratingCount > 0 ? totalRating / ratingCount : null
    }
  })

  revalidatePath("/parent/surveys")
  redirect("/parent/surveys")
}