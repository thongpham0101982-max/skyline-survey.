"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

async function verifyPermission(actionType: "create" | "update" | "delete") {
  const session = await getAdminSession()
  if (!session.userId) {
    throw new Error("Vui lòng đăng nhập để thực hiện thao tác này.")
  }
  if (session.isFullAccess) {
    return session
  }

  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const perms = await pAny.permission.findMany({
        where: {
          roleCode: session.role,
          module: { in: ["KTDBCL_EXAM_LIST", "KTDBCL_EXAMS", "KTDBCL", "ADMIN"] },
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
    console.error("Error checking permissions:", e)
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này trên Kỳ thi.")
}

function getYearCodePrefix(yearName?: string | null) {
  const m = (yearName || "").match(/(\d{4})/)
  const yearSuffix = m ? m[1].slice(-2) : String(new Date().getFullYear()).slice(-2)
  return `CT-${yearSuffix}-`
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
  await verifyPermission("create")

  if (!data.name || !data.name.trim()) {
    throw new Error("Tên kỳ thi không được để trống.")
  }

  let validCategoryId = (data.categoryId || "").trim()
  if (!validCategoryId) {
    const firstCat = await prisma.examCategory.findFirst({ select: { id: true } })
    if (!firstCat) {
      throw new Error("Chưa có Danh mục kỳ thi nào trong hệ thống. Vui lòng tạo danh mục trước!")
    }
    validCategoryId = firstCat.id
  } else {
    const cat = await prisma.examCategory.findUnique({
      where: { id: validCategoryId },
      select: { id: true },
    })
    if (!cat) {
      const firstCat = await prisma.examCategory.findFirst({ select: { id: true } })
      if (!firstCat) throw new Error("Danh mục kỳ thi được chọn không tồn tại.")
      validCategoryId = firstCat.id
    }
  }

  let validAcademicYearId: string | null = null
  let resolvedYearName: string | null = null

  if (data.academicYearId && data.academicYearId.trim()) {
    const yr = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId.trim() },
      select: { id: true, name: true },
    })
    if (yr) {
      validAcademicYearId = yr.id
      resolvedYearName = yr.name
    }
  }
  if (!validAcademicYearId) {
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    })
    if (activeYear) {
      validAcademicYearId = activeYear.id
      resolvedYearName = activeYear.name
    } else {
      const latestYear = await prisma.academicYear.findFirst({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true },
      })
      validAcademicYearId = latestYear?.id || null
      resolvedYearName = latestYear?.name || null
    }
  }

  let validRoundId: string | null = null
  if (data.roundId && data.roundId.trim()) {
    const round = await prisma.examRound.findUnique({
      where: { id: data.roundId.trim() },
      select: { id: true },
    })
    if (round) validRoundId = round.id
  }

  let validDepartmentId: string | null = null
  if (data.departmentId && data.departmentId.trim()) {
    const dept = await prisma.department.findUnique({
      where: { id: data.departmentId.trim() },
      select: { id: true },
    })
    if (dept) validDepartmentId = dept.id
  }

  let parsedStartDate: Date | null = null
  if (data.startDate && data.startDate.trim()) {
    const d = new Date(data.startDate.trim())
    if (!isNaN(d.getTime())) parsedStartDate = d
  }

  let parsedEndDate: Date | null = null
  if (data.endDate && data.endDate.trim()) {
    const d = new Date(data.endDate.trim())
    if (!isNaN(d.getTime())) parsedEndDate = d
  }

  let finalCode = (data.code || "").trim()
  const prefix = getYearCodePrefix(resolvedYearName)

  if (
    !finalCode ||
    (await prisma.exam.findUnique({ where: { code: finalCode }, select: { id: true } }))
  ) {
    const existingExams = await prisma.exam.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
    })
    let maxSeq = 0
    for (const e of existingExams) {
      const seqStr = e.code.slice(prefix.length)
      const seq = parseInt(seqStr, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
    finalCode = `${prefix}${String(maxSeq + 1).padStart(4, "0")}`
  }

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
      grade: data.grade ? data.grade.trim() : null,
    },
    include: {
      category: true,
      round: true,
      department: true,
      academicYear: { select: { id: true, name: true } },
      _count: {
        select: {
          students: true,
          achievements: true,
        },
      },
    },
  })

  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  return { success: true, exam: createdExam }
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
  await verifyPermission("update")

  const { id, ...rest } = data
  if (!id) throw new Error("ID kỳ thi không hợp lệ.")

  const updateData: any = {}

  if (rest.name !== undefined) {
    if (!rest.name.trim()) throw new Error("Tên kỳ thi không được để trống.")
    updateData.name = rest.name.trim()
  }

  if (rest.code !== undefined && rest.code.trim()) {
    const codeVal = rest.code.trim()
    const existingWithCode = await prisma.exam.findFirst({
      where: { code: codeVal, NOT: { id } },
      select: { id: true },
    })
    if (existingWithCode) {
      throw new Error(`Mã kỳ thi "${codeVal}" đã được sử dụng bởi kỳ thi khác.`)
    }
    updateData.code = codeVal
  }

  if (rest.description !== undefined) {
    updateData.description = rest.description ? rest.description.trim() : null
  }

  if (rest.categoryId !== undefined) {
    if (rest.categoryId) {
      const cat = await prisma.examCategory.findUnique({
        where: { id: rest.categoryId.trim() },
        select: { id: true },
      })
      if (cat) updateData.categoryId = cat.id
    }
  }

  if (rest.roundId !== undefined) {
    if (rest.roundId && rest.roundId.trim()) {
      const round = await prisma.examRound.findUnique({
        where: { id: rest.roundId.trim() },
        select: { id: true },
      })
      updateData.roundId = round ? round.id : null
    } else {
      updateData.roundId = null
    }
  }

  if (rest.departmentId !== undefined) {
    if (rest.departmentId && rest.departmentId.trim()) {
      const dept = await prisma.department.findUnique({
        where: { id: rest.departmentId.trim() },
        select: { id: true },
      })
      updateData.departmentId = dept ? dept.id : null
    } else {
      updateData.departmentId = null
    }
  }

  let newAcademicYearId: string | null = null
  if (rest.academicYearId !== undefined) {
    if (rest.academicYearId && rest.academicYearId.trim()) {
      const yr = await prisma.academicYear.findUnique({
        where: { id: rest.academicYearId.trim() },
        select: { id: true },
      })
      if (!yr) throw new Error("Năm học được chọn không tồn tại.")
      updateData.academicYearId = yr.id
      newAcademicYearId = yr.id
    } else {
      throw new Error("Kỳ thi bắt buộc phải thuộc về một Năm học.")
    }
  }

  if (rest.plan !== undefined) {
    updateData.plan = rest.plan ? rest.plan.trim() : null
  }

  if (rest.isPriority !== undefined) {
    updateData.isPriority = !!rest.isPriority
  }

  if (rest.grade !== undefined) {
    updateData.grade = rest.grade ? rest.grade.trim() : null
  }

  if (rest.startDate !== undefined) {
    if (rest.startDate && rest.startDate.trim()) {
      const d = new Date(rest.startDate.trim())
      updateData.startDate = isNaN(d.getTime()) ? null : d
    } else {
      updateData.startDate = null
    }
  }

  if (rest.endDate !== undefined) {
    if (rest.endDate && rest.endDate.trim()) {
      const d = new Date(rest.endDate.trim())
      updateData.endDate = isNaN(d.getTime()) ? null : d
    } else {
      updateData.endDate = null
    }
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      round: true,
      department: true,
      academicYear: { select: { id: true, name: true } },
      _count: {
        select: {
          students: true,
          achievements: true,
        },
      },
    },
  })

  // Đồng bộ năm học cho các giải thưởng thuộc kỳ thi nếu kỳ thi được chuyển sang năm học khác
  if (newAcademicYearId) {
    await prisma.achievement.updateMany({
      where: { examId: id },
      data: { academicYearId: newAcademicYearId },
    })
  }

  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  return { success: true, exam: updated }
}

