// @ts-nocheck
import { prisma } from "@/lib/db";

/**
 * Lấy danh sách các con em được liên kết với tài khoản Phụ huynh
 */
export async function getParentChildren(parentUserId: string) {
  try {
    const parent = await prisma.parent.findUnique({
      where: { userId: parentUserId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
                campus: true
              }
            }
          }
        }
      }
    });

    if (!parent) return { error: "Không tìm thấy hồ sơ phụ huynh." };

    const children = parent.students.map(link => ({
      studentId: link.student.id,
      studentCode: link.student.studentCode,
      studentName: link.student.studentName,
      className: link.student.class?.className || "Chưa rõ",
      campusName: link.student.campus?.campusName || "Chưa rõ",
      relationship: link.relationship || "Phụ huynh"
    }));

    return {
      success: true,
      parentName: parent.parentName,
      totalChildren: children.length,
      children
    };
  } catch (error: any) {
    console.error("Error in getParentChildren:", error);
    return { error: `Lỗi truy xuất danh sách con em: ${error.message}` };
  }
}

/**
 * Báo cáo kết quả học tập chi tiết của con em (kiểm tra phân quyền nghiêm ngặt)
 */
export async function getChildAcademicProgress(parentUserId: string, studentNameOrCode?: string) {
  try {
    const parent = await prisma.parent.findUnique({
      where: { userId: parentUserId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
                academicYear: true,
                subjectGradeEntries: {
                  include: { subject: true },
                  orderBy: { updatedAt: "desc" }
                }
              }
            }
          }
        }
      }
    });

    if (!parent || parent.students.length === 0) {
      return { error: "Không tìm thấy hồ sơ con em được liên kết với tài khoản của Quý Phụ huynh." };
    }

    // Chọn học sinh
    let targetStudent = parent.students[0].student;
    if (studentNameOrCode) {
      const q = studentNameOrCode.toLowerCase().trim();
      const match = parent.students.find(s =>
        s.student.studentName.toLowerCase().includes(q) ||
        s.student.studentCode.toLowerCase() === q
      );
      if (match) targetStudent = match.student;
    }

    const grades = targetStudent.subjectGradeEntries.map(g => ({
      subject: g.subject?.name,
      period: g.evaluationPeriod,
      compositeScore: g.compositeScore,
      teacherRemark: g.remark || "Chưa có nhận xét"
    }));

    const validScores = grades.filter(g => typeof g.compositeScore === "number").map(g => g.compositeScore as number);
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : "Đang cập nhật";

    return {
      success: true,
      studentName: targetStudent.studentName,
      studentCode: targetStudent.studentCode,
      className: targetStudent.class?.className,
      averageScore: avgScore,
      totalSubjectsEvaluated: grades.length,
      subjectDetails: grades
    };
  } catch (error: any) {
    console.error("Error in getChildAcademicProgress:", error);
    return { error: `Lỗi truy xuất tiến độ học tập của con: ${error.message}` };
  }
}

/**
 * Xem Sổ mục tiêu của con và ghi nhận từ Thầy/Cô cố vấn
 */
export async function getChildGoalsAndTeacherNotes(parentUserId: string, studentNameOrCode?: string) {
  try {
    const parent = await prisma.parent.findUnique({
      where: { userId: parentUserId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
                goals: {
                  include: { actions: true, unlocks: true },
                  orderBy: { createdAt: "desc" },
                  take: 5
                },
                consultationLogs: {
                  include: { teacher: true },
                  orderBy: { meetingDate: "desc" },
                  take: 3
                }
              }
            }
          }
        }
      }
    });

    if (!parent || parent.students.length === 0) {
      return { error: "Không tìm thấy hồ sơ con em của Quý Phụ huynh." };
    }

    let targetStudent = parent.students[0].student;
    if (studentNameOrCode) {
      const q = studentNameOrCode.toLowerCase();
      const match = parent.students.find(s =>
        s.student.studentName.toLowerCase().includes(q) ||
        s.student.studentCode.toLowerCase() === q
      );
      if (match) targetStudent = match.student;
    }

    const goals = targetStudent.goals.map(g => ({
      category: g.category,
      targetText: g.targetText,
      achievementLevel: g.achievementLevel,
      status: g.status,
      teacherComment: g.teacherComment,
      parentSupportRequest: g.parentSupportRequest || "Chưa có đề xuất cụ thể",
      actionsCount: g.actions.length,
      sevenDayPlan: g.unlocks.map(u => ({
        action: u.sevenDayAction,
        status: u.status,
        teacherSupportNotes: u.teacherSupportNotes
      }))
    }));

    const advisoryNotes = targetStudent.consultationLogs.map(l => ({
      teacherName: l.teacher?.teacherName,
      date: l.meetingDate.toLocaleDateString("vi-VN"),
      content: l.content,
      difficulties: l.difficulties,
      nextActions: l.nextActions
    }));

    return {
      success: true,
      studentName: targetStudent.studentName,
      className: targetStudent.class?.className,
      totalGoals: goals.length,
      goals,
      recentAdvisoryMeetings: advisoryNotes
    };
  } catch (error: any) {
    console.error("Error in getChildGoalsAndTeacherNotes:", error);
    return { error: `Lỗi truy xuất mục tiêu của con: ${error.message}` };
  }
}
