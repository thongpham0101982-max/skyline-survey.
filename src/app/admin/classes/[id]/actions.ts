"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function importStudentsAction(classId: string, data: any[]) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) return { success: false, error: "Class not found" }

  if (!data || data.length === 0) return { success: false, error: "Dữ liệu trống hoặc không tìm thấy cột phù hợp trong Excel." }

  let count = 0
  let skipped = 0
  let errorMsg = ""
  const warnings: string[] = []
  const seenCodesInFile = new Set()

  // 1. Pre-fetch existing students to avoid N+1 lookups inside loop
  const studentCodes = data.map(item => item.studentCode ? String(item.studentCode).trim().toUpperCase() : "").filter(Boolean)
  const existingStudents = await prisma.student.findMany({
    where: { studentCode: { in: studentCodes } }
  })
  const existingStudentsMap = new Map(existingStudents.map(s => [s.studentCode, s]))

  // 2. Use a transaction block to batch inserts/updates together
  await prisma.$transaction(async (tx) => {
    for (const item of data) {
      try {
        if (!item.studentCode || !item.studentName) {
          skipped++
          continue
        }
        const sCode = String(item.studentCode).trim().toUpperCase()

        if (seenCodesInFile.has(sCode)) {
          skipped++
          warnings.push(`Mã HS trùng lặp trong tệp Excel: ${sCode}`)
          continue
        }
        seenCodesInFile.add(sCode)

        const existing = existingStudentsMap.get(sCode)

        if (existing) {
          skipped++
          warnings.push(`Mã HS đã tồn tại trong hệ thống: ${sCode}`)
          continue
        } else {
          await tx.student.create({
            data: {
              studentCode: sCode,
              studentName: item.studentName,
              gender: item.gender,
              dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
              classId: cls.id,
              campusId: cls.campusId,
              academicYearId: cls.academicYearId,
              status: "ACTIVE",
              studentType: item.studentType || "CHINH_KHOA",
              studentTypeNote: item.studentType === "GIAO_LUU" ? "Import diện giao lưu" : null
            }
          });
          if (item.vnEduCode) {
            await upsertStudentVnEduMapping(cls.academicYearId, sCode, item.vnEduCode);
          }
        }
        count++
      } catch(e: any) {
        console.error("Error importing student: ", item, e)
        errorMsg = e.message
        throw e // rollback transaction on individual row failure to ensure consistency
      }
    }
  })
  const session = await auth()
  await logActivity(
    session?.user?.id || "SYSTEM",
    session?.user?.email || "SYSTEM",
    "IMPORT_STUDENTS",
    "Student",
    "BATCH",
    null,
    { count, skipped, warningsCount: warnings.length }
  )
  revalidatePath(`/admin/classes/${classId}`)
  if (count === 0 && data.length > 0 && warnings.length === 0) {
    return { success: false, error: "Lỗi lưu dữ liệu: " + (errorMsg || "Không rõ nguyên nhân") + ". Skpped: " + skipped }
  }
  return { success: true, count, skipped, warnings }
}


