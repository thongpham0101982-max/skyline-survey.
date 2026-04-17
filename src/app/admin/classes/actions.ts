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
        educationSystem: data.educationSystem || ""
      }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}