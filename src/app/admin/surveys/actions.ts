"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

async function checkSurveyAdminAuth() {
  const session = await auth()
  if (!session || !session.user) {
    return { error: "Unauthorized: Vui lòng đăng nhập" }
  }
  const role = ((session.user as any)?.role || "").toUpperCase()
  const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "TB_DHCM", "GDCS"].includes(role)
  if (!isAllowed) {
    return { error: "Forbidden: Bạn không có quyền quản lý đợt khảo sát" }
  }
  return { session }
}

export async function createSurveyPeriodAction(data: {
  name: string
  startDate: string
  endDate: string
  academicYearId: string
  targetAudience?: string
  campusId?: string
}) {
  const authCheck = await checkSurveyAdminAuth()
  if (authCheck.error) return { error: authCheck.error }

  const { name, startDate, endDate, academicYearId, targetAudience, campusId } = data
  if (!name || !startDate || !endDate || !academicYearId) {
    return { error: "Thiếu thông tin bắt buộc" }
  }

  const cleanName = name.trim()
  if (cleanName.length < 3) {
    return { error: "Tên đợt khảo sát phải có ít nhất 3 ký tự" }
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
        name: cleanName,
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
  const authCheck = await checkSurveyAdminAuth()
  if (authCheck.error) return { error: authCheck.error }

  if (!data.id) return { error: "Thiếu ID" }

  if (data.name !== undefined && (!data.name || data.name.trim().length < 3)) {
    return { error: "Tên đợt khảo sát phải có ít nhất 3 ký tự" }
  }

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
  if (data.name) payload.name = data.name.trim()
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
  const authCheck = await checkSurveyAdminAuth()
  if (authCheck.error) return { error: authCheck.error }

  try {
    const submittedCount = await prisma.surveyForm.count({
      where: { surveyPeriodId: id, status: { in: ["SUBMITTED", "submitted", "COMPLETED", "completed"] } }
    })
    if (submittedCount > 0) {
      return { error: `Không thể xóa đợt khảo sát đã có ${submittedCount} phiếu khảo sát đã nộp kết quả!` }
    }

    await prisma.surveyPeriod.delete({ where: { id } })
    revalidatePath("/admin/surveys")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteMultipleSurveysAction(ids: string[]) {
  const authCheck = await checkSurveyAdminAuth()
  if (authCheck.error) return { error: authCheck.error }

  try {
    const submittedCount = await prisma.surveyForm.count({
      where: { surveyPeriodId: { in: ids }, status: { in: ["SUBMITTED", "submitted", "COMPLETED", "completed"] } }
    })
    if (submittedCount > 0) {
      return { error: `Không thể xóa: Có ${submittedCount} phiếu khảo sát đã nộp kết quả thuộc các đợt được chọn!` }
    }

    await prisma.surveyPeriod.deleteMany({
      where: { id: { in: ids } }
    })
    revalidatePath("/admin/surveys")
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
