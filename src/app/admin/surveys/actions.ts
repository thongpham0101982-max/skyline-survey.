"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createSurveyPeriodAction(data: {
  name: string
  startDate: string
  endDate: string
  academicYearId: string
  targetAudience?: string
  campusId?: string
}) {
  const { name, startDate, endDate, academicYearId, targetAudience, campusId } = data
  if (!name || !startDate || !endDate || !academicYearId) {
    return { error: "Thiếu thông tin bắt buộc" }
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return { error: "Ngày bắt đầu đợt khảo sát phải trước ngày kết thúc." }
  }

  // Sinh mã code có kết hợp số ngẫu nhiên tránh xung đột trùng lặp khi bấm đồng thời
  const code = "KS-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000)

  try {
    await prisma.surveyPeriod.create({
      data: {
        code,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYearId,
        targetAudience: targetAudience || "PHHS",
        campusId: campusId || null,
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
  if (!data.id) return { error: "Thiếu ID" }

  if (data.startDate || data.endDate) {
    const existing = await prisma.surveyPeriod.findUnique({ where: { id: data.id } })
    if (existing) {
      const newStart = data.startDate ? new Date(data.startDate) : new Date(existing.startDate)
      const newEnd = data.endDate ? new Date(data.endDate) : new Date(existing.endDate)
      if (newStart >= newEnd) {
        return { error: "Ngày bắt đầu đợt khảo sát phải trước ngày kết thúc." }
      }
    }
  }

  const payload: any = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = new Date(data.startDate)
  if (data.endDate) payload.endDate = new Date(data.endDate)
  if (data.status) payload.status = data.status
  if (data.isActive !== undefined) payload.isActive = data.isActive
  if (data.targetAudience) payload.targetAudience = data.targetAudience
  if (data.campusId !== undefined) payload.campusId = data.campusId || null
  if (data.academicYearId) payload.academicYearId = data.academicYearId

  try {
    await prisma.surveyPeriod.update({
      where: { id: data.id },
      data: payload
    })
    revalidatePath("/admin/surveys")
    return { success: true }
  } catch(e: any) {
    console.error('Update Survey Error:', e)
    return { error: e.message }
  }
}

export async function deleteSurveyPeriodAction(id: string) {
  try {
    await prisma.surveyPeriod.delete({ where: { id } })
    revalidatePath("/admin/surveys")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteMultipleSurveysAction(ids: string[]) {
  try {
    await prisma.surveyPeriod.deleteMany({
      where: { id: { in: ids } }
    })
    revalidatePath("/admin/surveys")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
