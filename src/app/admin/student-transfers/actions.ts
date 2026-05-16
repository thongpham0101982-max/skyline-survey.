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
          semester: data.semester || null,
          transferCategory: data.transferCategory,
          destinationSchool: data.destinationSchool || null,
          destinationType: data.destinationType || null,
          destinationProvince: data.destinationProvince || null,
          destinationCountry: data.destinationCountry || null,
          reserveStartDate: data.reserveStartDate ? new Date(data.reserveStartDate) : null,
          reserveEndDate: data.reserveEndDate ? new Date(data.reserveEndDate) : null,
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
          semester: data.semester || null,
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
export async function getInputAssessmentStudentsAction() {
  try {
    // Only return students that are not already in the Student table (checking by studentCode)
    const existingStudentCodes = (await prisma.student.findMany({ select: { studentCode: true } })).map(s => s.studentCode);
    
    const students = await prisma.inputAssessmentStudent.findMany({
      where: {
        studentCode: {
          notIn: existingStudentCodes
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return students;
  } catch (error) {
    console.error("Error fetching assessment students:", error);
    return [];
  }
}

export async function createTransferInAction(data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!data.assessmentStudentId || !data.classId || !data.academicYearId || !data.campusId || !data.transferDate) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    const assessmentStudent = await prisma.inputAssessmentStudent.findUnique({
      where: { id: data.assessmentStudentId }
    });

    if (!assessmentStudent) {
      return { success: false, error: "Không tìm thấy học sinh KSĐV" }
    }

    return await prisma.$transaction(async (tx) => {
      // Create new student
      const newStudent = await tx.student.create({
        data: {
          studentCode: data.studentCode || assessmentStudent.studentCode,
          studentName: data.studentName || assessmentStudent.fullName,
          dateOfBirth: assessmentStudent.dateOfBirth,
          classId: data.classId,
          campusId: data.campusId,
          academicYearId: data.academicYearId,
          status: "ACTIVE"
        }
      });

      // Fetch class info for recording
      const destClass = await tx.class.findUnique({ where: { id: data.classId }, include: { campus: true } });
      const destName = destClass ? destClass.className + " (" + destClass.campus.campusName + ")" : data.classId;

      // Create transfer record
      await tx.studentTransfer.create({
        data: {
          studentId: newStudent.id,
          type: "IN",
          transferDate: new Date(data.transferDate),
          semester: data.semester || null,
          destinationSchool: destName,
          reason: data.reason || null,
          createdById: userId,
        }
      });

      return { success: true }
    })
  } catch (error: any) {
    console.error("Error creating transfer in:", error)
    return { success: false, error: error.message }
  }
}

export async function updateTransferInAction(id: string, data: any) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.studentTransfer.findUnique({
        where: { id },
        include: { student: true }
      })
      if (!transfer) throw new Error("Không tìm thấy phiếu")

      // Update transfer record
      await tx.studentTransfer.update({
        where: { id },
        data: {
          transferDate: new Date(data.transferDate),
          semester: data.semester || null,
          reason: data.reason || null,
        }
      })

      // Update student record
      if (transfer.student) {
        await tx.student.update({
          where: { id: transfer.studentId },
          data: {
            studentCode: data.studentCode,
            studentName: data.studentName,
            classId: data.classId,
            campusId: data.campusId,
            academicYearId: data.academicYearId,
          }
        })
      }
    })

    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating transfer in:", error)
    return { success: false, error: error.message }
  }
}
