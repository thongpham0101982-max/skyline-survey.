// @ts-nocheck
import { prisma } from "@/lib/db";

/**
 * Tra cứu bảng điểm chi tiết của học sinh (đã được xác thực qua studentId)
 */
export async function getStudentGrades(studentId: string, subjectNameFilter?: string, evaluationPeriod?: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        academicYear: true
      }
    });

    if (!student) {
      return { error: "Không tìm thấy thông tin hồ sơ học sinh." };
    }

    const whereClause: any = {
      studentId: student.id,
      academicYearId: student.academicYearId
    };

    if (evaluationPeriod && evaluationPeriod !== "ALL") {
      whereClause.evaluationPeriod = evaluationPeriod;
    }

    const gradeEntries = await prisma.subjectGradeEntry.findMany({
      where: whereClause,
      include: {
        subject: true
      },
      orderBy: { updatedAt: "desc" }
    });

    let filtered = gradeEntries;
    if (subjectNameFilter) {
      const q = subjectNameFilter.toLowerCase().trim();
      filtered = gradeEntries.filter(g =>
        g.subject?.name?.toLowerCase().includes(q) ||
        g.subject?.code?.toLowerCase().includes(q)
      );
    }

    const subjectsSummary = filtered.map(g => {
      let parsedComponents = null;
      try {
        parsedComponents = g.componentScores ? JSON.parse(g.componentScores) : null;
      } catch {
        parsedComponents = g.componentScores;
      }

      return {
        subjectName: g.subject?.name || "Môn học",
        subjectCode: g.subject?.code || "",
        period: g.evaluationPeriod,
        compositeScore: g.compositeScore,
        componentScores: parsedComponents,
        teacherRemark: g.remark || "Chưa có nhận xét"
      };
    });

    return {
      success: true,
      studentName: student.studentName,
      studentCode: student.studentCode,
      className: student.class?.className || "Chưa xếp lớp",
      academicYear: student.academicYear?.name || "",
      totalSubjects: subjectsSummary.length,
      grades: subjectsSummary
    };
  } catch (error: any) {
    console.error("Error in getStudentGrades:", error);
    return { error: `Lỗi truy xuất điểm: ${error.message}` };
  }
}

/**
 * Tra cứu đánh giá năng lực môn học & dữ liệu Radar năng lực của học sinh
 */
export async function getStudentCompetencies(studentId: string, subjectFilter?: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) return { error: "Không tìm thấy hồ sơ học sinh." };

    const summaries = await prisma.studentSubjectCompetencySummary.findMany({
      where: {
        studentId: student.id,
        academicYearId: student.academicYearId
      },
      include: { subject: true },
      orderBy: { updatedAt: "desc" }
    });

    let filtered = summaries;
    if (subjectFilter) {
      const q = subjectFilter.toLowerCase();
      filtered = summaries.filter(s => s.subject?.name?.toLowerCase().includes(q));
    }

    const result = filtered.map(s => {
      let radar = null;
      try {
        radar = s.radarData ? JSON.parse(s.radarData) : null;
      } catch {
        radar = s.radarData;
      }
      return {
        subject: s.subject?.name,
        subjectScore: s.subjectScore,
        evaluatedCount: s.evaluatedCount,
        totalCompetencies: s.totalCompetencies,
        period: s.assessmentPeriod,
        radarPoints: radar
      };
    });

    return {
      success: true,
      studentName: student.studentName,
      competencies: result
    };
  } catch (error: any) {
    console.error("Error in getStudentCompetencies:", error);
    return { error: `Lỗi truy xuất năng lực: ${error.message}` };
  }
}

/**
 * Tra cứu Sổ mục tiêu SMART, hành động và kế hoạch 7 ngày gỡ rào cản
 */
export async function getStudentGoalsAndPlans(studentId: string, statusFilter?: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) return { error: "Không tìm thấy hồ sơ học sinh." };

    const whereClause: any = {
      studentId: student.id,
      academicYearId: student.academicYearId
    };

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const goals = await prisma.studentGoal.findMany({
      where: whereClause,
      include: {
        actions: true,
        unlocks: true
      },
      orderBy: { createdAt: "desc" }
    });

    const parsedGoals = goals.map(g => ({
      id: g.id,
      category: g.category,
      targetText: g.targetText,
      achievementLevel: g.achievementLevel,
      status: g.status,
      semester: g.semester,
      teacherComment: g.teacherComment,
      parentMessage: g.parentMessage,
      actions: g.actions.map(a => ({
        actionText: a.actionText,
        status: a.status,
        deadline: a.deadline ? a.deadline.toLocaleDateString("vi-VN") : null
      })),
      sevenDayUnlocks: g.unlocks.map(u => ({
        targetText: u.targetText,
        barrier: u.barriers,
        sevenDayAction: u.sevenDayAction,
        status: u.status,
        teacherNotes: u.teacherSupportNotes
      }))
    }));

    return {
      success: true,
      studentName: student.studentName,
      totalGoals: parsedGoals.length,
      goals: parsedGoals
    };
  } catch (error: any) {
    console.error("Error in getStudentGoalsAndPlans:", error);
    return { error: `Lỗi truy xuất mục tiêu: ${error.message}` };
  }
}

/**
 * Tra cứu Thời khóa biểu của học sinh trong tuần
 */
export async function getStudentTimetable(studentId: string, dayOfWeek?: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    });

    if (!student || !student.classId) {
      return { error: "Không tìm thấy lớp học của học sinh." };
    }

    const whereClause: any = {
      classId: student.classId,
      status: "ACTIVE"
    };

    if (dayOfWeek) {
      whereClause.dayOfWeek = dayOfWeek;
    }

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      orderBy: [
        { dayOfWeek: "asc" },
        { session: "asc" },
        { periodNumber: "asc" }
      ]
    });

    return {
      success: true,
      className: student.class?.className,
      studentName: student.studentName,
      slots: slots.map(s => ({
        dayOfWeek: s.dayOfWeek,
        session: s.session === "MORNING" ? "Sáng" : "Chiều",
        periodNumber: s.periodNumber,
        subjectName: s.subjectName || "Chưa xếp",
        teacherName: s.teacherName || "Chưa xếp"
      }))
    };
  } catch (error: any) {
    console.error("Error in getStudentTimetable:", error);
    return { error: `Lỗi truy xuất thời khóa biểu: ${error.message}` };
  }
}

/**
 * Tra cứu Nhật ký cố vấn học tập & trạng thái yêu cầu hỗ trợ của học sinh
 */
export async function getStudentAdvisoryNotes(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) return { error: "Không tìm thấy học sinh." };

    const logs = await prisma.academicConsultationLog.findMany({
      where: { studentId: student.id },
      include: { teacher: true },
      orderBy: { meetingDate: "desc" },
      take: 5
    });

    const requests = await prisma.studentHelpRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    return {
      success: true,
      studentName: student.studentName,
      consultationLogs: logs.map(l => ({
        teacherName: l.teacher?.teacherName,
        meetingDate: l.meetingDate.toLocaleDateString("vi-VN"),
        content: l.content,
        difficulties: l.difficulties,
        nextActions: l.nextActions
      })),
      helpRequests: requests.map(r => ({
        category: r.category,
        content: r.content,
        urgency: r.urgency,
        status: r.status,
        teacherFeedback: r.responseNotes || "Đang chờ Thầy/Cô phản hồi"
      }))
    };
  } catch (error: any) {
    console.error("Error in getStudentAdvisoryNotes:", error);
    return { error: `Lỗi truy xuất thông tin cố vấn: ${error.message}` };
  }
}
