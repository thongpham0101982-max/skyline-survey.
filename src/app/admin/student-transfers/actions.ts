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
    const years = await prisma.academicYear.findMany({ orderBy: { name: 'asc' } })
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

export async function createChangeClassAction(data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!data.studentId) return { success: false, error: "Thiếu thông tin Học sinh" }
    if (!data.transferDate) return { success: false, error: "Thiếu ngày chuyển" }
    if (!data.destCampusId) return { success: false, error: "Thiếu Cơ sở chuyển đến" }
    if (!data.destClassId) return { success: false, error: "Thiếu Lớp chuyển đến" }

    await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      
      // Fetch destination class name
      const destClass = await tx.class.findUnique({ where: { id: data.destClassId }, include: { campus: true } });
      const destName = destClass ? destClass.className + " (" + destClass.campus.campusName + ")" : data.destClassId;

      await tx.studentTransfer.create({
        data: {
          studentId: data.studentId,
          type: "CHANGE_CLASS",
          transferDate: new Date(data.transferDate),
          destinationSchool: destName, // Store human readable destination here
          reason: data.reason || null,
          createdById: userId,
        }
      })


      // 2. Update student class and campus
      await tx.student.update({
        where: { id: data.studentId },
        data: { 
          classId: data.destClassId,
          campusId: data.destCampusId,
          status: "ACTIVE"
        }
      })
    })

    revalidatePath("/admin/student-transfers")
    if (data.classId) {
      revalidatePath(`/admin/classes/${data.classId}`)
    }
    revalidatePath(`/admin/classes/${data.destClassId}`)
    
    return { success: true }
  } catch (e: any) {
    console.error("createChangeClassAction Error:", e)
    return { success: false, error: e.message }
  }
}
