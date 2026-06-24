"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createExamCategoryAction(data: { name: string; code: string; description?: string }) {
  await prisma.examCategory.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null
    }
  })
  revalidatePath("/admin/ktdbcl/categories")
}

export async function updateExamCategoryAction(data: { id: string; name?: string; code?: string; description?: string }) {
  const { id, ...rest } = data
  await prisma.examCategory.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/ktdbcl/categories")
}

export async function deleteExamCategoryAction(id: string) {
  // Disassociate or delete exams that reference this category
  // Since we set onDelete: Cascade on the relation, Prisma will handle it, 
  // but let's make sure we delete the category.
  await prisma.examCategory.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/categories")
}
