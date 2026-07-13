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

  // Fetch all teachers to map homeroomTeacherId to name
  const teachers = await prisma.teacher.findMany({
    select: { userId: true, teacherName: true }
  })
  
  const teacherMap = {}
  teachers.forEach(t => {
    if (t.userId) {
      teacherMap[t.userId.trim()] = t.teacherName
    }
  })

  return classes.map(c => {
    let homeroomTeacher = ""
    if (c.homeroomTeacherId) {
      homeroomTeacher = c.homeroomTeacherId
        .split(",")
        .map(id => teacherMap[id.trim()])
        .filter(Boolean)
        .join(", ")
    }
    return {
      ...c,
      homeroomTeacher
    }
  })
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
      const studentCode = (data.studentCode || assessmentStudent.studentCode)?.trim().toUpperCase();
      if (!studentCode) {
        throw new Error("Mã học sinh không được để trống!");
      }
      const existing = await tx.student.findFirst({
        where: { studentCode }
      });
      if (existing) {
        throw new Error(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống học sinh chính thức!`);
      }

      // Create new student
      const newStudent = await tx.student.create({
        data: {
          studentCode: studentCode,
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
      const studentCode = (data.studentCode || candidate.studentCode)?.trim().toUpperCase();
      if (!studentCode) {
        throw new Error("Mã học sinh không được để trống!");
      }
      const existing = await tx.student.findUnique({
        where: { studentCode }
      });
      if (existing) {
        throw new Error(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống học sinh chính thức!`);
      }

      // 1. Create official student in Student table
      const newStudent = await tx.student.create({
        data: {
          studentCode: studentCode,
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

export async function importTransfersOutAction(records: any[], selectedYearId?: string) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    let imported = 0
    let skipped = 0
    const errors = []

    for (const r of records) {
      try {
        const studentCode = String(r.studentCode || r["Mã học sinh"] || "").trim().toUpperCase()
        if (!studentCode) {
          skipped++
          errors.push("Dòng trống hoặc thiếu Mã học sinh")
          continue
        }

        const student = await prisma.student.findFirst({
          where: { 
            studentCode, 
            status: "ACTIVE",
            ...(selectedYearId ? { academicYearId: selectedYearId } : {})
          }
        })

        if (!student) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} không tồn tại hoặc không ở trạng thái ACTIVE`)
          continue
        }

        const rawDate = r.transferDate || r["Ngày chuyển"]
        if (!rawDate) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} thiếu Ngày chuyển`)
          continue
        }

        let transferDate = null
        if (typeof rawDate === "number") {
          // Excel date number
          transferDate = new Date((rawDate - 25569) * 86400 * 1000)
        } else {
          // Parse string date dd/mm/yyyy or yyyy-mm-dd
          const str = String(rawDate).trim()
          if (str.includes("/")) {
            const parts = str.split("/")
            transferDate = new Date(parts[2], parts[1] - 1, parts[0])
          } else {
            transferDate = new Date(str)
          }
        }

        if (!transferDate || isNaN(transferDate.getTime())) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} có Ngày chuyển không hợp lệ: ${rawDate}`)
          continue
        }

        const rawSemester = String(r.semester || r["Kỳ học"] || "").trim().toUpperCase()
        let semester = null
        if (["HK1", "HỌC KỲ 1", "HỌC KY 1"].includes(rawSemester)) semester = "HK1"
        else if (["HK2", "HỌC KỲ 2", "HỌC KY 2"].includes(rawSemester)) semester = "HK2"
        else if (["SUMMER", "TRONG HÈ", "TRONG HE"].includes(rawSemester)) semester = "SUMMER"

        if (!semester) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} có Kỳ học không hợp lệ ("${rawSemester}"). Phải là HK1, HK2 hoặc SUMMER`)
          continue
        }

        const rawCategory = String(r.transferCategory || r["Diện chuyển"] || "").trim().toUpperCase()
        let transferCategory = ""
        if (["DOMESTIC", "CHUYỂN TRƯỜNG VN", "CHUYEN TRUONG VN"].includes(rawCategory)) transferCategory = "DOMESTIC"
        else if (["ABROAD", "DU HỌC", "DU HOC"].includes(rawCategory)) transferCategory = "ABROAD"
        else if (["RESERVE", "BẢO LƯU", "BAO LUU"].includes(rawCategory)) transferCategory = "RESERVE"

        if (!transferCategory) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} có Diện chuyển không hợp lệ ("${rawCategory}"). Phải là DOMESTIC, ABROAD hoặc RESERVE`)
          continue
        }

        const destination = String(r.destination || r["Nơi đến"] || "").trim()
        const reason = String(r.reason || r["Lý do"] || "").trim()

        let reserveStartDate = null
        let reserveEndDate = null
        if (transferCategory === "RESERVE") {
          const rawStart = r.reserveStartDate || r["Ngày bắt đầu bảo lưu"]
          const rawEnd = r.reserveEndDate || r["Ngày kết thúc bảo lưu"]
          
          if (rawStart) {
            if (typeof rawStart === "number") reserveStartDate = new Date((rawStart - 25569) * 86400 * 1000)
            else {
              const str = String(rawStart).trim()
              reserveStartDate = str.includes("/") ? new Date(str.split("/")[2], str.split("/")[1] - 1, str.split("/")[0]) : new Date(str)
            }
          }

          if (rawEnd) {
            if (typeof rawEnd === "number") reserveEndDate = new Date((rawEnd - 25569) * 86400 * 1000)
            else {
              const str = String(rawEnd).trim()
              reserveEndDate = str.includes("/") ? new Date(str.split("/")[2], str.split("/")[1] - 1, str.split("/")[0]) : new Date(str)
            }
          }
        }

        await prisma.$transaction(async (tx) => {
          const destSchool = String(r.destinationSchool || r["Trường chuyển đến"] || "").trim();
          const destType = String(r.destinationType || r["Loại hình"] || "").trim().toUpperCase();
          const destProv = String(r.destinationProvince || r["Tỉnh/TP"] || "").trim();
          const destCountry = String(r.destinationCountry || r["Quốc gia theo học"] || "").trim();

          await tx.studentTransfer.create({
            data: {
              studentId: student.id,
              type: "OUT",
              transferDate,
              semester,
              transferCategory,
              destinationSchool: transferCategory === "DOMESTIC" ? destSchool : null,
              destinationType: transferCategory === "DOMESTIC" ? (["TƯ THỤC", "TU THUC", "PRIVATE"].includes(destType) ? "PRIVATE" : ["CÔNG LẬP", "CONG LAP", "PUBLIC"].includes(destType) ? "PUBLIC" : "OTHER") : null,
              destinationProvince: transferCategory === "DOMESTIC" ? destProv : null,
              destinationCountry: transferCategory === "ABROAD" ? destCountry : null,
              reserveStartDate,
              reserveEndDate,
              reason: reason || null,
              createdById: userId,
            }
          })

          await tx.student.update({
            where: { id: student.id },
            data: { status: "TRANSFERRED_OUT" }
          })
        })

        imported++
      } catch (e: any) {
        skipped++
        errors.push(`Mã học sinh ${r.studentCode || ""}: ${e.message}`)
      }
    }

    revalidatePath("/admin/student-transfers")
    return { success: true, imported, skipped, errors }
  } catch (e: any) {
    return { success: false, error: e.message, imported: 0, skipped: 0, errors: [] }
  }
}
