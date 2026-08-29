// @ts-nocheck
"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function recalculateSurveySummaries(tx: any, surveyPeriodId: string, classId: string, campusId: string) {
  try {
    // 1. Recalculate for Class
    const totalClassStudents = await tx.student.count({ where: { classId, status: "ACTIVE" } });
    const classForms = await tx.surveyForm.findMany({
      where: { surveyPeriodId, classId, status: "SUBMITTED" },
      select: { npsCategory: true, overallAverageScore: true }
    });
    const surveyedClass = classForms.length;
    const notSurveyedClass = Math.max(0, totalClassStudents - surveyedClass);
    const completionRateClass = totalClassStudents > 0 ? Number(((surveyedClass / totalClassStudents) * 100).toFixed(1)) : 0;

    let promoterClass = 0, passiveClass = 0, detractorClass = 0, totalScoreClass = 0, countScoreClass = 0;
    classForms.forEach((f: any) => {
      if (f.npsCategory === "PROMOTER") promoterClass++;
      else if (f.npsCategory === "PASSIVE") passiveClass++;
      else if (f.npsCategory === "DETRACTOR") detractorClass++;
      if (f.overallAverageScore !== null && f.overallAverageScore !== undefined && f.overallAverageScore > 0) {
        totalScoreClass += f.overallAverageScore;
        countScoreClass++;
      }
    });
    const avgSatisfactionClass = countScoreClass > 0 ? Number((totalScoreClass / countScoreClass).toFixed(2)) : 0;
    const totalResponsesClass = promoterClass + passiveClass + detractorClass;
    const npsClass = totalResponsesClass > 0 ? Number((((promoterClass / totalResponsesClass) * 100) - ((detractorClass / totalResponsesClass) * 100)).toFixed(1)) : 0;

    await tx.summaryByClass.upsert({
      where: { surveyPeriodId_classId: { surveyPeriodId, classId } },
      update: {
        totalStudents: totalClassStudents,
        surveyedStudents: surveyedClass,
        notSurveyedStudents: notSurveyedClass,
        completionRate: completionRateClass,
        averageSatisfactionScore: avgSatisfactionClass,
        promoterCount: promoterClass,
        passiveCount: passiveClass,
        detractorCount: detractorClass,
        npsValue: npsClass
      },
      create: {
        surveyPeriodId,
        classId,
        totalStudents: totalClassStudents,
        surveyedStudents: surveyedClass,
        notSurveyedStudents: notSurveyedClass,
        completionRate: completionRateClass,
        averageSatisfactionScore: avgSatisfactionClass,
        promoterCount: promoterClass,
        passiveCount: passiveClass,
        detractorCount: detractorClass,
        npsValue: npsClass
      }
    });

    // 2. Recalculate for Campus
    const totalCampusStudents = await tx.student.count({ where: { campusId, status: "ACTIVE" } });
    const campusForms = await tx.surveyForm.findMany({
      where: { surveyPeriodId, campusId, status: "SUBMITTED" },
      select: { npsCategory: true, overallAverageScore: true }
    });
    const surveyedCampus = campusForms.length;
    const notSurveyedCampus = Math.max(0, totalCampusStudents - surveyedCampus);
    const completionRateCampus = totalCampusStudents > 0 ? Number(((surveyedCampus / totalCampusStudents) * 100).toFixed(1)) : 0;

    let promoterCampus = 0, passiveCampus = 0, detractorCampus = 0, totalScoreCampus = 0, countScoreCampus = 0;
    campusForms.forEach((f: any) => {
      if (f.npsCategory === "PROMOTER") promoterCampus++;
      else if (f.npsCategory === "PASSIVE") passiveCampus++;
      else if (f.npsCategory === "DETRACTOR") detractorCampus++;
      if (f.overallAverageScore !== null && f.overallAverageScore !== undefined && f.overallAverageScore > 0) {
        totalScoreCampus += f.overallAverageScore;
        countScoreCampus++;
      }
    });
    const avgSatisfactionCampus = countScoreCampus > 0 ? Number((totalScoreCampus / countScoreCampus).toFixed(2)) : 0;
    const totalResponsesCampus = promoterCampus + passiveCampus + detractorCampus;
    const npsCampus = totalResponsesCampus > 0 ? Number((((promoterCampus / totalResponsesCampus) * 100) - ((detractorCampus / totalResponsesCampus) * 100)).toFixed(1)) : 0;

    await tx.summaryByCampus.upsert({
      where: { surveyPeriodId_campusId: { surveyPeriodId, campusId } },
      update: {
        totalStudents: totalCampusStudents,
        surveyedStudents: surveyedCampus,
        notSurveyedStudents: notSurveyedCampus,
        completionRate: completionRateCampus,
        averageSatisfactionScore: avgSatisfactionCampus,
        promoterCount: promoterCampus,
        passiveCount: passiveCampus,
        detractorCount: detractorCampus,
        npsValue: npsCampus
      },
      create: {
        surveyPeriodId,
        campusId,
        totalStudents: totalCampusStudents,
        surveyedStudents: surveyedCampus,
        notSurveyedStudents: notSurveyedCampus,
        completionRate: completionRateCampus,
        averageSatisfactionScore: avgSatisfactionCampus,
        promoterCount: promoterCampus,
        passiveCount: passiveCampus,
        detractorCount: detractorCampus,
        npsValue: npsCampus
      }
    });
  } catch (err) {
    console.error("Error recalculating summaries:", err);
  }
}

