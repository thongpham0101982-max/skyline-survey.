"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { normalizePersonName } from "@/lib/nameNormalizer"
import { resolveVnEduCodeMap } from "@/lib/grading/vnedu-code-resolver"

async function validateAndSyncVnEduCodeInTx(
  tx: any,
  academicYearId: string,
  studentCode: string,
  vnEduCode?: string | null,
  excludeStudentId?: string
): Promise<string | null> {
  const sCode = String(studentCode || "").trim().toUpperCase();
  const markCode = vnEduCode !== undefined && vnEduCode !== null ? String(vnEduCode).trim().toUpperCase() : "";

  if (!markCode) {
    if (sCode && academicYearId) {
      await tx.studentCodeMapping.deleteMany({
        where: {
          academicYearId,
          databaseCode: sCode,
        },
      });
    }
    return null;
  }

  // Kiểm tra ràng buộc 1-1 xuyên suốt trong StudentCodeMapping
  const existingMapping = await tx.studentCodeMapping.findFirst({
    where: {
      markFileCode: markCode,
      databaseCode: { not: sCode },
    },
  });
  if (existingMapping) {
    const otherStudent = await tx.student.findFirst({
      where: { studentCode: existingMapping.databaseCode },
      select: { studentName: true, studentCode: true },
    });
    const otherName = otherStudent
      ? `${otherStudent.studentName} (${otherStudent.studentCode})`
      : existingMapping.databaseCode;
    throw new Error(
      `Mã VNEdu '${markCode}' đã được gán cho học sinh ${otherName}! Mỗi học sinh chỉ có 1 Mã VNEdu duy nhất.`
    );
  }

  // Kiểm tra trùng trên bảng Student cùng năm học
  const existingStudent = await tx.student.findFirst({
    where: {
      vnEduCode: markCode,
      academicYearId,
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
    select: { studentName: true, studentCode: true },
  });
  if (existingStudent) {
    throw new Error(
      `Mã VNEdu '${markCode}' đã được gán cho học sinh ${existingStudent.studentName} (${existingStudent.studentCode}) trong năm học này!`
    );
  }

  // Upsert mapping cho năm học hiện tại
  await tx.studentCodeMapping.upsert({
    where: {
      academicYearId_databaseCode: {
        academicYearId,
        databaseCode: sCode,
      },
    },
    update: { markFileCode: markCode },
    create: {
      academicYearId,
      databaseCode: sCode,
      markFileCode: markCode,
    },
  });

  // Đồng bộ xuyên suốt cho các năm học khác (nếu đã có mapping)
  const otherYearMappings = await tx.studentCodeMapping.findMany({
    where: {
      databaseCode: sCode,
      academicYearId: { not: academicYearId },
    },
  });
  for (const otherMap of otherYearMappings) {
    await tx.studentCodeMapping.update({
      where: { id: otherMap.id },
      data: { markFileCode: markCode },
    });
  }

  return markCode;
}

export async function createTransferOutAction(data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    const studentIds = Array.isArray(data.studentIds) ? data.studentIds : [data.studentId].filter(Boolean);
    if (studentIds.length === 0) return { success: false, error: "Thiếu thông tin Học sinh" }
    if (!data.transferDate) return { success: false, error: "Thiếu ngày chuyển" }
    if (!data.transferCategory) return { success: false, error: "Thiếu diện chuyển" }

    await prisma.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        // 1. Create transfer record
        await tx.studentTransfer.create({
          data: {
            studentId,
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
          where: { id: studentId },
          data: { status: "TRANSFERRED_OUT" }
        })
      }
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

export async function updateTransferOutAction(id: string, data: any) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    if (!data.transferDate) return { success: false, error: "Thiếu ngày chuyển" }
    if (!data.transferCategory) return { success: false, error: "Thiếu diện chuyển" }

    await prisma.studentTransfer.update({
      where: { id },
      data: {
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
      }
    })

    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("updateTransferOutAction Error:", e)
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
            class: { include: { campus: true, academicYear: true } },
            academicYear: true
          }
        },
        createdBy: { select: { fullName: true } }
      }
    })

    // Đồng bộ tra cứu Mã VNEdu từ StudentCodeMapping xuyên suốt các năm học (ưu tiên năm học của học sinh)
    const codesByYear = new Map<string, Set<string>>();
    for (const t of transfers) {
      const sCode = t.student?.studentCode?.trim();
      if (!sCode) continue;
      const yId = t.student?.academicYearId || t.student?.class?.academicYearId || "";
      if (!codesByYear.has(yId)) codesByYear.set(yId, new Set());
      codesByYear.get(yId)!.add(sCode);
    }

    const vnEduMapsByYear = new Map<string, Map<string, string>>();
    await Promise.all(
      Array.from(codesByYear.entries()).map(async ([yId, codeSet]) => {
        const map = await resolveVnEduCodeMap(Array.from(codeSet), yId || undefined);
        vnEduMapsByYear.set(yId, map);
      })
    );

    return transfers.map(t => {
      if (!t.student) return t;
      const yId = t.student.academicYearId || t.student.class?.academicYearId || "";
      const sCode = t.student.studentCode?.trim() || "";
      const yearMap = vnEduMapsByYear.get(yId);
      const mappedVnEdu = yearMap?.get(sCode) || yearMap?.get(sCode.toUpperCase()) || null;
      return {
        ...t,
        student: {
          ...t.student,
          vnEduCode: mappedVnEdu || t.student.vnEduCode || null,
        }
      };
    });
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
    select: { id: true, teacherName: true }
  })
  
  const teacherMap = {}
  teachers.forEach(t => {
    if (t.id) {
      teacherMap[t.id.trim()] = t.teacherName
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

    if (!data.classId || !data.academicYearId || !data.campusId || !data.transferDate) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    const isPreschool = !!data.isPreschool;
    let assessmentStudent: any = null;
    if (data.assessmentStudentId) {
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
    } else if (!data.studentName?.trim() || !data.studentCode?.trim()) {
      return { success: false, error: "Vui lòng nhập đầy đủ Họ và tên và Mã học sinh!" }
    }

    const res = await prisma.$transaction(async (tx) => {
      const studentCode = (data.studentCode || assessmentStudent?.studentCode)?.trim().toUpperCase();
      if (!studentCode) {
        throw new Error("Mã học sinh không được để trống!");
      }
      const existing = await tx.student.findFirst({
        where: { studentCode, academicYearId: data.academicYearId }
      });
      if (existing) {
        throw new Error(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống học sinh chính thức!`);
      }

      // Kiểm tra và đồng bộ Mã VNEdu (nếu có)
      const resolvedVnEduCode = await validateAndSyncVnEduCodeInTx(
        tx,
        data.academicYearId,
        studentCode,
        data.vnEduCode
      );

      // Determine studentType based on admissionResult (Đạt - Giao lưu -> GIAO_LUU, còn lại -> CHINH_KHOA)
      const admResult1 = (assessmentStudent?.admissionResult || "").toLowerCase();
      const dirNote1 = (assessmentStudent?.directorNote || "").toLowerCase();
      const isGiaoLuu1 = admResult1.includes("giao lưu") || 
                         admResult1.includes("giao luu") ||
                         dirNote1.includes("học giao lưu") ||
                         dirNote1.includes("học giao luu");

      // Create new student
      const newStudent = await tx.student.create({
        data: {
          studentCode: studentCode,
          vnEduCode: resolvedVnEduCode,
          studentName: normalizePersonName(data.studentName || assessmentStudent?.fullName || ""),
          dateOfBirth: assessmentStudent?.dateOfBirth || null,
          gender: assessmentStudent?.gender || null,
          classId: data.classId,
          campusId: data.campusId,
          academicYearId: data.academicYearId,
          status: "ACTIVE",
          studentType: isGiaoLuu1 ? "GIAO_LUU" : "CHINH_KHOA",
          studentTypeNote: isGiaoLuu1 ? "Học giao lưu theo kết quả khảo sát đầu vào" : null
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

      // Update candidate enrollment info to COMPLETED (nếu liên kết từ KSĐV)
      if (data.assessmentStudentId && assessmentStudent) {
        if (isPreschool) {
          await tx.preschoolInputAssessmentStudent.update({
            where: { id: data.assessmentStudentId },
            data: {
              enrollmentStatus: "COMPLETED",
              enrollmentClassId: data.classId,
              enrollmentDate: new Date(data.transferDate),
              enrollmentCode: studentCode
            }
          });
        } else {
          await tx.inputAssessmentStudent.update({
            where: { id: data.assessmentStudentId },
            data: {
              enrollmentStatus: "COMPLETED",
              enrollmentClassId: data.classId,
              enrollmentDate: new Date(data.transferDate),
              enrollmentCode: studentCode
            }
          });
        }
      }

      // Send notification to GVCN if requested
      if (data.notifyGVCN) {
        await notifyGVCNOfNewStudent(tx, newStudent, data.classId);
      }

      return { success: true }
    })

    revalidatePath("/admin/student-transfers")
    if (data.classId) revalidatePath(`/admin/classes/${data.classId}`)
    return res
  } catch (error: any) {
    console.error("Error creating transfer in:", error)
    return { success: false, error: error.message }
  }
}

export async function updateTransferInAction(id: string, data: any) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    let oldClassId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.studentTransfer.findUnique({
        where: { id },
        include: { student: true }
      })
      if (!transfer) throw new Error("Không tìm thấy phiếu")
      oldClassId = transfer.student?.classId || null;

      // Fetch destination class info for recording
      const destClass = data.classId
        ? await tx.class.findUnique({ where: { id: data.classId }, include: { campus: true } })
        : null;
      const destName = destClass ? destClass.className + " (" + destClass.campus.campusName + ")" : undefined;

      // Update transfer record
      await tx.studentTransfer.update({
        where: { id },
        data: {
          transferDate: new Date(data.transferDate),
          semester: data.semester || null,
          ...(destName ? { destinationSchool: destName } : {}),
          reason: data.reason || null,
        }
      })

      // Update student record
      if (transfer.student) {
        const normalizedCode = (data.studentCode || transfer.student.studentCode)?.trim().toUpperCase();
        const targetAcademicYearId = data.academicYearId || transfer.student.academicYearId;

        const studentUpdateData: any = {
          studentCode: normalizedCode,
          studentName: normalizePersonName(data.studentName || transfer.student.studentName),
          classId: data.classId,
          campusId: data.campusId,
          academicYearId: targetAcademicYearId,
        };

        if (data.vnEduCode !== undefined) {
          const resolvedVnEduCode = await validateAndSyncVnEduCodeInTx(
            tx,
            targetAcademicYearId,
            normalizedCode,
            data.vnEduCode,
            transfer.studentId
          );
          studentUpdateData.vnEduCode = resolvedVnEduCode;
        }

        await tx.student.update({
          where: { id: transfer.studentId },
          data: studentUpdateData
        })

        // Send notification to GVCN if requested
        if (data.notifyGVCN) {
          await notifyGVCNOfNewStudent(tx, { studentName: studentUpdateData.studentName, studentCode: normalizedCode }, data.classId);
        }
      }
    })

    revalidatePath("/admin/student-transfers")
    if (data.classId) revalidatePath(`/admin/classes/${data.classId}`)
    if (oldClassId && oldClassId !== data.classId) revalidatePath(`/admin/classes/${oldClassId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Error updating transfer in:", error)
    return { success: false, error: error.message }
  }
}

function isTransferAssessmentStudent(s: any): boolean {
  if (!s) return false;
  const periodName = (s.period?.name || "").toLowerCase();
  const criteria = (s.admissionCriteria || "").toLowerCase();
  const target = (s.targetType || "").toLowerCase();
  const batchName = (s.batch?.name || "").toLowerCase();
  return (
    periodName.includes("chuyển hệ") ||
    periodName.includes("chuyen he") ||
    criteria.includes("chuyển hệ") ||
    criteria.includes("chuyen he") ||
    target.includes("chuyển hệ") ||
    target.includes("chuyen he") ||
    batchName.includes("chuyen_he") ||
    batchName.includes("chuyển hệ") ||
    Boolean(s.className && s.surveySystem && s.surveyFormType && s.surveySystem !== s.surveyFormType)
  );
}

export async function confirmEnrollmentAction(studentId: string, isPreschool: boolean) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    let student: any;
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
        include: { period: true, batch: { select: { name: true } } }
      });
    }

    if (!student) return { success: false, error: "Không tìm thấy học sinh" }

    const isTransfer = !isPreschool && isTransferAssessmentStudent(student);

    // Notify all GIÁO VỤ (Academic Staff) assigned to the student's campus
    const campusId = student.period?.campusId;
    let targetGiaoVuUsers: any[] = [];
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
    const title = isTransfer ? "Yêu cầu chuyển lớp mới" : "Yêu cầu xếp lớp mới";
    const message = isTransfer
      ? `Học sinh ${student.fullName} (Mã HS: ${student.studentCode}) đạt kết quả khảo sát chuyển hệ, đang chờ giáo vụ tiến hành chuyển lớp học.`
      : `Học sinh ${student.fullName} (Mã KS: ${student.studentCode}) đạt kết quả tuyển sinh, đang chờ giáo vụ tổ chức nhập học và xếp lớp.`;
    const link = isTransfer ? "/admin/student-transfers?tab=CHANGE_CLASS&subTab=general" : "/admin/student-transfers";

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
    revalidatePath("/admin/ket-qua-khao-sat")
    return { success: true, isTransfer }
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
          select: { id: true, name: true, academicYearId: true, campusId: true, campus: { select: { campusName: true } } }
        },
        batch: {
          select: { name: true }
        }
      }
    });

    const preschoolPending = await prisma.preschoolInputAssessmentStudent.findMany({
      where: { enrollmentStatus: "PENDING" },
      include: {
        period: {
          select: { id: true, name: true, academicYearId: true, campusId: true, campus: { select: { campusName: true } } }
        }
      }
    });

    // Lookup existing official Student records for transfer-system pending students
    const transferCodes = Array.from(
      new Set(
        generalPending
          .filter((x: any) => isTransferAssessmentStudent(x) && x.studentCode)
          .map((x: any) => String(x.studentCode).trim().toUpperCase())
      )
    );
    const officialStudentsByCode = new Map<string, any[]>();
    if (transferCodes.length > 0) {
      const existingStudents = await prisma.student.findMany({
        where: {
          studentCode: { in: transferCodes },
          status: "ACTIVE"
        },
        include: {
          class: {
            select: {
              id: true,
              className: true,
              campusId: true,
              campus: { select: { campusName: true } }
            }
          }
        },
        orderBy: { id: "desc" }
      });
      for (const st of existingStudents) {
        const key = String(st.studentCode).trim().toUpperCase();
        if (!officialStudentsByCode.has(key)) officialStudentsByCode.set(key, []);
        officialStudentsByCode.get(key)!.push(st);
      }
    }

    return [
      ...generalPending.map((x: any) => {
        const isGL = (x.admissionResult || "").toLowerCase().includes("giao lưu") ||
                     (x.admissionResult || "").toLowerCase().includes("giao luu") ||
                     (x.directorNote || "").toLowerCase().includes("học giao lưu") ||
                     (x.directorNote || "").toLowerCase().includes("học giao luu");
        const isTransferSystem = isTransferAssessmentStudent(x);
        const codeKey = String(x.studentCode || "").trim().toUpperCase();
        const yearId = x.period?.academicYearId || "";
        const matchedList = isTransferSystem ? (officialStudentsByCode.get(codeKey) || []) : [];
        const matchedStudent =
          matchedList.find((st) => st.academicYearId === yearId) ||
          matchedList[0] ||
          null;

        return {
          id: x.id,
          studentCode: x.studentCode,
          fullName: x.fullName,
          dateOfBirth: x.dateOfBirth,
          gender: x.gender,
          grade: x.grade,
          createdAt: x.createdAt,
          admissionCampus: x.admissionCampus || x.period?.campus?.campusName || "",
          campusId: x.period?.campusId || "",
          academicYearId: x.period?.academicYearId || x.academicYearId || "",
          isPreschool: false,
          isTransferSystem,
          surveySystem: x.surveySystem || "",
          surveyFormType: x.surveyFormType || "",
          existingStudentId: matchedStudent?.id || "",
          currentClassId: matchedStudent?.classId || "",
          currentCampusId: matchedStudent?.campusId || matchedStudent?.class?.campusId || "",
          currentClassName: matchedStudent?.class?.className || x.className || "",
          currentCampusName: matchedStudent?.class?.campus?.campusName || "",
          period: x.period,
          admissionResult: x.admissionResult,
          directorNote: x.directorNote,
          isGiaoLuu: isGL
        };
      }),
      ...preschoolPending.map((x: any) => {
        const isGL = (x.admissionResult || "").toLowerCase().includes("giao lưu") ||
                     (x.admissionResult || "").toLowerCase().includes("giao luu") ||
                     (x.directorNote || "").toLowerCase().includes("học giao lưu") ||
                     (x.directorNote || "").toLowerCase().includes("học giao luu");
        return {
          id: x.id,
          studentCode: x.studentCode,
          fullName: x.fullName,
          dateOfBirth: x.dateOfBirth,
          gender: x.gender,
          grade: x.grade,
          createdAt: x.createdAt,
          admissionCampus: x.admissionCampus || x.period?.campus?.campusName || "",
          campusId: x.period?.campusId || "",
          academicYearId: x.period?.academicYearId || x.academicYearId || "",
          isPreschool: true,
          isTransferSystem: false,
          period: x.period,
          admissionResult: x.admissionResult,
          directorNote: x.directorNote,
          isGiaoLuu: isGL
        };
      })
    ];
  } catch (e: any) {
    console.error("getPendingEnrollmentsAction Error:", e);
    return [];
  }
}

