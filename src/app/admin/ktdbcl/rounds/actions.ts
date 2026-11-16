"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

async function verifyRoundPermission(actionType: "create" | "update" | "delete") {
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
            in: ["KTDBCL_EXAM_ROUNDS", "KTDBCL_EXAMS", "KTDBCL", "ADMIN"],
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
    console.error("Error checking round permissions:", e)
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.")
}

export async function createExamRoundAction(data: {
  name: string
  code: string
  description?: string
  academicYearId?: string | null
}) {
  await verifyRoundPermission("create")
  const created = await prisma.examRound.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || null,
      academicYearId: data.academicYearId || null,
    },
    include: {
      exams: {
        select: { id: true, academicYearId: true },
      },
    },
  })
  revalidatePath("/admin/ktdbcl/rounds")
  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  return created
}

export async function updateExamRoundAction(data: {
  id: string
  name?: string
  code?: string
  description?: string
  academicYearId?: string | null
}) {
  await verifyRoundPermission("update")
  const { id, ...rest } = data
  const updated = await prisma.examRound.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
      ...(rest.code !== undefined ? { code: rest.code.trim() } : {}),
      ...(rest.description !== undefined ? { description: rest.description.trim() || null } : {}),
      ...(rest.academicYearId !== undefined ? { academicYearId: rest.academicYearId } : {}),
    },
    include: {
      exams: {
        select: { id: true, academicYearId: true },
      },
    },
  })
  revalidatePath("/admin/ktdbcl/rounds")
  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  return updated
}

export async function deleteExamRoundAction(id: string) {
  await verifyRoundPermission("delete")
  await prisma.examRound.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/rounds")
  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
}
