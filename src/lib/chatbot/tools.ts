import { prisma } from "@/lib/db";

// ==========================================
// 1. Dành cho GIÁO VIÊN
// ==========================================

// 1.1 Xem nhận xét ưu điểm/góp ý của các tiết dạy tôi đã dạy
export async function getTeacherOwnFeedback(teacherUserId: string) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId }
    });
    if (!teacher) return { error: "Không tìm thấy hồ sơ giáo viên của bạn." };

    const slots = await prisma.observationSlot.findMany({
      where: { teacherId: teacher.id },
      include: {
        registrations: {
          where: { isApproved: true },
          include: {
            evaluation: true,
            teacher: true // Người dự giờ
          }
        }
      },
      orderBy: { date: "desc" }
    });

    const feedbackList: any[] = [];
    slots.forEach(slot => {
      const slotEvals = slot.registrations.map(r => r.evaluation).filter(Boolean);
      if (slotEvals.length === 0) return;

      const strengths = slotEvals.map(e => ({
        observer: e.GDCSApprovalComment || "", // backup or name
        comment: e.strengths
      })).filter(item => item.comment);

      const improvements = slotEvals.map(e => ({
        observer: e.GDCSApprovalComment || "",
        comment: e.improvements
      })).filter(item => item.comment);

      if (strengths.length > 0 || improvements.length > 0) {
        feedbackList.push({
          topic: slot.topic,
          className: slot.className || "Chưa rõ",
          date: slot.date.toLocaleDateString("vi-VN"),
          strengths: strengths.map(s => s.comment),
          improvements: improvements.map(i => i.comment)
        });
      }
    });

    return {
      success: true,
      teacherName: teacher.teacherName,
      feedbackList
    };
  } catch (e: any) {
    return { error: `Lỗi truy xuất nhận xét: ${e.message}` };
  }
}

// 1.2 Kiểm tra xem giáo viên đã dự đủ số tiết bắt buộc trong tháng này chưa
export async function checkTeacherObservationQuota(teacherUserId: string) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId }
    });
    if (!teacher) return { error: "Không tìm thấy hồ sơ giáo viên." };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Tìm các registration đã được duyệt và GV đã nộp phiếu đánh giá
    const regs = await prisma.observationRegistration.findMany({
      where: {
        teacherId: teacher.id,
        isApproved: true,
        evaluation: { isNot: null },
        slot: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      },
      include: {
        slot: true
      }
    });

    let observedCount = 0;
    regs.forEach(r => {
      observedCount += r.slot.isDoublePeriod ? 2 : 1;
    });

    const quota = 2; // Chỉ tiêu mặc định là 2 tiết/tháng
    const isCompleted = observedCount >= quota;

    return {
      success: true,
      teacherName: teacher.teacherName,
      month: currentMonth,
      year: currentYear,
      observedCount,
      quota,
      isCompleted,
      remaining: Math.max(0, quota - observedCount)
    };
  } catch (e: any) {
    return { error: `Lỗi kiểm tra chỉ tiêu: ${e.message}` };
  }
}

// 1.3 Hướng dẫn tiêu chí chấm điểm dự giờ
export async function getObservationCriteriaGuidelines() {
  return {
    success: true,
    k12: [
      {
        standard: "Tiêu chuẩn 1: Phương tiện (Tối đa 3 điểm)",
        details: [
          "Yêu cầu 1 (1.5đ): Chuẩn bị giáo án tốt, rõ ràng mục tiêu, nội dung, sản phẩm học tập và tiến trình.",
          "Yêu cầu 2 (1.5đ): Sử dụng thiết bị dạy học và học liệu phù hợp, thiết thực."
        ]
      },
      {
        standard: "Tiêu chuẩn 2: Nội dung (Tối đa 5 điểm)",
        details: [
          "Yêu cầu 3 (2.0đ): Nội dung chính xác, khoa học, có tính giáo dục và hấp dẫn.",
          "Yêu cầu 4 (2.0đ): Hệ thống chuẩn kiến thức kỹ năng, làm rõ trọng tâm.",
          "Yêu cầu 5 (1.0đ): Liên hệ thực tế sinh động, phù hợp."
        ]
      },
      {
        standard: "Tiêu chuẩn 3: Phương pháp (Tối đa 9 điểm)",
        details: [
          "Yêu cầu 6 (2.0đ): Khắc phục lối dạy đọc chép, quan sát học sinh kịp thời.",
          "Yêu cầu 7 (3.0đ): Học sinh học tích cực, chủ động, tương tác và thảo luận nhóm.",
          "Yêu cầu 8 (2.0đ): Phân phối thời gian hợp lý, tiến trình khoa học, củng cố tốt.",
          "Yêu cầu 9 (2.0đ): Kết hợp linh hoạt các phương pháp dạy và học."
        ]
      },
      {
        standard: "Tiêu chuẩn 4: Kết quả (Tối đa 3 điểm)",
        details: [
          "Yêu cầu 10 (2.0đ): Đánh giá chất lượng học sinh hiểu bài, dễ nhớ, ghi chép đầy đủ.",
          "Yêu cầu 11 (1.0đ): Tiết dạy nhuần nhuyễn, gây ấn tượng, sáng tạo."
        ]
      }
    ],
    preschool: [
      "Tiêu chí 1: Nội dung phù hợp độ tuổi, chính xác khoa học.",
      "Tiêu chí 2: Phương pháp giảng dạy sáng tạo, linh hoạt thu hút trẻ.",
      "Tiêu chí 3: Tổ chức hoạt động học tích cực, trẻ tương tác cao.",
      "Tiêu chí 4: Sử dụng thiết bị dạy học, đồ dùng dạy học sáng tạo.",
      "Tiêu chí 5: Trẻ hào hứng, đạt được kết quả mong đợi."
    ]
  };
}


