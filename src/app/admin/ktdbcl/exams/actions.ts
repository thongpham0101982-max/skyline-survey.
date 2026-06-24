"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createExamAction(data: {
  name: string
  code: string
  description?: string
  startDate?: string
  endDate?: string
  categoryId: string
  roundId?: string
  departmentId?: string
  teacherId?: string
  isPriority?: boolean
  academicYearId?: string
}) {
  await prisma.exam.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      categoryId: data.categoryId,
      roundId: data.roundId || null,
      departmentId: data.departmentId || null,
      teacherId: data.teacherId || null,
      isPriority: data.isPriority || false,
      academicYearId: data.academicYearId || null
    }
  })
  revalidatePath("/admin/ktdbcl/exams")
}

export async function updateExamAction(data: {
  id: string
  name?: string
  code?: string
  description?: string
  startDate?: string
  endDate?: string
  categoryId?: string
  roundId?: string
  departmentId?: string
  teacherId?: string
  isPriority?: boolean
  academicYearId?: string
}) {
  const { id, ...rest } = data
  const updateData: any = { ...rest }

  if (rest.startDate !== undefined) {
    updateData.startDate = rest.startDate ? new Date(rest.startDate) : null
  }
  if (rest.endDate !== undefined) {
    updateData.endDate = rest.endDate ? new Date(rest.endDate) : null
  }

  await prisma.exam.update({
    where: { id },
    data: updateData
  })
  revalidatePath("/admin/ktdbcl/exams")
}

export async function deleteExamAction(id: string) {
  await prisma.exam.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/exams")
}
