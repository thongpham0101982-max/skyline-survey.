"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createSurveyPeriodAction(data: {
  name: string
  startDate: string
  endDate: string
  academicYearId: string
}) {
  const { name, startDate, endDate, academicYearId } = data
  if (!name || !startDate || !endDate || !academicYearId) {
    return { error: "Thieu thong tin bat buoc" }
  }

  const code = "KS-" + Date.now()

  try {
    await prisma.surveyPeriod.create({
      data: {
        code,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYearId,
        status: "ACTIVE",
        isActive: true,
      }
    })
  } catch(e: any) {
    console.error(e)
    return { error: e.message }
  }
  revalidatePath("/admin/surveys")
  return { success: true }
}

export async function updateSurveyPeriodAction(data: any) {
  const payload: any = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = data.startDate
  if (data.endDate) payload.endDate = data.endDate
  if (data.status) payload.status = data.status
  if (data.isActive !== undefined) payload.isActive = data.isActive

  await prisma.surveyPeriod.update({
    where: { id: data.id },
    data: payload
  })
  revalidatePath("/admin/surveys")
}

export async function deleteSurveyPeriodAction(id: string) {
  await prisma.surveyPeriod.delete({ where: { id } }).catch(()=>{})
  revalidatePath("/admin/surveys")
}

export async function deleteMultipleSurveysAction(ids: string[]) {
  await prisma.surveyPeriod.deleteMany({
    where: { id: { in: ids } }
  }).catch(()=>{})
  revalidatePath('/admin/surveys')
}
