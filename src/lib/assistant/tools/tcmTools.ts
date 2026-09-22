// @ts-nocheck
import { prisma } from "@/lib/db";

/**
 * Lấy danh sách Giáo viên trong các Tổ chuyên môn thuộc phạm vi phân quyền (TTCM hoặc TBP)
 */
export async function getTCMTeachers(scopedDeptIds: string[] | null, keyword?: string) {
  try {
    const whereTeacher: any = { status: "ACTIVE" };

    if (Array.isArray(scopedDeptIds)) {
      if (scopedDeptIds.length === 0) {
        return {
          success: true,
          totalTeachers: 0,
          teachers: [],
          message: "Thầy/Cô chưa được phân công phụ trách Tổ Chuyên Môn nào."
        };
      }
      whereTeacher.OR = [
        { departmentId: { in: scopedDeptIds } },
        { departmentAssignments: { some: { departmentId: { in: scopedDeptIds } } } }
      ];
    }

    if (keyword) {
      const q = keyword.toLowerCase().trim();
      whereTeacher.AND = [
        {
          OR: [
            { teacherName: { contains: q } },
            { teacherCode: { contains: q } }
          ]
        }
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where: whereTeacher,
      include: {
        departmentRel: true,
        mainSubjectRel: true,
        campus: true
      },
      orderBy: { teacherName: "asc" }
    });

    const teacherList = teachers.map(t => ({
      teacherId: t.id,
      teacherCode: t.teacherCode,
      teacherName: t.teacherName,
      departmentName: t.departmentRel?.name || "Chưa xếp tổ",
      mainSubject: t.mainSubjectRel?.subjectName || "Chưa gán",
      homeroomClass: t.homeroomClass || "Không chủ nhiệm",
      campusName: t.campus?.campusName || "Chưa rõ"
    }));

    return {
      success: true,
      totalTeachers: teacherList.length,
      teachers: teacherList
    };
  } catch (error: any) {
    console.error("Error in getTCMTeachers:", error);
    return { error: `Lỗi truy xuất danh sách giáo viên tổ chuyên môn: ${error.message}` };
  }
}

/**
 * Thống kê chất lượng môn học (Tiến độ vào điểm, Phổ điểm, Benchmark) thuộc các TCM được phân quyền
 */
export async function getTCMSubjectQuality(
  scopedDeptIds: string[] | null,
  subjectQuery?: string
) {
  try {
    // 1. Xác định danh sách môn học thuộc các TCM được phân quyền
    let subjectIds: string[] = [];

    // Lấy các giáo viên trong các TCM này
    const whereTeacher: any = { status: "ACTIVE" };
    if (Array.isArray(scopedDeptIds)) {
      if (scopedDeptIds.length === 0) {
        return {
          success: true,
          departmentsCount: 0,
          subjects: [],
          message: "Thầy/Cô chưa được phân công phụ trách Tổ Chuyên Môn nào."
        };
      }
      whereTeacher.OR = [
        { departmentId: { in: scopedDeptIds } },
        { departmentAssignments: { some: { departmentId: { in: scopedDeptIds } } } }
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where: whereTeacher,
      select: { id: true, mainSubjectId: true }
    });

    const teacherIds = teachers.map(t => t.id);
    const mainSubjectIds = teachers.map(t => t.mainSubjectId).filter(Boolean) as string[];

    // Lấy môn từ TeachingAssignment của các giáo viên thuộc TCM
    const assignments = await prisma.teachingAssignment.findMany({
      where: { teacherId: { in: teacherIds } },
      select: { subjectId: true },
      distinct: ["subjectId"]
    });

    const assignedSubjectIds = assignments.map(a => a.subjectId);
    const allSubjectIds = Array.from(new Set([...mainSubjectIds, ...assignedSubjectIds]));

    const whereSubject: any = {
      status: "ACTIVE"
    };

    if (allSubjectIds.length > 0) {
      whereSubject.id = { in: allSubjectIds };
    } else if (scopedDeptIds !== null) {
      return {
        success: true,
        subjectsCount: 0,
        subjects: [],
        message: "Chưa ghi nhận môn học nào được phân công cho các Tổ Chuyên Môn Thầy/Cô quản lý."
      };
    }

    if (subjectQuery) {
      whereSubject.OR = [
        { subjectName: { contains: subjectQuery } },
        { subjectCode: { contains: subjectQuery } }
      ];
    }

    const subjects = await prisma.subject.findMany({
      where: whereSubject,
      select: { id: true, subjectCode: true, subjectName: true, level: true },
      take: 10
    });

    // 2. Thống kê chất lượng từng môn
    const subjectStats = await Promise.all(
      subjects.map(async s => {
        const entries = await prisma.subjectGradeEntry.findMany({
          where: { subjectId: s.id },
          include: {
            student: {
              include: { class: true }
            }
          }
        });

        const benchmarkReq = s.level === "Tieu hoc" ? 7.0 : 6.0;
        const totalEvaluated = entries.length;
        const scores = entries
          .map(e => e.compositeScore)
          .filter((sc): sc is number => typeof sc === "number");

        const avgScore = scores.length > 0
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
          : "Chưa có";

        const underBenchmark = entries.filter(
          e => typeof e.compositeScore === "number" && e.compositeScore < benchmarkReq
        );

        const passRate = scores.length > 0
          ? `${(((scores.length - underBenchmark.length) / scores.length) * 100).toFixed(1)}%`
          : "N/A";

        return {
          subjectId: s.id,
          subjectCode: s.subjectCode,
          subjectName: s.subjectName,
          benchmarkStandard: benchmarkReq,
          totalEntries: totalEvaluated,
          averageScore: avgScore,
          passRate,
          underBenchmarkCount: underBenchmark.length,
          sampleUnderBenchmark: underBenchmark.slice(0, 5).map(u => ({
            studentName: u.student?.studentName,
            studentCode: u.student?.studentCode,
            className: u.student?.class?.className,
            score: u.compositeScore
          }))
        };
      })
    );

    return {
      success: true,
      totalSubjects: subjectStats.length,
      subjects: subjectStats
    };
  } catch (error: any) {
    console.error("Error in getTCMSubjectQuality:", error);
    return { error: `Lỗi thống kê chất lượng môn học của Tổ Chuyên Môn: ${error.message}` };
  }
}

