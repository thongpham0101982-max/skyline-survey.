// @ts-nocheck
import { prisma } from "@/lib/db";

/**
 * Thống kê tiến độ nhập điểm và phổ điểm của lớp dạy môn học
 */
export async function getClassGradebookStatus(teacherUserId?: string, classCode?: string, subjectCode?: string) {
  try {
    let teacher = null;
    if (teacherUserId) {
      teacher = await prisma.teacher.findUnique({
        where: { userId: teacherUserId }
      });
    }
    if (!teacher) {
      teacher = await prisma.teacher.findFirst({ where: { status: "ACTIVE" } });
    }
    if (!teacher) return { error: "Không tìm thấy hồ sơ giáo viên." };

    // Lấy các lớp được phân công giảng dạy hoặc lớp chủ nhiệm
    const teachingAssignments = await prisma.teachingAssignment.findMany({
      where: { teacherId: teacher.id },
      include: { class: true, subject: true }
    });

    if (teachingAssignments.length === 0 && !teacher.homeroomClass) {
      return { error: "Thầy/Cô hiện chưa được phân công giảng dạy hoặc chủ nhiệm lớp nào." };
    }

    // Chọn lớp và môn cần xem
    let targetAssignment = teachingAssignments[0];
    if (classCode) {
      const found = teachingAssignments.find(a => a.class?.classCode?.toLowerCase() === classCode.toLowerCase());
      if (found) targetAssignment = found;
    }

    if (!targetAssignment && teachingAssignments.length > 0) {
      targetAssignment = teachingAssignments[0];
    }

    const classId = targetAssignment?.classId;
    const subjectId = targetAssignment?.subjectId;

    if (!classId || !subjectId) {
      return { error: "Chưa xác định được lớp học hoặc môn học cần tra cứu." };
    }

    // Đếm tổng số học sinh của lớp
    const totalStudents = await prisma.student.count({
      where: { classId, status: "ACTIVE" }
    });

    // Lấy các điểm đã nhập
    const gradeEntries = await prisma.subjectGradeEntry.findMany({
      where: { classId, subjectId },
      include: { student: true }
    });

    const enteredCount = gradeEntries.length;
    const missingCount = Math.max(0, totalStudents - enteredCount);

    const scores = gradeEntries
      .map(g => g.compositeScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));

    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "Chưa có";
    const maxScore = scores.length > 0 ? Math.max(...scores) : "N/A";
    const minScore = scores.length > 0 ? Math.min(...scores) : "N/A";

    return {
      success: true,
      teacherName: teacher.teacherName,
      className: targetAssignment.class?.className || classCode,
      classCode: targetAssignment.class?.classCode,
      subjectName: targetAssignment.subject?.name || subjectCode,
      totalStudents,
      enteredCount,
      missingCount,
      completionRate: totalStudents > 0 ? `${((enteredCount / totalStudents) * 100).toFixed(1)}%` : "0%",
      averageScore: avgScore,
      highestScore: maxScore,
      lowestScore: minScore
    };
  } catch (error: any) {
    console.error("Error in getClassGradebookStatus:", error);
    return { error: `Lỗi thống kê sổ điểm: ${error.message}` };
  }
}

/**
 * Cảnh báo học sinh dưới chuẩn benchmark môn học trong lớp dạy
 */
