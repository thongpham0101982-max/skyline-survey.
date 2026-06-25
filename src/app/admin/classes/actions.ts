"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importClassesAction(data: any[]) {
  let count = 0
  for (const item of data) {
    try {
      await prisma.class.upsert({
        where: { classCode: item.classCode },
        update: {
          className: item.className,
          campusId: item.campusId,
          academicYearId: item.academicYearId,
          level: item.level || "",
          grade: item.grade || "",
          educationSystem: item.educationSystem || ""
        },
        create: {
          classCode: item.classCode,
          className: item.className,
          campusId: item.campusId,
          academicYearId: item.academicYearId,
          level: item.level || "",
          grade: item.grade || "",
          educationSystem: item.educationSystem || "",
          status: "ACTIVE"
        }
      })
      count++
    } catch(e) {
      console.error("Import error on row: ", item, e)
    }
  }
  revalidatePath("/admin/classes")
  return { success: true, count }
}

export async function deleteClasses(ids: string[]) {
  try {
    await prisma.class.deleteMany({
      where: { id: { in: ids } }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateClass(id: string, data: any) {
  try {
    await prisma.class.update({
      where: { id },
      data: {
        className: data.className,
        level: data.level,
        grade: data.grade,
        campusId: data.campusId,
        educationSystem: data.educationSystem || "",
        homeroomTeacherId: data.homeroomTeacherId
      }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

export async function createClassAction(data: any) {
  try {
    // Auto-generate classCode
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId }
    })
    let yearSuffix = String(new Date().getFullYear()).slice(-2) // fallback
    if (academicYear && academicYear.name) {
      const parts = academicYear.name.split("-")
      const yearStr = parts[1] || parts[0]
      if (yearStr && yearStr.trim().length >= 4) {
        yearSuffix = yearStr.trim().slice(-2)
      }
    }

    const isMN = data.level === "Mầm non"
    const prefix = isMN ? `MN-${yearSuffix}-` : `C-${yearSuffix}-`

    const existingClasses = await prisma.class.findMany({
      where: {
        academicYearId: data.academicYearId,
        classCode: { startsWith: prefix }
      },
      select: { classCode: true }
    })

    let maxSeq = 0
    for (const c of existingClasses) {
      const parts = c.classCode.split("-")
      const seqStr = parts[parts.length - 1]
      const seq = parseInt(seqStr, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
    const nextSeq = maxSeq + 1
    const generatedClassCode = `${prefix}${nextSeq}`

    await prisma.class.create({
      data: {
        classCode: generatedClassCode,
        className: data.className,
        level: data.level || "",
        grade: data.grade || "",
        campusId: data.campusId,
        academicYearId: data.academicYearId,
        educationSystem: data.educationSystem || "",
        homeroomTeacherId: data.homeroomTeacherId || null,
        status: "ACTIVE"
      }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}