export async function upsertStudentVnEduMapping(academicYearId: string, databaseCode: string, vnEduCode?: string | null) {
  const sCode = String(databaseCode || "").trim().toUpperCase();
  if (!sCode) return { success: false, error: "Mã học sinh không hợp lệ" };

  const markCode = vnEduCode !== undefined && vnEduCode !== null ? String(vnEduCode).trim().toUpperCase() : "";

  // Nếu người dùng xóa mã vnEdu (để trống)
  if (!markCode) {
    try {
      await prisma.studentCodeMapping.deleteMany({
        where: {
          academicYearId,
          databaseCode: sCode
        }
      });
      return { success: true, vnEduCode: null };
    } catch (e: any) {
      console.error("Error clearing code mapping:", e);
      return { success: false, error: e.message };
    }
  }

  // Kiểm tra ràng buộc 1 - 1 xuyên suốt:
  // Mã VNEdu này đã được gán cho một học sinh (databaseCode) khác chưa?
  const existingMapping = await prisma.studentCodeMapping.findFirst({
    where: {
      markFileCode: markCode,
      databaseCode: { not: sCode }
    }
  });

  if (existingMapping) {
    const otherStudent = await prisma.student.findFirst({
      where: { studentCode: existingMapping.databaseCode },
      select: { studentName: true, studentCode: true }
    });
    const otherName = otherStudent ? `${otherStudent.studentName} (${otherStudent.studentCode})` : existingMapping.databaseCode;
    return {
      success: false,
      error: `Mã VNEdu '${markCode}' đã được gán cho học sinh ${otherName}! Mỗi học sinh chỉ có 1 Mã VNEdu duy nhất.`
    };
  }

  try {
    // Upsert cho năm học hiện tại
    await prisma.studentCodeMapping.upsert({
      where: {
        academicYearId_databaseCode: {
          academicYearId,
          databaseCode: sCode
        }
      },
      update: { markFileCode: markCode },
      create: {
        academicYearId,
        databaseCode: sCode,
        markFileCode: markCode
      }
    });

    // Đồng bộ xuyên suốt: Cập nhật cho tất cả các năm học khác mà học sinh này đã có bản ghi mapping
    const otherYearMappings = await prisma.studentCodeMapping.findMany({
      where: {
        databaseCode: sCode,
        academicYearId: { not: academicYearId }
      }
    });

    for (const otherMap of otherYearMappings) {
      await prisma.studentCodeMapping.update({
        where: { id: otherMap.id },
        data: { markFileCode: markCode }
      }).catch(err => console.error("Error syncing mapping to other academic year:", err));
    }

    return { success: true, vnEduCode: markCode };
  } catch (e: any) {
    console.error("Error upserting code mapping:", e);
    return { success: false, error: e.message };
  }
}

