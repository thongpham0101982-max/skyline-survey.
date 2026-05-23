"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveSurveyQuestionsAction(surveyPeriodId: string, questions: any[]) {
  const existing = await prisma.surveyQuestion.findMany({ where: { surveyPeriodId } })
  const newIds = questions.map(q => q.id).filter(id => !id.startsWith("new_"))
  
  const toDelete = existing.filter(e => !newIds.includes(e.id))
  for (const d of toDelete) {
    await prisma.surveyQuestion.delete({ where: { id: d.id } }).catch(()=>{})
  }

  for (const [index, q] of questions.entries()) {
    const isNew = q.id.startsWith("new_")

    let activeSectionId = existing[0]?.sectionId || null;
    if (q.category && q.category.trim() !== "") {
      let section = await prisma.surveySection.findFirst({ where: { name: q.category.trim() } })
      if (!section) {
         section = await prisma.surveySection.create({ 
             data: { name: q.category.trim(), code: `SEC-${Date.now()}-${Math.floor(Math.random()*1000)}` }
         }).catch((e) => { console.error(e); return null; }) as any
      }
      if (section) activeSectionId = section.id;
    }

    const data = {
      code: q.code || `Q-${Date.now()}-${index}`,
      questionText: q.questionText,
      questionType: q.questionType,
      isRequired: q.isRequired,
      ratingScaleMin: q.ratingScaleMin,
      ratingScaleMax: q.ratingScaleMax,
      options: q.options ? JSON.stringify(q.options) : null,
      weight: typeof q.weight === 'number' && !Number.isNaN(q.weight) ? q.weight : 1,
      sortOrder: index,
      surveyPeriodId,
      sectionId: activeSectionId
    }

    if (isNew) {
      await prisma.surveyQuestion.create({ data }).catch(()=>{})
    } else {
      await prisma.surveyQuestion.update({ where: { id: q.id }, data }).catch(()=>{})
    }
  }

  revalidatePath(`/admin/surveys/${surveyPeriodId}/questions`)
  return { success: true }
}