/**
 * Giám sát hoạt động dạy & dự giờ của Giáo viên thuộc phạm vi Tổ Chuyên Môn
 */
export async function getTCMObservationMonitoring(scopedDeptIds: string[] | null) {
  try {
    const whereDept: any = { status: "ACTIVE" };
    if (Array.isArray(scopedDeptIds)) {
      if (scopedDeptIds.length === 0) {
        return {
          success: true,
          departmentsCount: 0,
          departments: [],
          message: "Thầy/Cô chưa được phân công phụ trách Tổ Chuyên Môn nào."
        };
      }
      whereDept.id = { in: scopedDeptIds };
    }

    const departments = await prisma.department.findMany({
      where: whereDept,
      include: {
        teachers: {
          where: { status: "ACTIVE" },
          select: { id: true, teacherName: true, teacherCode: true }
        }
      }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const deptSummaries = await Promise.all(
      departments.map(async d => {
        const teacherIds = d.teachers.map(t => t.id);
        const totalTeachers = teacherIds.length;

        // Số tiết dạy của TCM trong tháng
        const taughtSlots = await prisma.observationSlot.count({
          where: {
            teacherId: { in: teacherIds },
            date: { gte: startOfMonth, lte: endOfMonth }
          }
        });

        // Thống kê từng giáo viên: đã dự bao nhiêu tiết
        const teacherObsStats = await Promise.all(
          d.teachers.map(async t => {
            const observedCount = await prisma.observationRegistration.count({
              where: {
                teacherId: t.id,
                isApproved: true,
                evaluation: { isNot: null },
                slot: { date: { gte: startOfMonth, lte: endOfMonth } }
              }
            });

            return {
              teacherName: t.teacherName,
              teacherCode: t.teacherCode,
              observedCount,
              targetQuota: 2,
              isCompleted: observedCount >= 2,
              remaining: Math.max(0, 2 - observedCount)
            };
          })
        );

        const totalObserved = teacherObsStats.reduce((sum, t) => sum + t.observedCount, 0);
        const targetRequired = totalTeachers * 2;
        const pendingTeachers = teacherObsStats.filter(t => !t.isCompleted);

        return {
          departmentId: d.id,
          departmentName: d.name,
          divisionCode: d.divisionCode || "Chung",
          totalTeachers,
          taughtSlotsCount: taughtSlots,
          observedCount: totalObserved,
          targetRequired,
          completionRate: targetRequired > 0 ? `${((totalObserved / targetRequired) * 100).toFixed(1)}%` : "0%",
          pendingTeachersCount: pendingTeachers.length,
          pendingTeachers: pendingTeachers.map(p => `${p.teacherName} (Đã dự ${p.observedCount}/2 tiết)`)
        };
      })
    );

    return {
      success: true,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalDepartments: deptSummaries.length,
      departments: deptSummaries
    };
  } catch (error: any) {
    console.error("Error in getTCMObservationMonitoring:", error);
    return { error: `Lỗi theo dõi dự giờ tổ chuyên môn: ${error.message}` };
  }
}
