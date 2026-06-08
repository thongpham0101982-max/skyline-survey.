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
    const students = await prisma.inputAssessmentStudent.findMany({
      orderBy: { fullName: "asc" },
      take: 200
    });
    return JSON.parse(JSON.stringify(students));
  } catch (error) {
    console.error("Action error:", error);
    return [];
  }
}

export async function getInputAssessmentPeriodsAction() {
  try {
    const periods = await prisma.inputAssessmentPeriod.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, academicYearId: true }
    });
    return periods;
  } catch (error) {
    console.error("Error fetching periods:", error);
    return [];
  }
}

export async function getInputAssessmentBatchesAction(periodId: string) {
  try {
    const batches = await prisma.inputAssessmentBatch.findMany({
      where: { periodId },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });
    return batches;
  } catch (error) {
    console.error("Error fetching batches:", error);
    return [];
  }
}

export async function getInputAssessmentStudentsByPeriodAction(periodId: string, batchId?: string) {
  try {
    const where = { periodId } as any;
    if (batchId && batchId !== "all") where.batchId = batchId;
    
    const students = await prisma.inputAssessmentStudent.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: { id: true, studentCode: true, fullName: true, dateOfBirth: true }
    });
    return JSON.parse(JSON.stringify(students));
  } catch (error) {
    console.error("Error fetching students by period:", error);
    return [];
  }
}

export async function getPreschoolInputAssessmentPeriodsAction() {
  try {
    const periods = await prisma.preschoolInputAssessmentPeriod.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, academicYearId: true }
    });
    return periods;
  } catch (error) {
    console.error("Error fetching preschool periods:", error);
    return [];
  }
}

export async function getPreschoolInputAssessmentBatchesAction(periodId: string) {
  try {
    const batches = await prisma.preschoolInputAssessmentBatch.findMany({
      where: { periodId },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    });
    return batches;
  } catch (error) {
    console.error("Error fetching preschool batches:", error);
    return [];
  }
}

export async function getPreschoolInputAssessmentStudentsByPeriodAction(periodId: string, batchId?: string) {
  try {
    const where = { periodId } as any;
    if (batchId && batchId !== "all") where.batchId = batchId;
    
    const students = await prisma.preschoolInputAssessmentStudent.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: { id: true, studentCode: true, fullName: true, dateOfBirth: true }
    });
    return JSON.parse(JSON.stringify(students));
  } catch (error) {
    console.error("Error fetching preschool students by period:", error);
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

    const isPreschool = !!data.isPreschool;
    let assessmentStudent;
    if (isPreschool) {
      assessmentStudent = await prisma.preschoolInputAssessmentStudent.findUnique({
        where: { id: data.assessmentStudentId }
      });
    } else {
      assessmentStudent = await prisma.inputAssessmentStudent.findUnique({
        where: { id: data.assessmentStudentId }
      });
    }

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
          gender: assessmentStudent.gender,
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

      // Update candidate enrollment info to COMPLETED
      if (isPreschool) {
        await tx.preschoolInputAssessmentStudent.update({
          where: { id: data.assessmentStudentId },
          data: {
            enrollmentStatus: "COMPLETED",
            enrollmentClassId: data.classId,
            enrollmentDate: new Date(data.transferDate),
            enrollmentCode: data.studentCode || assessmentStudent.studentCode
          }
        });
      } else {
        await tx.inputAssessmentStudent.update({
          where: { id: data.assessmentStudentId },
          data: {
            enrollmentStatus: "COMPLETED",
            enrollmentClassId: data.classId,
            enrollmentDate: new Date(data.transferDate),
            enrollmentCode: data.studentCode || assessmentStudent.studentCode
          }
        });
      }

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

export async function confirmEnrollmentAction(studentId: string, isPreschool: boolean) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    let student;
    if (isPreschool) {
      student = await prisma.preschoolInputAssessmentStudent.update({
        where: { id: studentId },
        data: { enrollmentStatus: "PENDING" },
        include: { period: true }
      });
    } else {
      student = await prisma.inputAssessmentStudent.update({
        where: { id: studentId },
        data: { enrollmentStatus: "PENDING" },
        include: { period: true }
      });
    }

    if (!student) return { success: false, error: "Không tìm thấy học sinh" }

    // Notify all GIÁO VỤ (Academic Staff) assigned to the student's campus
    const campusId = student.period?.campusId;
    let targetGiaoVuUsers = [];
    if (campusId) {
      targetGiaoVuUsers = await prisma.user.findMany({
        where: {
          role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] },
          campusAssignments: {
            some: { campusId }
          }
        }
      });
    }
    // Fallback: Notify all GIÁO VỤ if none found for campus
    if (targetGiaoVuUsers.length === 0) {
      targetGiaoVuUsers = await prisma.user.findMany({
        where: {
          role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] }
        }
      });
    }

    // Create notifications
    const title = "Yêu cầu xếp lớp mới";
    const message = `Học sinh ${student.fullName} (Mã KS: ${student.studentCode}) đạt kết quả tuyển sinh, đang chờ giáo vụ tổ chức nhập học và xếp lớp.`;
    const link = "/admin/student-transfers";

    for (const gv of targetGiaoVuUsers) {
      await prisma.notification.create({
        data: {
          userId: gv.id,
          title,
          message,
          link
        }
      });
    }

    revalidatePath("/admin/student-transfers")
    revalidatePath("/admin/student-info")
    return { success: true }
  } catch (e: any) {
    console.error("confirmEnrollmentAction Error:", e)
    return { success: false, error: e.message }
  }
}