export async function getBenchmarkAlerts(teacherUserId: string, classCode?: string, subjectCode?: string) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId }
    });
    if (!teacher) return { error: "Không tìm thấy hồ sơ giáo viên." };

    let targetClass = null;
    if (classCode) {
      targetClass = await prisma.class.findFirst({
        where: { classCode: { equals: classCode, mode: "insensitive" } }
      });
    }

    if (!targetClass && teacher.homeroomClass) {
      targetClass = await prisma.class.findFirst({
        where: { className: teacher.homeroomClass }
      });
    }

    if (!targetClass) {
      const assignment = await prisma.teachingAssignment.findFirst({
        where: { teacherId: teacher.id },
        include: { class: true }
      });
      targetClass = assignment?.class;
    }

    if (!targetClass) return { error: "Không tìm thấy lớp học hợp lệ để kiểm tra chuẩn." };

    // Lấy benchmark config
    const benchmarkConfig = await prisma.subjectBenchmarkConfig.findFirst({
      where: {
        academicYearId: targetClass.academicYearId,
        OR: [
          { grade: targetClass.grade },
          { grade: "ALL" }
        ]
      }
    });

    const benchmarkScore = benchmarkConfig?.benchmarkScore || 6.0;

    // Lấy điểm các học sinh
    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        classId: targetClass.id,
        compositeScore: { lt: benchmarkScore }
      },
      include: {
        student: true,
        subject: true
      },
      orderBy: { compositeScore: "asc" }
    });

    const underBenchmarkStudents = entries.map(e => ({
      studentCode: e.student?.studentCode,
      studentName: e.student?.studentName,
      subject: e.subject?.name,
      score: e.compositeScore,
      benchmarkRequired: benchmarkScore,
      gap: (benchmarkScore - (e.compositeScore || 0)).toFixed(1)
    }));

    return {
      success: true,
      className: targetClass.className,
      benchmarkStandard: benchmarkScore,
      totalUnderBenchmark: underBenchmarkStudents.length,
      students: underBenchmarkStudents
    };
  } catch (error: any) {
    console.error("Error in getBenchmarkAlerts:", error);
    return { error: `Lỗi kiểm tra chuẩn benchmark: ${error.message}` };
  }
}

/**
 * Dành cho GVCN: Danh sách học sinh cần hỗ trợ đặc biệt (Cảnh báo Vàng, Đỏ) và yêu cầu trợ giúp
 */
export async function getHomeroomAtRiskStudents(teacherUserId?: string, currentPath?: string) {
  try {
    let homeroom = null;

    // 1. Nếu trên URL đang mở cụ thể lớp nào (ví dụ: ?classId=...)
    if (currentPath && currentPath.includes("classId=")) {
      const match = currentPath.match(/classId=([^&]+)/);
      if (match && match[1]) {
        homeroom = await prisma.class.findUnique({
          where: { id: match[1] }
        });
      }
    }

    // 2. Nếu chưa có homeroom nhưng có teacherUserId, tìm lớp chủ nhiệm của GV
    if (!homeroom && teacherUserId) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: teacherUserId }
      });
      if (teacher) {
        homeroom = await prisma.class.findFirst({
          where: {
            OR: [
              { homeroomTeacherId: teacher.id },
              { className: teacher.homeroomClass || "__none__" }
            ]
          }
        });
      }
    }

    // 3. Fallback: Lấy lớp học đầu tiên đang hoạt động nếu chưa có dữ liệu chỉ định
    if (!homeroom) {
      homeroom = await prisma.class.findFirst({
        where: { status: "ACTIVE" }
      });
    }

    if (!homeroom) {
      return { error: "Không tìm thấy dữ liệu lớp học phù hợp để tra cứu cảnh báo." };
    }

    // Lấy danh sách học sinh có trạng thái Vàng hoặc Đỏ
    const advisoryStatuses = await prisma.studentAdvisoryStatus.findMany({
      where: {
        student: { classId: homeroom.id },
        statusColor: { in: ["YELLOW", "RED"] }
      },
      include: { student: true }
    });

    // Lấy các yêu cầu trợ giúp chưa được giải quyết
    const pendingHelpRequests = await prisma.studentHelpRequest.findMany({
      where: {
        student: { classId: homeroom.id },
        status: { in: ["PENDING", "PROCESSING"] }
      },
      include: { student: true },
      orderBy: { createdAt: "desc" }
    });

    return {
      success: true,
      homeroomClass: homeroom.className,
      totalAtRisk: advisoryStatuses.length,
      atRiskList: advisoryStatuses.map(s => ({
        studentName: s.student?.studentName,
        studentCode: s.student?.studentCode,
        color: s.statusColor === "RED" ? "ĐỎ (Nguy cơ cao)" : "VÀNG (Cần chú ý)",
        category: s.reasonCategory || "Chưa phân loại",
        detail: s.reasonDetail || "Chưa có ghi chú chi tiết"
      })),
      pendingHelpRequestsCount: pendingHelpRequests.length,
      pendingRequests: pendingHelpRequests.map(r => ({
        studentName: r.student?.studentName,
        category: r.category,
        urgency: r.urgency,
        content: r.content,
        date: r.createdAt.toLocaleDateString("vi-VN")
      }))
    };
  } catch (error: any) {
    console.error("Error in getHomeroomAtRiskStudents:", error);
    return { error: `Lỗi truy xuất học sinh cảnh báo: ${error.message}` };
  }
}

