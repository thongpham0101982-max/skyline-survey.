"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

export async function createExamCategoryAction(data: { name: string; code: string; description?: string; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.");
  }
  await prisma.examCategory.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      academicYearId: data.academicYearId || null
    }
  })
  revalidatePath("/admin/ktdbcl/categories")
}

export async function updateExamCategoryAction(data: { id: string; name?: string; code?: string; description?: string; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.");
  }
  const { id, ...rest } = data
  await prisma.examCategory.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/ktdbcl/categories")
}

export async function deleteExamCategoryAction(id: string) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.");
  }
  // Disassociate or delete exams that reference this category
  // Since we set onDelete: Cascade on the relation, Prisma will handle it, 
  // but let's make sure we delete the category.
  await prisma.examCategory.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/categories")
}
