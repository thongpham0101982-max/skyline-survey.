import { prisma } from "@/lib/db";

// 1. Thống kê dự giờ của một Giáo viên
export async function getTeacherObservationStats(teacherNameOrCode: string) {
  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { teacherName: { contains: teacherNameOrCode } },
          { teacherCode: teacherNameOrCode }
        ]
      },
      include: {
        departmentRel: true,
        hostObservationSlots: {
          include: {
            registrations: {
              include: { evaluation: true }
            }
          }
        }
      }
    });

    if (!teacher) {
      return { error: `Không tìm thấy giáo viên nào có tên hoặc mã số là "${teacherNameOrCode}"` };
    }

    const totalSlots = teacher.hostObservationSlots.length;
    const evaluations = teacher.hostObservationSlots.flatMap(s => s.registrations.map(r => r.evaluation).filter(Boolean));
    
    // Tính toán số lượng xếp loại dự giờ
    const ratingsCount: Record<string, number> = {};
    let totalScoreSum = 0;
    let scoreCount = 0;

    evaluations.forEach((evalData: any) => {
      const rating = evalData.overallRating || "Chưa xếp loại";
      ratingsCount[rating] = (ratingsCount[rating] || 0) + 1;
      
      if (evalData.totalScore !== null && evalData.totalScore !== undefined) {
        totalScoreSum += evalData.totalScore;
        scoreCount++;
      }
    });

    const averageScore = scoreCount > 0 ? (totalScoreSum / scoreCount).toFixed(2) : null;

    return {
      success: true,
      teacherName: teacher.teacherName,
      teacherCode: teacher.teacherCode,
      department: teacher.departmentRel?.name || "Chưa phân tổ chuyên môn",
      totalTaughtSlots: totalSlots,
      totalEvaluations: evaluations.length,
      averageScore: averageScore ? `${averageScore}/20.00đ` : "Chưa có điểm trung bình",
      ratingsSummary: ratingsCount,
      recentTopics: teacher.hostObservationSlots.slice(0, 3).map(s => ({
        topic: s.topic,
        className: s.className,
        date: s.date.toLocaleDateString("vi-VN")
      }))
    };
  } catch (error: any) {
    return { error: `Lỗi truy vấn dữ liệu: ${error.message}` };
  }
}

// 2. Thống kê dự giờ của một Tổ chuyên môn
export async function getDeptObservationStats(deptName: string) {
  try {
    const dept = await prisma.department.findFirst({
      where: { name: { contains: deptName } }
    });

    if (!dept) {
      return { error: `Không tìm thấy tổ chuyên môn nào phù hợp với từ khóa "${deptName}"` };
    }

    const teachers = await prisma.teacher.findMany({
      where: { departmentId: dept.id },
      include: {
        hostObservationSlots: {
          include: {
            registrations: {
              include: { evaluation: true }
            }
          }
        }
      }
    });

    let totalSlots = 0;
    let totalEvaluations = 0;
    const ratingsSummary: Record<string, number> = {};
    const teacherStatsList = [];

    for (const t of teachers) {
      totalSlots += t.hostObservationSlots.length;
      const evals = t.hostObservationSlots.flatMap(s => s.registrations.map(r => r.evaluation).filter(Boolean));
      totalEvaluations += evals.length;

      const ratings: Record<string, number> = {};
      evals.forEach((e: any) => {
        const r = e.overallRating || "Chưa xếp loại";
        ratings[r] = (ratings[r] || 0) + 1;
        ratingsSummary[r] = (ratingsSummary[r] || 0) + 1;
      });

      teacherStatsList.push({
        name: t.teacherName,
        code: t.teacherCode,
        slotsCount: t.hostObservationSlots.length,
        evaluationsCount: evals.length,
        ratings
      });
    }

    return {
      success: true,
      departmentName: dept.name,
      blockCM: dept.blockCM || "Chưa rõ",
      totalTeachers: teachers.length,
      totalTaughtSlots: totalSlots,
      totalEvaluations: totalEvaluations,
      ratingsSummary,
      teachers: teacherStatsList.slice(0, 10) // Giới hạn 10 giáo viên tiêu biểu để tránh quá tải token
    };
  } catch (error: any) {
    return { error: `Lỗi truy vấn dữ liệu tổ chuyên môn: ${error.message}` };
  }
}

