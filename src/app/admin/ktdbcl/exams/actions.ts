"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

async function verifyPermission(actionType: 'create' | 'update' | 'delete') {
  const session = await getAdminSession();
  if (!session.userId) {
    throw new Error("Vui lòng đăng nhập để thực hiện thao tác này.");
  }
  if (session.isFullAccess) {
    return session;
  }

  // Check role permissions table
  try {
    const pAny = prisma as any;
    if (pAny && pAny.permission) {
      const perms = await pAny.permission.findMany({
        where: {
          roleCode: session.role,
          module: { in: ["KTDBCL_EXAM_LIST", "KTDBCL", "ADMIN"] }
        }
      });
      const hasPerm = perms.some((p: any) => {
        if (actionType === 'create') return p.canCreate;
        if (actionType === 'update') return p.canUpdate;
        if (actionType === 'delete') return p.canDelete;
        return p.canRead;
      });
      if (hasPerm) return session;
    }
  } catch (e) {
    console.error("Error checking permissions:", e);
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này trên Kỳ thi.");
}

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
  await verifyPermission('create');

  if (!data.name || !data.name.trim()) {
    throw new Error("Tên kỳ thi không được để trống.");
  }

  // 1. Validate Category
  let validCategoryId = (data.categoryId || "").trim();
  if (!validCategoryId) {
    const firstCat = await prisma.examCategory.findFirst({ select: { id: true } });
    if (!firstCat) {
      throw new Error("Chưa có Danh mục kỳ thi nào trong hệ thống. Vui lòng tạo danh mục trước!");
    }
    validCategoryId = firstCat.id;
  } else {
    const cat = await prisma.examCategory.findUnique({
      where: { id: validCategoryId },
      select: { id: true }
    });
    if (!cat) {
      const firstCat = await prisma.examCategory.findFirst({ select: { id: true } });
      if (!firstCat) throw new Error("Danh mục kỳ thi được chọn không tồn tại.");
      validCategoryId = firstCat.id;
    }
  }

  // 2. Validate Academic Year
  let validAcademicYearId: string | null = null;
  if (data.academicYearId && data.academicYearId.trim()) {
    const yr = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId.trim() },
      select: { id: true }
    });
    if (yr) validAcademicYearId = yr.id;
  }
  if (!validAcademicYearId) {
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true }
    });
    validAcademicYearId = activeYear?.id || null;
  }

  // 3. Validate Round (Optional)
  let validRoundId: string | null = null;
  if (data.roundId && data.roundId.trim()) {
    const round = await prisma.examRound.findUnique({
      where: { id: data.roundId.trim() },
      select: { id: true }
    });
    if (round) validRoundId = round.id;
  }

  // 4. Validate Department (Optional)
  let validDepartmentId: string | null = null;
  if (data.departmentId && data.departmentId.trim()) {
    const dept = await prisma.department.findUnique({
      where: { id: data.departmentId.trim() },
      select: { id: true }
    });
    if (dept) validDepartmentId = dept.id;
  }

  // 5. Parse Dates
  let parsedStartDate: Date | null = null;
  if (data.startDate && data.startDate.trim()) {
    const d = new Date(data.startDate.trim());
    if (!isNaN(d.getTime())) parsedStartDate = d;
  }

  let parsedEndDate: Date | null = null;
  if (data.endDate && data.endDate.trim()) {
    const d = new Date(data.endDate.trim());
    if (!isNaN(d.getTime())) parsedEndDate = d;
  }

  // 6. Generate unique exam code safely
  let finalCode = (data.code || "").trim();
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const prefix = `CT-${yearSuffix}-`;

  // Always verify if finalCode is already taken or empty
  if (!finalCode || (await prisma.exam.findUnique({ where: { code: finalCode }, select: { id: true } }))) {
    const existingExams = await prisma.exam.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true }
    });
    let maxSeq = 0;
    for (const e of existingExams) {
      const seqStr = e.code.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
    finalCode = `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  }

  // 7. Save Exam to Database
  const createdExam = await prisma.exam.create({
    data: {
      name: data.name.trim(),
      code: finalCode,
      description: data.description ? data.description.trim() : null,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      categoryId: validCategoryId,
      roundId: validRoundId,
      departmentId: validDepartmentId,
      plan: data.plan ? data.plan.trim() : null,
      isPriority: !!data.isPriority,
      academicYearId: validAcademicYearId,
      grade: data.grade ? data.grade.trim() : null
    }
  });

  revalidatePath("/admin/ktdbcl/exams");
  return { success: true, exam: createdExam };
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
  await verifyPermission('update');

  const { id, ...rest } = data;
  if (!id) throw new Error("ID kỳ thi không hợp lệ.");

  const updateData: any = {};

  if (rest.name !== undefined) {
    if (!rest.name.trim()) throw new Error("Tên kỳ thi không được để trống.");
    updateData.name = rest.name.trim();
  }

  if (rest.code !== undefined && rest.code.trim()) {
    const codeVal = rest.code.trim();
    const existingWithCode = await prisma.exam.findFirst({
      where: { code: codeVal, NOT: { id } },
      select: { id: true }
    });
    if (existingWithCode) {
      throw new Error(`Mã kỳ thi "${codeVal}" đã được sử dụng bởi kỳ thi khác.`);
    }
    updateData.code = codeVal;
  }

  if (rest.description !== undefined) {
    updateData.description = rest.description ? rest.description.trim() : null;
  }

  if (rest.categoryId !== undefined) {
    if (rest.categoryId) {
      const cat = await prisma.examCategory.findUnique({
        where: { id: rest.categoryId.trim() },
        select: { id: true }
      });
      if (cat) updateData.categoryId = cat.id;
    }
  }

  if (rest.roundId !== undefined) {
    if (rest.roundId && rest.roundId.trim()) {
      const round = await prisma.examRound.findUnique({
        where: { id: rest.roundId.trim() },
        select: { id: true }
      });
      updateData.roundId = round ? round.id : null;
    } else {
      updateData.roundId = null;
    }
  }

  if (rest.departmentId !== undefined) {
    if (rest.departmentId && rest.departmentId.trim()) {
      const dept = await prisma.department.findUnique({
        where: { id: rest.departmentId.trim() },
        select: { id: true }
      });
      updateData.departmentId = dept ? dept.id : null;
    } else {
      updateData.departmentId = null;
    }
  }

  if (rest.academicYearId !== undefined) {
    if (rest.academicYearId && rest.academicYearId.trim()) {
      const yr = await prisma.academicYear.findUnique({
        where: { id: rest.academicYearId.trim() },
        select: { id: true }
      });
      updateData.academicYearId = yr ? yr.id : null;
    } else {
      updateData.academicYearId = null;
    }
  }

  if (rest.plan !== undefined) {
    updateData.plan = rest.plan ? rest.plan.trim() : null;
  }

  if (rest.isPriority !== undefined) {
    updateData.isPriority = !!rest.isPriority;
  }

  if (rest.grade !== undefined) {
    updateData.grade = rest.grade ? rest.grade.trim() : null;
  }

  if (rest.startDate !== undefined) {
    if (rest.startDate && rest.startDate.trim()) {
      const d = new Date(rest.startDate.trim());
      updateData.startDate = isNaN(d.getTime()) ? null : d;
    } else {
      updateData.startDate = null;
    }
  }

  if (rest.endDate !== undefined) {
    if (rest.endDate && rest.endDate.trim()) {
      const d = new Date(rest.endDate.trim());
      updateData.endDate = isNaN(d.getTime()) ? null : d;
    } else {
      updateData.endDate = null;
    }
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: updateData
  });

  revalidatePath("/admin/ktdbcl/exams");
  return { success: true, exam: updated };
}

export async function deleteExamAction(id: string) {
  await verifyPermission('delete');
  if (!id) throw new Error("ID kỳ thi không hợp lệ.");

  await prisma.exam.delete({ where: { id } });
  revalidatePath("/admin/ktdbcl/exams");
  return { success: true };
}
