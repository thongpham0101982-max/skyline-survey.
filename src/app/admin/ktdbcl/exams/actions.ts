"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

export async function createExamAction(data: {
  name: string
  code?: string
  description?: string
  startDate?: string
  endDate?: string
  categoryId: string
  roundId?: string
  departmentId?: string
  plan?: string
  isPriority?: boolean
  academicYearId?: string
  grade?: string
}) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền tạo kỳ thi.");
  }

  let finalCode = (data.code || "").trim();
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const prefix = `CT-${yearSuffix}-`;

  // Auto-generate or resolve code collision
  if (!finalCode) {
    const existing = await prisma.exam.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true }
    });
    let maxSeq = 0;
    for (const e of existing) {
      const num = parseInt(e.code.replace(prefix, ""), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
    finalCode = `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  } else {
    const existing = await prisma.exam.findUnique({
      where: { code: finalCode }
    });
    if (existing) {
      // If code already taken, auto-increment to next free sequence
      const allExams = await prisma.exam.findMany({
        where: { code: { startsWith: prefix } },
        select: { code: true }
      });
      let maxSeq = 0;
      for (const e of allExams) {
        const num = parseInt(e.code.replace(prefix, ""), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
      finalCode = `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
    }
  }

  await prisma.exam.create({
    data: {
      name: data.name.trim(),
      code: finalCode,
      description: data.description || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      categoryId: data.categoryId,
      roundId: data.roundId || null,
      departmentId: data.departmentId || null,
      plan: data.plan || null,
      isPriority: data.isPriority || false,
      academicYearId: data.academicYearId || null,
      grade: data.grade || null
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
  plan?: string
  isPriority?: boolean
  academicYearId?: string
  grade?: string
}) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền cập nhật kỳ thi.");
  }
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
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền xóa kỳ thi.");
  }
  await prisma.exam.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/exams")
}
