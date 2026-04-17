"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createCategoryAction(data: { name: string; code: string; sortOrder?: number }) {
  await prisma.surveySection.create({
    data: {
      name: data.name,
      code: data.code,
      sortOrder: data.sortOrder ?? 0,
      status: "ACTIVE"
    }
  })
  revalidatePath("/admin/categories")
}

export async function updateCategoryAction(data: { id: string; name?: string; code?: string; sortOrder?: number; status?: string }) {
  const { id, ...rest } = data
  await prisma.surveySection.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/categories")
}

export async function deleteCategoryAction(id: string) {
  await prisma.surveyQuestion.updateMany({
    where: { sectionId: id },
    data: { sectionId: null }
  })
  await prisma.surveySection.delete({ where: { id } })
  revalidatePath("/admin/categories")
}