export async function bulkAssignExamYearAction(data: {
  examIds: string[]
  targetAcademicYearId: string
}) {
  await verifyPermission("update")
  const examIds = Array.from(new Set((data.examIds || []).filter(Boolean)))
  if (examIds.length === 0) throw new Error("Vui lòng chọn ít nhất 1 kỳ thi.")

  const yr = await prisma.academicYear.findUnique({
    where: { id: (data.targetAcademicYearId || "").trim() },
    select: { id: true, name: true },
  })
  if (!yr) throw new Error("Năm học đích không hợp lệ.")

  await prisma.$transaction([
    prisma.exam.updateMany({
      where: { id: { in: examIds } },
      data: { academicYearId: yr.id },
    }),
    prisma.achievement.updateMany({
      where: { examId: { in: examIds } },
      data: { academicYearId: yr.id },
    }),
  ])

  const updatedExams = await prisma.exam.findMany({
    where: { id: { in: examIds } },
    include: {
      category: true,
      round: true,
      department: true,
      academicYear: { select: { id: true, name: true } },
      _count: {
        select: {
          students: true,
          achievements: true,
        },
      },
    },
  })

  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  return { success: true, exams: updatedExams, yearName: yr.name }
}

export async function cloneExamsToYearAction(data: {
  sourceExamIds: string[]
  targetAcademicYearId: string
}) {
  await verifyPermission("create")
  const sourceIds = Array.from(new Set((data.sourceExamIds || []).filter(Boolean)))
  if (sourceIds.length === 0) throw new Error("Vui lòng chọn ít nhất 1 kỳ thi để kế thừa.")

  const targetYear = await prisma.academicYear.findUnique({
    where: { id: (data.targetAcademicYearId || "").trim() },
    select: { id: true, name: true },
  })
  if (!targetYear) throw new Error("Năm học đích không tồn tại.")

  const [sourceExams, existingInTarget] = await Promise.all([
    prisma.exam.findMany({
      where: { id: { in: sourceIds } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.exam.findMany({
      where: { academicYearId: targetYear.id },
      select: { name: true },
    }),
  ])

  const existingNames = new Set(existingInTarget.map((e) => e.name.trim().toLowerCase()))
  const prefix = getYearCodePrefix(targetYear.name)
  const existingCodes = await prisma.exam.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  })

  let maxSeq = 0
  for (const e of existingCodes) {
    const seq = parseInt(e.code.slice(prefix.length), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  const clonedExams: any[] = []
  let skippedCount = 0

  for (const src of sourceExams) {
    if (existingNames.has(src.name.trim().toLowerCase())) {
      skippedCount++
      continue
    }
    maxSeq++
    const nextCode = `${prefix}${String(maxSeq).padStart(4, "0")}`
    const created = await prisma.exam.create({
      data: {
        name: src.name,
        code: nextCode,
        description: src.description,
        categoryId: src.categoryId,
        roundId: src.roundId,
        departmentId: src.departmentId,
        plan: src.plan,
        isPriority: src.isPriority,
        grade: src.grade,
        academicYearId: targetYear.id,
      },
      include: {
        category: true,
        round: true,
        department: true,
        academicYear: { select: { id: true, name: true } },
        _count: {
          select: {
            students: true,
            achievements: true,
          },
        },
      },
    })
    existingNames.add(src.name.trim().toLowerCase())
    clonedExams.push(created)
  }

  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  return {
    success: true,
    clonedExams,
    skippedCount,
    yearName: targetYear.name,
  }
}

export async function deleteExamAction(id: string) {
  await verifyPermission("delete")
  if (!id) throw new Error("ID kỳ thi không hợp lệ.")

  await prisma.exam.delete({ where: { id } })
  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  return { success: true }
}