// ==========================================
// 2. Dành cho ADMIN
// ==========================================

// 2.1 Tra cứu số tiết dạy/dự của Giáo viên bất kỳ trong tháng
export async function getTeacherActivityInMonth(teacherNameOrCode: string, monthSearch?: number) {
  try {
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { teacherName: { contains: teacherNameOrCode } },
          { teacherCode: teacherNameOrCode }
        ]
      }
    });

    if (!teacher) return { error: `Không tìm thấy giáo viên "${teacherNameOrCode}"` };

    const now = new Date();
    const month = monthSearch || (now.getMonth() + 1);
    const year = now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Tiết dạy (do GV đứng lớp)
    const taughtSlots = await prisma.observationSlot.findMany({
      where: {
        teacherId: teacher.id,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        registrations: {
          include: { evaluation: true }
        }
      }
    });

    let taughtCount = 0;
    taughtSlots.forEach(s => {
      const hasEval = s.registrations.some(r => r.evaluation !== null);
      if (hasEval) {
        taughtCount += s.isDoublePeriod ? 2 : 1;
      }
    });

    // Tiết dự (được duyệt & đã đánh giá)
    const observedRegs = await prisma.observationRegistration.findMany({
      where: {
        teacherId: teacher.id,
        isApproved: true,
        evaluation: { isNot: null },
        slot: {
          date: { gte: startOfMonth, lte: endOfMonth }
        }
      },
      include: {
        slot: true
      }
    });

    let observedCount = 0;
    observedRegs.forEach(r => {
      observedCount += r.slot.isDoublePeriod ? 2 : 1;
    });

    return {
      success: true,
      teacherName: teacher.teacherName,
      teacherCode: teacher.teacherCode,
      month,
      year,
      taughtCount,
      observedCount
    };
  } catch (e: any) {
    return { error: `Lỗi thống kê hoạt động giáo viên: ${e.message}` };
  }
}

// 2.2 Giáo viên có tiết dạy ĐTB thấp nhất
export async function getLowestAverageScoreTaughtPeriod() {
  try {
    const slots = await prisma.observationSlot.findMany({
      where: {
        level: { not: "Mầm non" } // Chỉ tính điểm số của K-12
      },
      include: {
        teacher: true,
        registrations: {
          include: { evaluation: true }
        }
      }
    });

    let lowestSlot: any = null;
    let lowestAvg = 21;

    for (const slot of slots) {
      const evals = slot.registrations.map(r => r.evaluation).filter(Boolean);
      const scores = evals.map(e => e.totalScore).filter((s): s is number => s !== null && s !== undefined);
      if (scores.length === 0) continue;

      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestSlot = slot;
      }
    }

    if (!lowestSlot) return { error: "Không tìm thấy dữ liệu chấm điểm K-12 nào." };

    return {
      success: true,
      teacherName: lowestSlot.teacher.teacherName,
      teacherCode: lowestSlot.teacher.teacherCode,
      topic: lowestSlot.topic,
      className: lowestSlot.className || "Chưa rõ",
      date: lowestSlot.date.toLocaleDateString("vi-VN"),
      averageScore: lowestAvg.toFixed(2)
    };
  } catch (e: any) {
    return { error: `Lỗi truy vấn tiết dạy điểm thấp: ${e.message}` };
  }
}