export async function updateStudentVnEduCodeAction(classId: string, studentId: string, studentCode: string, vnEduCode: string) {
  try {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return { success: false, error: "Lớp học không tồn tại" };

    const res = await upsertStudentVnEduMapping(cls.academicYearId, studentCode, vnEduCode);
    if (!res.success) {
      return res;
    }

    const session = await auth();
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "UPDATE_STUDENT_VNEDU_CODE",
      "StudentCodeMapping",
      studentId,
      null,
      { studentCode, vnEduCode: res.vnEduCode, classId }
    );

    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, vnEduCode: res.vnEduCode };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function importVnEduMappingAction(classId: string, mappings: { studentCode: string; vnEduCode: string }[]) {
  try {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return { success: false, error: "Lớp học không tồn tại" };

    if (!mappings || mappings.length === 0) {
      return { success: false, error: "Dữ liệu trống hoặc không có dòng nào hợp lệ." };
    }

    let successCount = 0;
    let skippedCount = 0;
    const warnings: string[] = [];
    const seenMarkCodes = new Set<string>();
    const seenStudentCodes = new Set<string>();

    for (const item of mappings) {
      const sCode = String(item.studentCode || "").trim().toUpperCase();
      const vCode = String(item.vnEduCode || "").trim().toUpperCase();

      if (!sCode) {
        skippedCount++;
        continue;
      }

      if (seenStudentCodes.has(sCode)) {
        warnings.push(`Mã HS ${sCode} bị lặp lại nhiều lần trong file.`);
        skippedCount++;
        continue;
      }
      seenStudentCodes.add(sCode);

      if (!vCode) {
        skippedCount++;
        continue;
      }

      if (seenMarkCodes.has(vCode)) {
        warnings.push(`Mã VNEdu '${vCode}' bị trùng lặp cho nhiều học sinh trong file.`);
        skippedCount++;
        continue;
      }
      seenMarkCodes.add(vCode);

      const res = await upsertStudentVnEduMapping(cls.academicYearId, sCode, vCode);
      if (res.success) {
        successCount++;
      } else {
        skippedCount++;
        warnings.push(`HS ${sCode}: ${res.error}`);
      }
    }

    const session = await auth();
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "IMPORT_VNEDU_MAPPINGS",
      "StudentCodeMapping",
      classId,
      null,
      { successCount, skippedCount, warningsCount: warnings.length }
    );

    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, successCount, skippedCount, warnings };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addStudentAction(classId: string, data: any) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) return { success: false, error: "Class not found" }
  try {
    const studentCode = data.studentCode?.trim().toUpperCase()
    if (!studentCode) {
      return { success: false, error: "Mã học sinh không được để trống!" }
    }

    // Check duplicate studentCode
    const existing = await prisma.student.findFirst({ 
      where: { 
        studentCode,
        academicYearId: cls.academicYearId
      } 
    })
    if (existing) {
      return { success: false, error: `Mã học sinh '${studentCode}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác!` }
    }

    // Nếu có nhập mã VNEdu, kiểm tra trước khi tạo học sinh
    if (data.vnEduCode) {
      const vCode = String(data.vnEduCode).trim().toUpperCase();
      const existingMapping = await prisma.studentCodeMapping.findFirst({
        where: {
          markFileCode: vCode,
          databaseCode: { not: studentCode }
        }
      });
      if (existingMapping) {
        const otherStudent = await prisma.student.findFirst({
          where: { studentCode: existingMapping.databaseCode },
          select: { studentName: true, studentCode: true }
        });
        const otherName = otherStudent ? `${otherStudent.studentName} (${otherStudent.studentCode})` : existingMapping.databaseCode;
        return {
          success: false,
          error: `Mã VNEdu '${vCode}' đã được gán cho học sinh ${otherName}! Mỗi học sinh chỉ có 1 Mã VNEdu duy nhất.`
        };
      }
    }

    const student = await prisma.student.create({
      data: {
        studentCode: studentCode,
        studentName: data.studentName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        classId: cls.id,
        campusId: cls.campusId,
        academicYearId: cls.academicYearId,
        status: "ACTIVE",
        studentType: data.studentType === "GIAO_LUU" ? "GIAO_LUU" : "CHINH_KHOA",
        studentTypeNote: data.studentTypeNote || (data.studentType === "GIAO_LUU" ? "Học giao lưu" : null)
      }
    })
    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "CREATE_STUDENT",
      "Student",
      student.id,
      null,
      { studentCode, studentName: data.studentName, classId }
    )
    await syncAssessmentStudentInfoWithMasterAction(studentCode, data.studentName, data.gender, data.dateOfBirth);
    if (data.vnEduCode) {
      await upsertStudentVnEduMapping(cls.academicYearId, studentCode, data.vnEduCode);
    }
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateStudentAction(classId: string, studentId: string, data: any) {
  try {
    const studentCode = data.studentCode?.trim().toUpperCase()
    if (!studentCode) {
      return { success: false, error: "Mã học sinh không được để trống!" }
    }

    const oldStudent = await prisma.student.findUnique({ where: { id: studentId } })
    if (!oldStudent) {
      return { success: false, error: "Học sinh không tồn tại!" }
    }

    // Check if another student has this code
    const existing = await prisma.student.findFirst({ 
      where: { 
        studentCode,
        academicYearId: oldStudent.academicYearId
      } 
    })
    if (existing && existing.id !== studentId) {
      return { success: false, error: `Mã học sinh '${studentCode}' đã tồn tại trên một học sinh khác!` }
    }

    // Cập nhật mã VNEdu nếu có trong payload
    if (data.vnEduCode !== undefined) {
      const mapRes = await upsertStudentVnEduMapping(oldStudent.academicYearId, studentCode, data.vnEduCode);
      if (!mapRes.success) {
        return { success: false, error: mapRes.error };
      }
    }

    await prisma.student.update({
      where: { id: studentId },
      data: {
        studentCode: studentCode,
        studentName: data.studentName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }
    })
    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "UPDATE_STUDENT",
      "Student",
      studentId,
      oldStudent,
      data
    )
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteStudentsAction(classId: string, studentIds: string[]) {
  try {
    await prisma.student.deleteMany({
      where: { id: { in: studentIds } }
    })
    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "DELETE_STUDENTS",
      "Student",
      studentIds.join(","),
      null,
      { deletedCount: studentIds.length }
    )
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
export async function assignSurveyToStudentAction(studentId: string, surveyPeriodId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    })
    if (!student) return { success: false, error: "Không tìm thấy học sinh" }

    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId }
    })
    if (!period) return { success: false, error: "Không tìm thấy đợt khảo sát" }

    const existing = await prisma.surveyForm.findFirst({
      where: {
        studentId: student.id,
        surveyPeriodId: period.id,
        parentId: null
      }
    })
    if (existing) return { success: false, error: "Đã gán đợt khảo sát này cho học sinh." }

    await prisma.surveyForm.create({
      data: {
        surveyPeriodId: period.id,
        studentId: student.id,
        classId: student.classId,
        campusId: student.campusId,
        academicYearId: student.academicYearId || 'AY-2026',
        status: 'PENDING'
      }
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


export async function getPaginatedStudentsInClassAction(classId: string, page: number = 1, pageSize: number = 20) {
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    const total = await prisma.student.count({
      where: { classId, status: "ACTIVE" }
    })
    return { success: true, students, total }
  } catch (e: any) {
    return { success: false, students: [], total: 0, error: e.message }
  }
}


export async function syncClassStudentsWithSurveysAction(classId: string) {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { students: { where: { status: "ACTIVE" } } }
    })
    if (!cls) return { success: false, error: "Class not found" }

    const activePeriods = await prisma.surveyPeriod.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { academicYearId: cls.academicYearId },
          { campusId: cls.campusId },
          { campusId: null }
        ]
      }
    })

    if (activePeriods.length === 0) {
      return { success: false, error: "Không tìm thấy đợt khảo sát nào đang mở cho cơ sở/năm học này." }
    }

    let createdCount = 0
    let updatedCount = 0

    for (const student of cls.students) {
      for (const period of activePeriods) {
        const existing = await prisma.surveyForm.findFirst({
          where: {
            studentId: student.id,
            surveyPeriodId: period.id
          }
        })

        if (!existing) {
          await prisma.surveyForm.create({
            data: {
              surveyPeriodId: period.id,
              studentId: student.id,
              classId: student.classId,
              campusId: student.campusId,
              academicYearId: student.academicYearId || cls.academicYearId,
              status: "PENDING"
            }
          })
          createdCount++
        } else {
          await prisma.surveyForm.update({
            where: { id: existing.id },
            data: {
              classId: student.classId,
              campusId: student.campusId,
              academicYearId: student.academicYearId || cls.academicYearId
            }
          })
          updatedCount++
        }
      }
    }

    const session = await auth()
    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "SYNC_SURVEY_FORMS",
      "SurveyForm",
      classId,
      null,
      { createdCount, updatedCount, studentCount: cls.students.length }
    )

    revalidatePath(`/admin/classes/${classId}`)
    return {
      success: true,
      message: `Đã đồng bộ thành công ${cls.students.length} học sinh với ${activePeriods.length} đợt khảo sát (${createdCount} tạo mới, ${updatedCount} cập nhật).`,
      createdCount,
      updatedCount
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


export async function syncAssessmentStudentInfoWithMasterAction(studentCode: string, studentName: string, gender?: string | null, dateOfBirth?: Date | null) {
  if (!studentCode) return;
  const codeUpper = studentCode.trim().toUpperCase();
  try {
    const pAny = prisma as any;
    if (pAny.inputAssessmentStudent) {
      await pAny.inputAssessmentStudent.updateMany({
        where: { studentCode: codeUpper },
        data: {
          fullName: studentName,
          gender: gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
        }
      });
    }
    if (pAny.preschoolInputAssessmentStudent) {
      await pAny.preschoolInputAssessmentStudent.updateMany({
        where: { studentCode: codeUpper },
        data: {
          fullName: studentName,
          gender: gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
        }
      });
    }
  } catch (e) {
    console.error("Auto sync assessment student error:", e);
  }
}

export async function convertStudentTypeAction(data: {
  studentId: string;
  classId: string;
  targetType: "CHINH_KHOA" | "GIAO_LUU";
  reason: string;
  syncSurvey?: boolean;
}) {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized: Vui lòng đăng nhập" };

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { class: true }
    });
    if (!student) return { success: false, error: "Không tìm thấy học sinh" };

    const oldType = student.studentType || "CHINH_KHOA";
    if (oldType === data.targetType) {
      return { success: false, error: `Học sinh hiện đã thuộc diện ${data.targetType === "CHINH_KHOA" ? "Chính khóa" : "Giao lưu"}` };
    }

    const userName = (session.user as any)?.fullName || (session.user as any)?.name || session.user?.email || "BGH";
    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(now);

    const oldTypeLabel = oldType === "GIAO_LUU" ? "Giao lưu" : "Chính khóa";
    const newTypeLabel = data.targetType === "GIAO_LUU" ? "Giao lưu" : "Chính khóa";

    await prisma.student.update({
      where: { id: data.studentId },
      data: {
        studentType: data.targetType,
        convertedAt: now,
        conversionReason: data.reason,
        convertedBy: userName,
        studentTypeNote: `Chuyển từ ${oldTypeLabel} sang ${newTypeLabel} ngày ${formattedDate}. Lý do: ${data.reason}`
      }
    });

    // Đồng bộ với bản ghi khảo sát tuyển sinh đầu vào
    if (data.syncSurvey) {
      const candidateCondition = {
        OR: [
          { enrollmentCode: student.studentCode },
          { studentCode: student.studentCode },
          { enrollmentClassId: student.classId, fullName: student.studentName }
        ]
      };

      const newAdmissionResult = data.targetType === "CHINH_KHOA" ? "Đạt" : "Đạt - Giao lưu";
      const historyEntry = `\n• ${formattedDate} | ${userName} | ${oldTypeLabel} ➔ ${newTypeLabel} | Lý do: ${data.reason}`;

      // Cập nhật K12
      const k12Candidates = await prisma.inputAssessmentStudent.findMany({ where: candidateCondition });
      for (const cand of k12Candidates) {
        const newNote = (cand.directorNote || "").includes("--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---")
          ? cand.directorNote + historyEntry
          : (cand.directorNote ? cand.directorNote + "\n\n--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---" + historyEntry : "--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---" + historyEntry);

        await prisma.inputAssessmentStudent.update({
          where: { id: cand.id },
          data: {
            admissionResult: newAdmissionResult,
            directorNote: newNote
          }
        });
      }

      // Cập nhật Mầm non
      const preschoolCandidates = await prisma.preschoolInputAssessmentStudent.findMany({ where: candidateCondition });
      for (const cand of preschoolCandidates) {
        const newNote = (cand.directorNote || "").includes("--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---")
          ? cand.directorNote + historyEntry
          : (cand.directorNote ? cand.directorNote + "\n\n--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---" + historyEntry : "--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---" + historyEntry);

        await prisma.preschoolInputAssessmentStudent.update({
          where: { id: cand.id },
          data: {
            admissionResult: newAdmissionResult,
            directorNote: newNote
          }
        });
      }
    }

    await logActivity(
      session?.user?.id || "SYSTEM",
      session?.user?.email || "SYSTEM",
      "CONVERT_STUDENT_TYPE",
      "Student",
      student.id,
      null,
      { studentCode: student.studentCode, from: oldType, to: data.targetType, reason: data.reason }
    );

    revalidatePath(`/admin/classes/${data.classId}`);
    revalidatePath(`/admin/classes`);
    revalidatePath(`/admin/ho-so-hoc-sinh`);
    revalidatePath(`/admin/student-info`);

    return {
      success: true,
      message: `Đã chuyển đổi học sinh ${student.studentName} sang diện ${newTypeLabel} thành công!`
    };
  } catch (e: any) {
    console.error("Error converting student type:", e);
    return { success: false, error: e.message };
  }
}
