"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveAssignment(data: { teacherId: string, classId: string, subjectId: string, academicYearId: string, semesters: number[] }) {
  try {
    // Delete existing exact matches to recreate
    await prisma.teachingAssignment.deleteMany({
      where: {
        teacherId: data.teacherId,
        classId: data.classId,
        subjectId: data.subjectId,
        academicYearId: data.academicYearId
      }
    })

    const added = []
    for (const sem of data.semesters) {
      const a = await prisma.teachingAssignment.create({
        data: {
          teacherId: data.teacherId,
          classId: data.classId,
          subjectId: data.subjectId,
          academicYearId: data.academicYearId,
          semester: sem
        },
        include: { subject: true, class: true }
      })
      added.push({
        id: a.id,
        teacherId: a.teacherId,
        classId: a.classId,
        className: a.class.className,
        subjectId: a.subjectId,
        subjectName: a.subject.subjectName,
        academicYearId: a.academicYearId,
        semester: a.semester
      })
    }

    revalidatePath('/admin/teaching-assignments')
    return { success: true, added }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function deleteAssignment(id: string) {
  try {
    await prisma.teachingAssignment.delete({ where: { id } })
    revalidatePath('/admin/teaching-assignments')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
