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

export async function bulkUpdateCategoriesAction(data: { ids: string[]; status?: string; parentId?: string | null }) {
  const { ids, status, parentId } = data
  if (!ids || ids.length === 0) return { success: false }

  const updateData: any = {}
  if (status !== undefined) updateData.status = status
  if (parentId !== undefined) updateData.parentId = parentId === "" ? null : parentId

  await prisma.surveySection.updateMany({
    where: { id: { in: ids } },
    data: updateData
  })

  revalidatePath("/admin/categories")
  return { success: true }
}

export async function deleteCategoryAction(id: string) {
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

export async function bulkDeleteCategoriesAction(ids: string[]) {
  if (!ids || ids.length === 0) return { success: false }

  await prisma.surveySection.updateMany({
    where: { parentId: { in: ids } },
    data: { parentId: null }
  })
  await prisma.surveyQuestion.updateMany({
    where: { sectionId: { in: ids } },
    data: { sectionId: null }
  })
  await prisma.surveySection.deleteMany({
    where: { id: { in: ids } }
  })
  revalidatePath("/admin/categories")
  return { success: true }
}