export async function completeChangeClassRequestAction(assessmentStudentId: string, data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    if (!data.destCampusId) return { success: false, error: "Thiếu Cơ sở chuyển đến" }
    if (!data.destClassId) return { success: false, error: "Thiếu Lớp chuyển đến" }
    if (!data.transferDate) return { success: false, error: "Thiếu ngày chuyển lớp" }

    const candidate = await prisma.inputAssessmentStudent.findUnique({
      where: { id: assessmentStudentId },
      include: { period: true, batch: true }
    });
    if (!candidate) {
      return { success: false, error: "Không tìm thấy hồ sơ học sinh khảo sát chuyển hệ" }
    }

    let previousClassId: string | null = null;

    await prisma.$transaction(async (tx) => {
      let officialStudent = data.studentId
        ? await tx.student.findUnique({ where: { id: data.studentId } })
        : null;

      if (!officialStudent && candidate.studentCode) {
        const code = candidate.studentCode.trim().toUpperCase();
        const targetYearId = data.academicYearId || candidate.period?.academicYearId;
        if (targetYearId) {
          officialStudent = await tx.student.findFirst({
            where: { studentCode: code, academicYearId: targetYearId }
          });
        }
        if (!officialStudent) {
          officialStudent = await tx.student.findFirst({
            where: { studentCode: code, status: "ACTIVE" },
            orderBy: { id: "desc" }
          });
        }
      }

      if (!officialStudent) {
        throw new Error(
          `Không tìm thấy học sinh chính thức (Mã HS: ${candidate.studentCode}) để thực hiện chuyển lớp. Vui lòng chọn đúng học sinh hiện tại.`
        );
      }

      previousClassId = officialStudent.classId;

      const destClass = await tx.class.findUnique({
        where: { id: data.destClassId },
        include: { campus: true }
      });
      const destName = destClass ? `${destClass.className} (${destClass.campus.campusName})` : data.destClassId;

      // 1. Create CHANGE_CLASS transfer record
      await tx.studentTransfer.create({
        data: {
          studentId: officialStudent.id,
          type: "CHANGE_CLASS",
          transferDate: new Date(data.transferDate),
          semester: data.semester || null,
          destinationSchool: destName,
          reason: data.reason || "Chuyển lớp theo kết quả khảo sát chuyển hệ",
          createdById: userId,
        }
      });

      // 2. Update official Student class & campus
      const updatedStudent = await tx.student.update({
        where: { id: officialStudent.id },
        data: {
          classId: data.destClassId,
          campusId: data.destCampusId,
          status: "ACTIVE"
        }
      });

      // 3. Mark assessment student as COMPLETED with new class
      await tx.inputAssessmentStudent.update({
        where: { id: assessmentStudentId },
        data: {
          enrollmentStatus: "COMPLETED",
          enrollmentClassId: data.destClassId,
          enrollmentDate: new Date(data.transferDate),
          enrollmentCode: officialStudent.studentCode
        }
      });

      // 4. Optional notification to new GVCN
      if (data.notifyGVCN) {
        await notifyGVCNOfNewStudent(tx, updatedStudent, data.destClassId);
      }
    });

    revalidatePath("/admin/student-transfers")
    revalidatePath("/admin/student-info")
    revalidatePath("/admin/ket-qua-khao-sat")
    if (previousClassId) revalidatePath(`/admin/classes/${previousClassId}`)
    if (data.destClassId) revalidatePath(`/admin/classes/${data.destClassId}`)
    return { success: true }
  } catch (e: any) {
    console.error("completeChangeClassRequestAction Error:", e)
    return { success: false, error: e.message }
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

    const res = await prisma.$transaction(async (tx) => {
      const studentCode = (data.studentCode || candidate.studentCode)?.trim().toUpperCase();
      if (!studentCode) {
        throw new Error("Mã học sinh không được để trống!");
      }
      const existing = await tx.student.findFirst({
        where: { 
          studentCode,
          academicYearId: data.academicYearId
        }
      });
      if (existing) {
        throw new Error(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống học sinh chính thức!`);
      }

      // Kiểm tra và đồng bộ Mã VNEdu (nếu có)
      const resolvedVnEduCode = await validateAndSyncVnEduCodeInTx(
        tx,
        data.academicYearId,
        studentCode,
        data.vnEduCode
      );

      // Determine studentType based on admissionResult (Đạt - Giao lưu -> GIAO_LUU, còn lại -> CHINH_KHOA)
      const admResult2 = (candidate.admissionResult || "").toLowerCase();
      const dirNote2 = (candidate.directorNote || "").toLowerCase();
      const isGiaoLuu2 = admResult2.includes("giao lưu") || 
                         admResult2.includes("giao luu") ||
                         dirNote2.includes("học giao lưu") ||
                         dirNote2.includes("học giao luu");

      // 1. Create official student in Student table
      const newStudent = await tx.student.create({
        data: {
          studentCode: studentCode,
          vnEduCode: resolvedVnEduCode,
          studentName: normalizePersonName(data.studentName || candidate.fullName),
          dateOfBirth: candidate.dateOfBirth,
          gender: candidate.gender,
          classId: data.classId,
          campusId: data.campusId,
          academicYearId: data.academicYearId,
          status: "ACTIVE",
          studentType: isGiaoLuu2 ? "GIAO_LUU" : "CHINH_KHOA",
          studentTypeNote: isGiaoLuu2 ? "Học giao lưu theo kết quả khảo sát đầu vào" : null
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
            enrollmentCode: studentCode
          }
        });
      } else {
        await tx.inputAssessmentStudent.update({
          where: { id },
          data: {
            enrollmentStatus: "COMPLETED",
            enrollmentClassId: data.classId,
            enrollmentDate: new Date(data.transferDate),
            enrollmentCode: studentCode
          }
        });
      }

      // 4. Send notification to GVCN if requested
      if (data.notifyGVCN) {
        await notifyGVCNOfNewStudent(tx, newStudent, data.classId);
      }

      return { success: true }
    });

    revalidatePath("/admin/student-transfers")
    if (data.classId) revalidatePath(`/admin/classes/${data.classId}`)
    return res
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
        else if (["GRADUATED", "TỐT NGHIỆP THPT", "TOT NGHIEP THPT", "TỐT NGHIỆP", "TOT NGHIEP", "TN"].includes(rawCategory)) transferCategory = "GRADUATED"

        if (!transferCategory) {
          skipped++
          errors.push(`Học sinh mã ${studentCode} có Diện chuyển không hợp lệ ("${rawCategory}"). Phải là DOMESTIC, ABROAD, RESERVE hoặc GRADUATED`)
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
              reserveStartDate = str.includes("/") ? new Date(Number(str.split("/")[2]), Number(str.split("/")[1]) - 1, Number(str.split("/")[0])) : new Date(str)
            }
          }

          if (rawEnd) {
            if (typeof rawEnd === "number") reserveEndDate = new Date((rawEnd - 25569) * 86400 * 1000)
            else {
              const str = String(rawEnd).trim()
              reserveEndDate = str.includes("/") ? new Date(Number(str.split("/")[2]), Number(str.split("/")[1]) - 1, Number(str.split("/")[0])) : new Date(str)
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

export async function revertTransferAction(transferId: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.studentTransfer.findUnique({
        where: { id: transferId }
      })
      if (!transfer) throw new Error("Không tìm thấy phiếu chuyển")

      // Revert student status to ACTIVE
      await tx.student.update({
        where: { id: transfer.studentId },
        data: { status: "ACTIVE" }
      })

      // Delete the transfer record
      await tx.studentTransfer.delete({
        where: { id: transferId }
      })
    })

    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("revertTransferAction Error:", e)
    return { success: false, error: e.message }
  }
}

async function notifyGVCNOfNewStudent(tx: any, student: any, classId: string) {
  try {
    const destClass = await tx.class.findUnique({
      where: { id: classId }
    });
    if (destClass && destClass.homeroomTeacherId) {
      const teacherIds = destClass.homeroomTeacherId.split(',').map((id: string) => id.trim()).filter(Boolean);
      const teachers = await tx.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: { userId: true }
      });
      
      const title = "Học sinh mới nhập học";
      const message = `Học sinh ${student.studentName} (Mã HS: ${student.studentCode}) đã được xếp vào lớp ${destClass.className} của bạn.`;
      const link = "/teacher/ho-so-hoc-sinh";
      
      for (const t of teachers) {
        if (t.userId) {
          await tx.notification.create({
            data: {
              userId: t.userId,
              title,
              message,
              link
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Error sending notification to GVCN:", err);
  }
}

export async function completeBatchEnrollmentAction(ids: string[], isPreschool: boolean, data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    if (!data.classId || !data.academicYearId || !data.campusId || !data.transferDate) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    const results = []
    const errors = []

    for (const id of ids) {
      let candidate;
      if (isPreschool) {
        candidate = await prisma.preschoolInputAssessmentStudent.findUnique({
          where: { id },
          include: { period: true }
        });
      } else {
        candidate = await prisma.inputAssessmentStudent.findUnique({
          where: { id },
          include: { period: true }
        });
      }

      if (!candidate) {
        errors.push(`Không tìm thấy học sinh khảo sát với ID: ${id}`);
        continue;
      }

      try {
        const res = await prisma.$transaction(async (tx) => {
          const studentCode = candidate.studentCode?.trim().toUpperCase();
          if (!studentCode) {
            throw new Error("Mã học sinh của ứng viên không được để trống!");
          }
          const existing = await tx.student.findFirst({
            where: { 
              studentCode,
              academicYearId: data.academicYearId
            }
          });
          if (existing) {
            throw new Error(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống học sinh chính thức cho năm học này!`);
          }

          // Determine studentType based on admissionResult (Đạt - Giao lưu -> GIAO_LUU, còn lại -> CHINH_KHOA)
          const admResult3 = (candidate.admissionResult || "").toLowerCase();
          const dirNote3 = (candidate.directorNote || "").toLowerCase();
          const isGiaoLuu3 = admResult3.includes("giao lưu") || 
                             admResult3.includes("giao luu") ||
                             dirNote3.includes("học giao lưu") ||
                             dirNote3.includes("học giao luu");

          // 1. Create official student in Student table
          const newStudent = await tx.student.create({
            data: {
              studentCode: studentCode,
              studentName: normalizePersonName(candidate.fullName),
              dateOfBirth: candidate.dateOfBirth,
              gender: candidate.gender,
              classId: data.classId,
              campusId: data.campusId,
              academicYearId: data.academicYearId,
              status: "ACTIVE",
              studentType: isGiaoLuu3 ? "GIAO_LUU" : "CHINH_KHOA",
              studentTypeNote: isGiaoLuu3 ? "Học giao lưu theo kết quả khảo sát đầu vào" : null
            }
          });

          // Fetch class info for recording
          const destClass = await tx.class.findUnique({
            where: { id: data.classId },
            include: { campus: true }
          });
          const destName = destClass ? destClass.className + " (" + destClass.campus.campusName + ")" : data.classId;

          // 2. Create student transfer log
          await tx.studentTransfer.create({
            data: {
              studentId: newStudent.id,
              type: "IN",
              transferDate: new Date(data.transferDate),
              semester: data.semester || "HK1",
              originSchool: "Khảo sát đầu vào: " + (candidate.period?.name || ""),
              destinationSchool: destName,
              reason: data.reason || "Tổ chức nhập học từ kết quả khảo sát",
              status: "COMPLETED",
              createdById: userId
            }
          });

          // 3. Update candidate's enrollment status to COMPLETED
          if (isPreschool) {
            await tx.preschoolInputAssessmentStudent.update({
              where: { id },
              data: { enrollmentStatus: "COMPLETED" }
            });
          } else {
            await tx.inputAssessmentStudent.update({
              where: { id },
              data: { enrollmentStatus: "COMPLETED" }
            });
          }

          // 4. Send notification to GVCN if requested
          if (data.notifyGVCN) {
            await notifyGVCNOfNewStudent(tx, newStudent, data.classId);
          }

          return newStudent;
        });
        results.push(res);
      } catch (err: any) {
        errors.push(`Học sinh ${candidate.fullName}: ${err.message}`);
      }
    }

    revalidatePath("/admin/student-transfers")
    revalidatePath("/admin/student-info")

    if (errors.length > 0 && results.length === 0) {
      return { success: false, error: errors.join("\n") }
    }
    return { success: true, count: results.length, errors: errors.length > 0 ? errors : null }
  } catch (e: any) {
    console.error("completeBatchEnrollmentAction Error:", e);
    return { success: false, error: e.message }
  }
}

