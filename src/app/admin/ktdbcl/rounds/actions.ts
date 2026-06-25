"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createExamRoundAction(data: { name: string; code: string; description?: string; academicYearId?: string }) {
  await prisma.examRound.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      academicYearId: data.academicYearId || null
    }
  })
  revalidatePath("/admin/ktdbcl/rounds")
}

export async function updateExamRoundAction(data: { id: string; name?: string; code?: string; description?: string; academicYearId?: string }) {
  const { id, ...rest } = data
  await prisma.examRound.update({
    where: { id },
    data: rest
  })
  revalidatePath("/admin/ktdbcl/rounds")
}

export async function deleteExamRoundAction(id: string) {
  await prisma.examRound.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/rounds")
}