// 3. Thống kê đợt khảo sát đầu vào (Input Assessment)
export async function getInputAssessmentSummary(periodSearch: string) {
  try {
    // 3.1. Tìm đợt khảo sát phổ thông K-12
    const periodK12 = await prisma.inputAssessmentPeriod.findFirst({
      where: { name: { contains: periodSearch } },
      include: {
        students: true
      }
    });

    // 3.2. Tìm đợt khảo sát Mầm non
    const periodPreschool = await prisma.preschoolInputAssessmentPeriod.findFirst({
      where: { name: { contains: periodSearch } },
      include: {
        students: true
      }
    });

    if (!periodK12 && !periodPreschool) {
      return { error: `Không tìm thấy đợt khảo sát đầu vào nào phù hợp với tên "${periodSearch}"` };
    }

    const result: any = { success: true };

    if (periodK12) {
      const students = periodK12.students;
      let passed = 0;
      let failed = 0;
      let pending = 0;
      let mathSum = 0, mathCount = 0;
      let litSum = 0, litCount = 0;
      let engSum = 0, engCount = 0;

      students.forEach(s => {
        const res = s.admissionResult || "";
        if (res === "Đạt" || res === "Đạt cam kết" || res === "Học thử") passed++;
        else if (res.includes("Không đạt")) failed++;
        else pending++;

        if (s.mathScore !== null && s.mathScore !== undefined) { mathSum += s.mathScore; mathCount++; }
        if (s.literatureScore !== null && s.literatureScore !== undefined) { litSum += s.literatureScore; litCount++; }
        if (s.writtenEnglishScore !== null && s.writtenEnglishScore !== undefined) { engSum += s.writtenEnglishScore; engCount++; }
      });

      result.k12 = {
        periodName: periodK12.name,
        code: periodK12.code,
        totalStudents: students.length,
        statusCounts: { passed, failed, pending },
        averages: {
          math: mathCount > 0 ? (mathSum / mathCount).toFixed(2) : "N/A",
          literature: litCount > 0 ? (litSum / litCount).toFixed(2) : "N/A",
          english: engCount > 0 ? (engSum / engCount).toFixed(2) : "N/A"
        }
      };
    }

    if (periodPreschool) {
      const students = periodPreschool.students;
      let passed = 0;
      let failed = 0;
      let pending = 0;

      students.forEach(s => {
        const res = s.admissionResult || s.devAssessmentResult || "";
        if (res === "Đạt" || res === "Học thử" || res === "Đồng ý") passed++;
        else if (res.includes("Không đạt") || res.includes("Không đồng ý")) failed++;
        else pending++;
      });

      result.preschool = {
        periodName: periodPreschool.name,
        code: periodPreschool.code,
        totalStudents: students.length,
        statusCounts: { passed, failed, pending }
      };
    }

    return result;
  } catch (error: any) {
    return { error: `Lỗi truy vấn dữ liệu khảo sát đầu vào: ${error.message}` };
  }
}

// 4. Tìm kiếm kết quả & điểm của một học sinh cụ thể
export async function searchStudentInputScore(studentSearch: string) {
  try {
    // Tìm trong bảng Phổ thông K-12
    const studentsK12 = await prisma.inputAssessmentStudent.findMany({
      where: {
        OR: [
          { fullName: { contains: studentSearch } },
          { studentCode: studentSearch }
        ]
      },
      include: {
        period: true
      }
    });

    // Tìm trong bảng Mầm non
    const studentsPreschool = await prisma.preschoolInputAssessmentStudent.findMany({
      where: {
        OR: [
          { fullName: { contains: studentSearch } },
          { studentCode: studentSearch }
        ]
      },
      include: {
        period: true
      }
    });

    if (studentsK12.length === 0 && studentsPreschool.length === 0) {
      return { error: `Không tìm thấy thông tin học sinh khảo sát đầu vào nào có tên hoặc mã số là "${studentSearch}"` };
    }

    return {
      success: true,
      k12Students: studentsK12.map(s => ({
        fullName: s.fullName,
        studentCode: s.studentCode,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toLocaleDateString("vi-VN") : null,
        periodName: s.period.name,
        grade: s.grade || "Chưa rõ",
        scores: {
          math: s.mathScore,
          literature: s.literatureScore,
          englishWritten: s.writtenEnglishScore,
          englishOral: s.oralEnglishScore,
          psychology: s.psychologyScore
        },
        admissionResult: s.admissionResult || "Chưa duyệt",
        enrollmentStatus: s.enrollmentStatus || "Chưa nhập học"
      })),
      preschoolStudents: studentsPreschool.map(s => ({
        fullName: s.fullName,
        studentCode: s.studentCode,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toLocaleDateString("vi-VN") : null,
        periodName: s.period.name,
        grade: s.grade || "Chưa rõ",
        admissionResult: s.admissionResult || s.devAssessmentResult || "Chưa duyệt",
        probationaryResult: s.probationaryResult || "Không thử học",
        enrollmentStatus: s.enrollmentStatus || "Chưa nhập học",
        notes: s.directorNote
      }))
    };
  } catch (error: any) {
    return { error: `Lỗi tìm kiếm học sinh khảo sát: ${error.message}` };
  }
}
