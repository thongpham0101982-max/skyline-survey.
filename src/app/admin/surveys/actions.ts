"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function ensureAudienceColumn() {
  try {
    // This is safe to run multiple times, it will just fail if column exists.
    await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'");
    console.log("Migration: added targetAudience column to SurveyPeriod");
  } catch (e) {
    // Ignore error if column already exists
  }
}

export async function createSurveyPeriodAction(data: {
  name: string
  startDate: string
  endDate: string
  academicYearId: string
  targetAudience?: string
}) {
  await ensureAudienceColumn();
  const { name, startDate, endDate, academicYearId, targetAudience } = data
  if (!name || !startDate || !endDate || !academicYearId) {
    return { error: "Thiếu thông tin bắt buộc" }
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
        targetAudience: targetAudience || "PHHS",
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
  await ensureAudienceColumn();
  const payload: any = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = data.startDate
  if (data.endDate) payload.endDate = data.endDate
  if (data.status) payload.status = data.status
  if (data.isActive !== undefined) payload.isActive = data.isActive
  if (data.targetAudience) payload.targetAudience = data.targetAudience

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
