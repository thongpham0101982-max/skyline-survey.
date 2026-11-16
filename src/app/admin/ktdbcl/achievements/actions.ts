"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

async function verifyAchievementDictPermission(actionType: "create" | "update" | "delete") {
  const session = await getAdminSession()
  if (!session.userId) {
    throw new Error("Vui lòng đăng nhập để thực hiện thao tác này.")
  }
  if (session.isFullAccess) return session

  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const perms = await pAny.permission.findMany({
        where: {
          roleCode: session.role,
          module: {
            in: ["KTDBCL_EXAM_ACHIEVEMENTS", "KTDBCL_EXAMS", "KTDBCL", "ADMIN"],
          },
        },
      })
      const hasPerm = perms.some((p: any) => {
        if (actionType === "create") return p.canCreate
        if (actionType === "update") return p.canUpdate
        if (actionType === "delete") return p.canDelete
        return p.canRead
      })
      if (hasPerm) return session
    }
  } catch (e) {
    console.error("Error checking achievement dict permissions:", e)
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.")
}

// --- Category Actions ---

export async function createAchievementCategoryAction(data: {
  name: string
  code: string
  description?: string
  academicYearId?: string | null
}) {
  await verifyAchievementDictPermission("create")
  const created = await prisma.achievementCategory.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      academicYearId: data.academicYearId || null,
    },
  })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
  return created
}

export async function updateAchievementCategoryAction(data: {
  id: string
  name?: string
  code?: string
  description?: string
  academicYearId?: string | null
}) {
  await verifyAchievementDictPermission("update")
  const { id, ...rest } = data
  const updated = await prisma.achievementCategory.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
      ...(rest.code !== undefined ? { code: rest.code.trim() } : {}),
      ...(rest.description !== undefined ? { description: rest.description.trim() || null } : {}),
      ...(rest.academicYearId !== undefined ? { academicYearId: rest.academicYearId } : {}),
    },
  })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
  return updated
}

export async function deleteAchievementCategoryAction(id: string) {
  await verifyAchievementDictPermission("delete")
  await prisma.achievementCategory.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
}

// --- Level Actions ---

export async function createAchievementLevelAction(data: {
  name: string
  code: string
  description?: string
  categoryId?: string | null
  academicYearId?: string | null
}) {
  await verifyAchievementDictPermission("create")
  const created = await prisma.achievementLevel.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId || null,
      academicYearId: data.academicYearId || null,
    },
  })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
  return created
}

export async function updateAchievementLevelAction(data: {
  id: string
  name?: string
  code?: string
  description?: string
  categoryId?: string | null
  academicYearId?: string | null
}) {
  await verifyAchievementDictPermission("update")
  const { id, ...rest } = data
  const updated = await prisma.achievementLevel.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
      ...(rest.code !== undefined ? { code: rest.code.trim() } : {}),
      ...(rest.description !== undefined ? { description: rest.description.trim() || null } : {}),
      ...(rest.categoryId !== undefined ? { categoryId: rest.categoryId || null } : {}),
      ...(rest.academicYearId !== undefined ? { academicYearId: rest.academicYearId } : {}),
    },
  })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
  return updated
}

export async function deleteAchievementLevelAction(id: string) {
  await verifyAchievementDictPermission("delete")
  await prisma.achievementLevel.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/achievements")
  revalidatePath("/admin/ktdbcl/results")
}