/**
 * Tạo bản thảo nhận xét học kỳ gợi ý cho học sinh dựa trên dữ liệu điểm, năng lực & mục tiêu thật
 */
export async function draftStudentEvaluationComment(studentIdentifier: string) {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentCode: studentIdentifier },
          { studentName: { contains: studentIdentifier } }
        ]
      },
      include: {
        class: true,
        subjectGradeEntries: {
          include: { subject: true },
          take: 10
        },
        competencySummaries: {
          include: { subject: true },
          take: 5
        },
        goals: {
          take: 5,
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!student) {
      return { error: `Không tìm thấy học sinh với mã hoặc tên "${studentIdentifier}".` };
    }

    const grades = student.subjectGradeEntries.map(g => ({
      subject: g.subject?.name,
      score: g.compositeScore
    }));

    const validScores = grades.filter(g => typeof g.score === "number").map(g => g.score as number);
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : "Chưa đủ dữ liệu";

    const completedGoals = student.goals.filter(g => g.status === "COMPLETED" || g.achievementLevel === "DAT").length;

    return {
      success: true,
      studentName: student.studentName,
      studentCode: student.studentCode,
      className: student.class?.className,
      averageScore: avgScore,
      subjectScores: grades,
      totalGoals: student.goals.length,
      completedGoals,
      promptGuidance: `Dựa vào số liệu trên: Điểm TB ${avgScore}, số môn đã nhập ${grades.length}, mục tiêu hoàn thành ${completedGoals}/${student.goals.length}. Hãy soạn một lời nhận xét học kỳ hoàn chỉnh, giàu tính sư phạm, khích lệ và chỉ ra định hướng rèn luyện tiếp theo cho học sinh ${student.studentName}.`
    };
  } catch (error: any) {
    console.error("Error in draftStudentEvaluationComment:", error);
    return { error: `Lỗi tạo dự thảo nhận xét: ${error.message}` };
  }
}

/**
 * Tra cứu hoạt động dự giờ cá nhân, chỉ tiêu tháng và nhận xét đánh giá chuyên môn
 */
export async function getTeacherObservationStatus(teacherUserId?: string) {
  try {
    let teacher = null;
    if (teacherUserId) {
      teacher = await prisma.teacher.findUnique({
        where: { userId: teacherUserId }
      });
    }
    if (!teacher) {
      teacher = await prisma.teacher.findFirst({ where: { status: "ACTIVE" } });
    }
    if (!teacher) return { error: "Không tìm thấy hồ sơ giáo viên." };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Tiết dự
    const regs = await prisma.observationRegistration.findMany({
      where: {
        teacherId: teacher.id,
        isApproved: true,
        evaluation: { isNot: null },
        slot: { date: { gte: startOfMonth, lte: endOfMonth } }
      },
      include: { slot: true }
    });

    let observedCount = 0;
    regs.forEach(r => {
      observedCount += r.slot.isDoublePeriod ? 2 : 1;
    });

    const quota = 2;

    // Các tiết dạy của chính giáo viên và nhận xét góp ý
    const taughtSlots = await prisma.observationSlot.findMany({
      where: { teacherId: teacher.id },
      include: {
        registrations: {
          where: { isApproved: true },
          include: { evaluation: true }
        }
      },
      orderBy: { date: "desc" },
      take: 5
    });

    const feedbackList: any[] = [];
    taughtSlots.forEach(s => {
      const evals = s.registrations.map(r => r.evaluation).filter(Boolean);
      evals.forEach(e => {
        if (e.strengths || e.improvements) {
          feedbackList.push({
            topic: s.topic,
            date: s.date.toLocaleDateString("vi-VN"),
            strengths: e.strengths,
            improvements: e.improvements
          });
        }
      });
    });

    return {
      success: true,
      teacherName: teacher.teacherName,
      month: currentMonth,
      year: currentYear,
      observedCount,
      quota,
      isQuotaCompleted: observedCount >= quota,
      remainingSlots: Math.max(0, quota - observedCount),
      recentTaughtFeedbacks: feedbackList
    };
  } catch (error: any) {
    console.error("Error in getTeacherObservationStatus:", error);
    return { error: `Lỗi kiểm tra hoạt động dự giờ: ${error.message}` };
  }
}