export async function submitSurveyAction(data: any) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) throw new Error("Unauthorized")

  const parent = await prisma.parent.findUnique({ where: { userId } })
  if (!parent) throw new Error("Parent not found")

  const { surveyPeriodId, studentId, responses } = data

  // 1. Kiểm tra trạng thái và khoảng thời gian hoạt động của đợt khảo sát
  const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } })
  if (!period || !period.isActive || period.status !== "ACTIVE") {
    return { error: "Đợt khảo sát này hiện tại đang bị đóng hoặc không hoạt động." }
  }
  const now = new Date()
  if (now < new Date(period.startDate) || now > new Date(period.endDate)) {
    return { error: "Thời gian làm khảo sát đã hết hạn hoặc chưa bắt đầu." }
  }

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

  // Bọc toàn bộ hoạt động ghi dữ liệu vào một Transaction
  await prisma.$transaction(async (tx) => {
    if (form) {
      await tx.surveyResponse.deleteMany({ where: { formId: form.id } })
    } else {
      form = await tx.surveyForm.create({
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
      } else if (r.type === "RATING" || r.type === "LIKERT" || r.type === "SCALE_0_4") {
        const val = Number(r.value)
        if (!isNaN(val)) {
          totalRating += val
          ratingCount++
        }
      }

      let numericScore = null;
      let textAnswer = null;
      let choiceAnswer = null;

      if (r.type === "NPS" || r.type === "RATING" || r.type === "SCALE_0_4") {
        numericScore = Number(r.value);
      } else if (r.type === "TEXT") {
        textAnswer = String(r.value);
      } else if (["CHECKBOX", "MC_GRID", "CB_GRID"].includes(r.type) || typeof r.value === 'object') {
        choiceAnswer = JSON.stringify(r.value);
      } else {
        choiceAnswer = String(r.value);
      }

      await tx.surveyResponse.create({
        data: {
          formId: form.id,
          questionId: r.questionId,
          numericScore,
          textAnswer,
          choiceAnswer
        }
      })
    }

    await tx.surveyForm.update({
      where: { id: form.id },
      data: { 
        status: "SUBMITTED",
        submittedByEmail: session.user!.email,
        submissionDateTime: new Date(),
        npsScoreRaw, 
        npsCategory,
        overallAverageScore: ratingCount > 0 ? totalRating / ratingCount : null
      }
    });

    // Cập nhật bảng tổng hợp tức thì
    await recalculateSurveySummaries(tx, surveyPeriodId, student.classId, student.campusId);
  })

  revalidatePath("/parent/surveys")
  redirect("/parent/surveys")
}