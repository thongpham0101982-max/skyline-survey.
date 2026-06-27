"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

// --- Category Actions ---

export async function createAchievementCategoryAction(data: { name: string; code: string; description?: string; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  await prisma.achievementCategory.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      academicYearId: data.academicYearId || null
    }
  })
  revalidatePath("/admin/ktdbcl/achievements")
}

export async function updateAchievementCategoryAction(data: { id: string; name?: string; code?: string; description?: string; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  const { id, ...rest } = data
  await prisma.achievementCategory.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/ktdbcl/achievements")
}

export async function deleteAchievementCategoryAction(id: string) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  await prisma.achievementCategory.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/achievements")
}

// --- Level Actions ---

export async function createAchievementLevelAction(data: { name: string; code: string; description?: string; categoryId?: string | null; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  await prisma.achievementLevel.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      categoryId: data.categoryId || null,
      academicYearId: data.academicYearId || null
    }
  })
  revalidatePath("/admin/ktdbcl/achievements")
}

export async function updateAchievementLevelAction(data: { id: string; name?: string; code?: string; description?: string; categoryId?: string | null; academicYearId?: string | null }) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  const { id, ...rest } = data
  await prisma.achievementLevel.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/ktdbcl/achievements")
}

export async function deleteAchievementLevelAction(id: string) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Quyền truy cập bị từ chối.");
  }
  await prisma.achievementLevel.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/achievements")
}
