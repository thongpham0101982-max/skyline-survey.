// @ts-nocheck
import { prisma } from "@/lib/db";

/**
 * Thống kê tiến độ hoàn thành sổ điểm toàn trường theo Cơ sở và Khối
 */
export async function getSchoolwideGradebookProgress(campusCode?: string, grade?: string) {
  try {
    const whereClass: any = { status: "ACTIVE" };
    if (grade && grade !== "ALL") whereClass.grade = grade;
    if (campusCode) {
      const campus = await prisma.campus.findFirst({
        where: { campusCode: { equals: campusCode, mode: "insensitive" } }
      });
      if (campus) whereClass.campusId = campus.id;
    }

    const classes = await prisma.class.findMany({
      where: whereClass,
      include: {
        campus: true,
        _count: {
          select: {
            students: { where: { status: "ACTIVE" } },
            subjectGradeEntries: true
          }
        }
      }
    });

    const totalClasses = classes.length;
    let totalStudents = 0;
    let totalEntries = 0;

    const classStats = classes.map(c => {
      const studentCount = c._count.students;
      const entriesCount = c._count.subjectGradeEntries;
      totalStudents += studentCount;
      totalEntries += entriesCount;

      return {
        className: c.className,
        campus: c.campus?.campusName,
        grade: c.grade,
        studentCount,
        entriesCount
      };
    });

    return {
      success: true,
      totalClasses,
      totalStudents,
      totalGradeEntries: totalEntries,
      campusFilter: campusCode || "Toàn trường",
      gradeFilter: grade || "Tất cả các khối",
      classesSummary: classStats.slice(0, 15) // Top 15 lớp biểu thị
    };
  } catch (error: any) {
    console.error("Error in getSchoolwideGradebookProgress:", error);
    return { error: `Lỗi thống kê tiến độ sổ điểm toàn trường: ${error.message}` };
  }
}

/**
 * Thống kê hoạt động dạy và dự giờ của các Tổ chuyên môn
 */
export async function getDepartmentObservationStats(deptName?: string) {
  try {
    const whereDept: any = {};
    if (deptName) {
      whereDept.name = { contains: deptName };
    }

    const departments = await prisma.department.findMany({
      where: whereDept,
      include: {
        teachers: {
          where: { status: "ACTIVE" },
          select: { id: true, teacherName: true }
        }
      }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const deptStats = await Promise.all(
      departments.map(async d => {
        const teacherIds = d.teachers.map(t => t.id);
        const totalTeachers = teacherIds.length;

        // Số tiết dạy trong tháng
        const taughtSlots = await prisma.observationSlot.count({
          where: {
            teacherId: { in: teacherIds },
            date: { gte: startOfMonth, lte: endOfMonth }
          }
        });

        // Số lượt dự giờ trong tháng
        const observedRegs = await prisma.observationRegistration.count({
          where: {
            teacherId: { in: teacherIds },
            isApproved: true,
            evaluation: { isNot: null },
            slot: { date: { gte: startOfMonth, lte: endOfMonth } }
          }
        });

        const targetRequired = totalTeachers * 2; // Chỉ tiêu 2 tiết/GV/tháng
        const rate = targetRequired > 0 ? `${((observedRegs / targetRequired) * 100).toFixed(1)}%` : "0%";

        return {
          departmentName: d.name,
          totalTeachers,
          taughtSlotsCount: taughtSlots,
          observedCount: observedRegs,
          targetRequired,
          completionRate: rate
        };
      })
    );

    return {
      success: true,
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear(),
      departments: deptStats
    };
  } catch (error: any) {
    console.error("Error in getDepartmentObservationStats:", error);
    return { error: `Lỗi thống kê hoạt động tổ chuyên môn: ${error.message}` };
  }
}

/**
 * Tổng hợp tình hình rủi ro học tập / chuyên cần (Cảnh báo Xanh - Vàng - Đỏ) trên toàn trường
 */
export async function getSystemAtRiskOverview(campusCode?: string) {
  try {
    const whereStatus: any = {};
    if (campusCode) {
      whereStatus.student = {
        campus: { campusCode: { equals: campusCode, mode: "insensitive" } }
      };
    }

    const statuses = await prisma.studentAdvisoryStatus.findMany({
      where: whereStatus,
      include: {
        student: {
          include: { class: true, campus: true }
        }
      }
    });

    const green = statuses.filter(s => s.statusColor === "GREEN").length;
    const yellow = statuses.filter(s => s.statusColor === "YELLOW").length;
    const red = statuses.filter(s => s.statusColor === "RED").length;
    const total = statuses.length;

    const urgentRedList = statuses
      .filter(s => s.statusColor === "RED")
      .map(s => ({
        studentName: s.student?.studentName,
        studentCode: s.student?.studentCode,
        className: s.student?.class?.className,
        campus: s.student?.campus?.campusName,
        reason: s.reasonCategory,
        detail: s.reasonDetail
      }))
      .slice(0, 10);

    return {
      success: true,
      totalTrackedStudents: total,
      greenCount: green,
      yellowCount: yellow,
      redCount: red,
      redAlertPercentage: total > 0 ? `${((red / total) * 100).toFixed(1)}%` : "0%",
      urgentCases: urgentRedList
    };
  } catch (error: any) {
    console.error("Error in getSystemAtRiskOverview:", error);
    return { error: `Lỗi tổng hợp cảnh báo nguy cơ toàn hệ thống: ${error.message}` };
  }
}

/**
 * Báo cáo chỉ số hài lòng Phụ huynh (NPS) toàn trường
 */
export async function getSchoolwideSurveyNPS() {
  try {
    const latestSummary = await prisma.summarySystem.findFirst({
      orderBy: { updatedAt: "desc" },
      include: {
        surveyPeriod: true
      }
    });

    if (!latestSummary) {
      return {
        success: true,
        message: "Chưa có kỳ khảo sát ý kiến PHHS nào được hoàn tất tổng hợp dữ liệu."
      };
    }

    return {
      success: true,
      surveyPeriodName: latestSummary.surveyPeriod?.name,
      totalStudentsTarget: latestSummary.totalStudents,
      surveyedStudents: latestSummary.surveyedStudents,
      completionRate: `${latestSummary.completionRate.toFixed(1)}%`,
      averageSatisfactionScore: latestSummary.averageSatisfactionScore?.toFixed(2) || "Chưa tính",
      npsValue: latestSummary.npsValue?.toFixed(1) || "N/A",
      promoters: latestSummary.promoterCount,
      passives: latestSummary.passiveCount,
      detractors: latestSummary.detractorCount
    };
  } catch (error: any) {
    console.error("Error in getSchoolwideSurveyNPS:", error);
    return { error: `Lỗi lấy chỉ số NPS: ${error.message}` };
  }
}
