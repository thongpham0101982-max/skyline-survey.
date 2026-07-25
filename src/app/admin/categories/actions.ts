"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createCategoryAction(data: { name: string; code: string; sortOrder?: number; parentId?: string | null }) {
  const newCat = await prisma.surveySection.create({
    data: {
      name: data.name,
      code: data.code,
      sortOrder: data.sortOrder ?? 0,
      parentId: data.parentId || null,
      status: "ACTIVE"
    },
    include: {
      parent: true,
      children: {
        orderBy: { sortOrder: "asc" }
      },
      _count: { select: { questions: true } }
    }
  })
  revalidatePath("/admin/categories")
  return newCat
}

export async function updateCategoryAction(data: { id: string; name?: string; code?: string; sortOrder?: number; status?: string; parentId?: string | null }) {
  const { id, ...rest } = data
  if (rest.parentId === id) {
    rest.parentId = null
  }
  const updatedCat = await prisma.surveySection.update({
    where: { id },
    data: {
      ...rest,
      parentId: rest.parentId === "" ? null : rest.parentId
    },
    include: {
      parent: true,
      children: {
        orderBy: { sortOrder: "asc" }
      },
      _count: { select: { questions: true } }
    }
  })
  revalidatePath("/admin/categories")
  return updatedCat
}

export async function deleteCategoryAction(id: string) {
  // Set child categories parent to null first
  await prisma.surveySection.updateMany({
    where: { parentId: id },
    data: { parentId: null }
  })
  await prisma.surveyQuestion.updateMany({
    where: { sectionId: id },
    data: { sectionId: null }
  })
  await prisma.surveySection.delete({ where: { id } })
  revalidatePath("/admin/categories")
}
