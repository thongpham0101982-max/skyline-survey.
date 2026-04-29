"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createTransferOutAction(data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!data.studentId) return { success: false, error: "Thiếu thông tin Học sinh" }
    if (!data.transferDate) return { success: false, error: "Thiếu ngày chuyển" }
    if (!data.transferCategory) return { success: false, error: "Thiếu diện chuyển" }

    await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      await tx.studentTransfer.create({
        data: {
          studentId: data.studentId,
          type: "OUT",
          transferDate: new Date(data.transferDate),
          transferCategory: data.transferCategory,
          destinationSchool: data.destinationSchool || null,
          destinationType: data.destinationType || null,
          destinationProvince: data.destinationProvince || null,
          destinationCountry: data.destinationCountry || null,
          reason: data.reason || null,
          createdById: userId,
        }
      })

      // 2. Update student status so they no longer appear in active class lists
      await tx.student.update({
        where: { id: data.studentId },
        data: { status: "TRANSFERRED_OUT" }
      })
    })

    revalidatePath("/admin/student-transfers")
    if (data.classId) {
      revalidatePath(`/admin/classes/${data.classId}`)
    }
    
    return { success: true }
  } catch (e: any) {
    console.error("createTransferOutAction Error:", e)
    return { success: false, error: e.message }
  }
}

export async function getTransfersAction() {
  try {
    const transfers = await prisma.studentTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            class: { include: { campus: true } }
          }
        },
        createdBy: { select: { fullName: true } }
      }
    })
    return transfers
  } catch (e: any) {
    console.error(e)
    return []
  }
}

export async function getTransferFormOptionsAction() {
  try {
    const years = await prisma.academicYear.findMany({ orderBy: { code: 'asc' } })
    const campuses = await prisma.campus.findMany({ orderBy: { campusName: 'asc' } })
    
    return { years, campuses }
  } catch(e: any) {
    console.error(e)
    return { years: [], campuses: [] }
  }
}

export async function getClassesByCampusAndYearAction(campusId: string, academicYearId: string) {
  const classes = await prisma.class.findMany({
    where: { campusId, academicYearId },
    orderBy: { className: 'asc' }
  })
  return classes
}

export async function getStudentsByClassAction(classId: string) {
  const students = await prisma.student.findMany({
    where: { classId, status: "ACTIVE" },
    orderBy: { studentName: 'asc' }
  })
  return students
}