export async function getPendingEnrollmentsAction() {
  try {
    const session = await auth()
    if (!session) return []

    const generalPending = await prisma.inputAssessmentStudent.findMany({
      where: { enrollmentStatus: "PENDING" },
      include: {
        period: {
          select: { id: true, name: true, campusId: true, campus: { select: { campusName: true } } }
        }
      }
    });

    const preschoolPending = await prisma.preschoolInputAssessmentStudent.findMany({
      where: { enrollmentStatus: "PENDING" },
      include: {
        period: {
          select: { id: true, name: true, campusId: true, campus: { select: { campusName: true } } }
        }
      }
    });

    return [
      ...generalPending.map((x: any) => ({
        id: x.id,
        studentCode: x.studentCode,
        fullName: x.fullName,
        dateOfBirth: x.dateOfBirth,
        gender: x.gender,
        grade: x.grade,
        createdAt: x.createdAt,
        admissionCampus: x.admissionCampus || x.period?.campus?.campusName || "",
        campusId: x.period?.campusId || "",
        isPreschool: false,
        period: x.period
      })),
      ...preschoolPending.map((x: any) => ({
        id: x.id,
        studentCode: x.studentCode,
        fullName: x.fullName,
        dateOfBirth: x.dateOfBirth,
        gender: x.gender,
        grade: x.grade,
        createdAt: x.createdAt,
        admissionCampus: x.admissionCampus || x.period?.campus?.campusName || "",
        campusId: x.period?.campusId || "",
        isPreschool: true,
        period: x.period
      }))
    ];
  } catch (e: any) {
    console.error("getPendingEnrollmentsAction Error:", e);
    return [];
  }
}

export async function completeEnrollmentAction(id: string, isPreschool: boolean, data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    if (!data.classId || !data.academicYearId || !data.campusId || !data.transferDate) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    let candidate;
    if (isPreschool) {
      candidate = await prisma.preschoolInputAssessmentStudent.findUnique({
        where: { id }
      });
    } else {
      candidate = await prisma.inputAssessmentStudent.findUnique({
        where: { id }
      });
    }

    if (!candidate) {
      return { success: false, error: "Không tìm thấy học sinh khảo sát" }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create official student in Student table
      const newStudent = await tx.student.create({
        data: {
          studentCode: data.studentCode || candidate.studentCode,
          studentName: data.studentName || candidate.fullName,
          dateOfBirth: candidate.dateOfBirth,
          gender: candidate.gender,
          classId: data.classId,
          campusId: data.campusId,
          academicYearId: data.academicYearId,
          status: "ACTIVE"
        }
      });

      // Fetch class info for recording
      const destClass = await tx.class.findUnique({
        where: { id: data.classId },
        include: { campus: true }
      });
      const destName = destClass ? destClass.className + " (" + destClass.campus.campusName + ")" : data.classId;

      // 2. Create studentTransfer record of type "IN"
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

      // 3. Update candidate enrollment info
      if (isPreschool) {
        await tx.preschoolInputAssessmentStudent.update({
          where: { id },
          data: {
            enrollmentStatus: "COMPLETED",
            enrollmentClassId: data.classId,
            enrollmentDate: new Date(data.transferDate),
            enrollmentCode: data.studentCode
          }
        });
      } else {
        await tx.inputAssessmentStudent.update({
          where: { id },
          data: {
            enrollmentStatus: "COMPLETED",
            enrollmentClassId: data.classId,
            enrollmentDate: new Date(data.transferDate),
            enrollmentCode: data.studentCode
          }
        });
      }

      return { success: true }
    });
  } catch (e: any) {
    console.error("completeEnrollmentAction Error:", e);
    return { success: false, error: e.message }
  }
}