// 2.3 Thống kê số tiết dạy, số tiết dự theo Tổ chuyên môn
export async function getDepartmentObservationStatsSummary(deptName: string) {
  try {
    const dept = await prisma.department.findFirst({
      where: { name: { contains: deptName } }
    });

    if (!dept) return { error: `Không tìm thấy tổ chuyên môn "${deptName}"` };

    const teachers = await prisma.teacher.findMany({
      where: { departmentId: dept.id },
      include: {
        hostObservationSlots: {
          include: {
            registrations: {
              include: { evaluation: true }
            }
          }
        },
        observerRegistrations: {
          where: { isApproved: true, evaluation: { isNot: null } },
          include: { slot: true }
        }
      }
    });

    let totalTaught = 0;
    let totalObserved = 0;

    teachers.forEach(t => {
      t.hostObservationSlots.forEach(s => {
        const hasEval = s.registrations.some(r => r.evaluation !== null);
        if (hasEval) totalTaught += s.isDoublePeriod ? 2 : 1;
      });
      t.observerRegistrations.forEach(r => {
        totalObserved += r.slot.isDoublePeriod ? 2 : 1;
      });
    });

    return {
      success: true,
      departmentName: dept.name,
      totalTeachers: teachers.length,
      totalTaughtSlots: totalTaught,
      totalObservedSlots: totalObserved
    };
  } catch (e: any) {
    return { error: `Lỗi thống kê tổ chuyên môn: ${e.message}` };
  }
}

// 2.4 Tiêu chí có điểm thấp nhất có tần số xuất hiện nhiều nhất và Tiêu chí có điểm cao nhất thường xuyên nhất
export async function getCriteriaExtremeFrequencies() {
  try {
    const evals = await prisma.observationEvaluation.findMany({
      where: {
        totalScore: { not: null }
      }
    });

    if (evals.length === 0) return { error: "Không tìm thấy dữ liệu đánh giá để thống kê." };

    const maxScores = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
    const criteriaLabels = [
      "Yêu cầu 1 (Chuẩn bị giáo án/bài dạy)",
      "Yêu cầu 2 (Sử dụng đồ dùng/học liệu)",
      "Yêu cầu 3 (Nội dung bài dạy chính xác)",
      "Yêu cầu 4 (Bảo đảm tính hệ thống, trọng tâm)",
      "Yêu cầu 5 (Nội dung liên hệ thực tế)",
      "Yêu cầu 6 (Khắc phục đọc chép, hỗ trợ HS)",
      "Yêu cầu 7 (Tổ chức hoạt động học tích cực, nhóm)",
      "Yêu cầu 8 (Phân phối thời gian, củng cố)",
      "Yêu cầu 9 (Kết hợp phương pháp đa dạng)",
      "Yêu cầu 10 (Kiểm tra đánh giá kết quả)",
      "Yêu cầu 11 (Tiết dạy nhuần nhuyễn, sáng tạo)"
    ];

    const lowestFreq: Record<number, number> = {};
    const highestFreq: Record<number, number> = {};

    evals.forEach(e => {
      let minRatio = 1.1;
      let maxRatio = -0.1;
      let minIdx = -1;
      let maxIdx = -1;

      for (let i = 1; i <= 11; i++) {
        const scoreKey = `score${i}` as keyof typeof e;
        const val = e[scoreKey];
        if (val === null || val === undefined) continue;

        const ratio = Number(val) / maxScores[i - 1];

        if (ratio < minRatio) {
          minRatio = ratio;
          minIdx = i;
        }
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxIdx = i;
        }
      }

      if (minIdx !== -1) lowestFreq[minIdx] = (lowestFreq[minIdx] || 0) + 1;
      if (maxIdx !== -1) highestFreq[maxIdx] = (highestFreq[maxIdx] || 0) + 1;
    });

    let maxLowCount = 0;
    let mostFreqLowIdx = 1;
    Object.entries(lowestFreq).forEach(([idx, count]) => {
      if (count > maxLowCount) {
        maxLowCount = count;
        mostFreqLowIdx = Number(idx);
      }
    });

    let maxHighCount = 0;
    let mostFreqHighIdx = 1;
    Object.entries(highestFreq).forEach(([idx, count]) => {
      if (count > maxHighCount) {
        maxHighCount = count;
        mostFreqHighIdx = Number(idx);
      }
    });

    return {
      success: true,
      totalEvaluations: evals.length,
      lowestCriterion: {
        index: mostFreqLowIdx,
        label: criteriaLabels[mostFreqLowIdx - 1],
        count: maxLowCount
      },
      highestCriterion: {
        index: mostFreqHighIdx,
        label: criteriaLabels[mostFreqHighIdx - 1],
        count: maxHighCount
      }
    };
  } catch (e: any) {
    return { error: `Lỗi thống kê tiêu chí cực đoan: ${e.message}` };
  }
}