export async function updateBatchTransferOutAction(ids: string[], fields: any) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    if (!ids || ids.length === 0) return { success: false, error: "Không tìm thấy danh sách cần cập nhật" }

    const updateData: any = {}
    
    if (fields.transferDate !== undefined) updateData.transferDate = new Date(fields.transferDate)
    if (fields.semester !== undefined) updateData.semester = fields.semester || null
    if (fields.transferCategory !== undefined) updateData.transferCategory = fields.transferCategory
    if (fields.destinationSchool !== undefined) updateData.destinationSchool = fields.destinationSchool || null
    if (fields.destinationType !== undefined) updateData.destinationType = fields.destinationType || null
    if (fields.destinationProvince !== undefined) updateData.destinationProvince = fields.destinationProvince || null
    if (fields.destinationCountry !== undefined) updateData.destinationCountry = fields.destinationCountry || null
    if (fields.reserveStartDate !== undefined) updateData.reserveStartDate = fields.reserveStartDate ? new Date(fields.reserveStartDate) : null
    if (fields.reserveEndDate !== undefined) updateData.reserveEndDate = fields.reserveEndDate ? new Date(fields.reserveEndDate) : null
    if (fields.reason !== undefined) updateData.reason = fields.reason || null

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "Không có trường nào được chọn để cập nhật" }
    }

    await prisma.studentTransfer.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    })

    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("updateBatchTransferOutAction Error:", e)
    return { success: false, error: e.message }
  }
}

export async function revertEnrollmentAction(studentId: string, isPreschool: boolean) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    if (isPreschool) {
      await prisma.preschoolInputAssessmentStudent.update({
        where: { id: studentId },
        data: { enrollmentStatus: null }
      });
    } else {
      await prisma.inputAssessmentStudent.update({
        where: { id: studentId },
        data: { enrollmentStatus: null }
      });
    }

    revalidatePath("/admin/student-transfers")
    revalidatePath("/admin/student-info")
    revalidatePath("/admin/ket-qua-khao-sat")
    return { success: true }
  } catch (e: any) {
    console.error("revertEnrollmentAction Error:", e)
    return { success: false, error: e.message }
  }
}
