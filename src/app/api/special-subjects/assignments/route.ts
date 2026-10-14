import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId");
    let academicYearId = searchParams.get("academicYearId");
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const grade = searchParams.get("grade");

    // Dynamic resolution of active academic year if not provided or set to 'ACTIVE' / 'CURRENT'
    if (!academicYearId || academicYearId === "ACTIVE" || academicYearId === "CURRENT") {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      });
      academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
    }

    const where: any = {
      academicYearId
    };

    if (subjectId && subjectId !== "ALL") where.subjectId = subjectId;
    if (classId && classId !== "ALL") where.classId = classId;

    // Scoping: If user is teacher without full access, restrict to teacher's assignments
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      if (session.teacherId) {
        where.teacherId = session.teacherId;
      }
    } else if (session.isGDCS && session.allowedCampusIds?.length > 0) {
      where.class = { campusId: { in: session.allowedCampusIds } };
    } else if (campusId && campusId !== "ALL") {
      where.class = { campusId };
    }

    if (grade && grade !== "ALL") {
      where.class = { ...(where.class || {}), grade };
    }

    const assignments = await (prisma as any).specialTeachingAssignment.findMany({
      where,
      orderBy: [
        { class: { campusId: "asc" } },
        { class: { grade: "asc" } },
        { class: { className: "asc" } }
      ],
      include: {
        subject: {
          select: { id: true, code: true, name: true, color: true }
        },
        teacher: {
          select: { id: true, teacherCode: true, teacherName: true, email: true, phone: true }
        },
        class: {
          select: { 
            id: true, 
            classCode: true, 
            className: true, 
            grade: true, 
            level: true, 
            campusId: true, 
            homeroomTeacherId: true,
            campus: { select: { campusCode: true, campusName: true } } 
          }
        },
        _count: {
          select: {
            gradeEntries: true,
            projectGroups: true
          }
        }
      }
    });

    // Resolve homeroom teacher details for all assigned classes
    const gvcnIds = Array.from(new Set(assignments.map((a: any) => a.class.homeroomTeacherId).filter(Boolean))) as string[];
    const gvcnTeachers = await prisma.teacher.findMany({
      where: { id: { in: gvcnIds } },
      select: { id: true, teacherCode: true, teacherName: true }
    });
    const gvcnMap = new Map(gvcnTeachers.map(t => [t.id, t]));

    const enrichedAssignments = assignments.map((a: any) => {
      const gvcn = a.class.homeroomTeacherId ? gvcnMap.get(a.class.homeroomTeacherId) : null;
      const isGvcn = a.teacherId === a.class.homeroomTeacherId;
      return {
        ...a,
        isGvcn,
        homeroomTeacher: gvcn || null
      };
    });

    // Also find unassigned primary classes in current filter scope
    const assignedClassIds = new Set(assignments.map((a: any) => a.classId));
    const unassignedWhere: any = {
      status: "ACTIVE",
      academicYearId,
      grade: grade && grade !== "ALL" ? grade : { in: ["1", "2", "3", "4", "5"] },
      campusId: campusId && campusId !== "ALL" ? campusId : undefined,
      id: { notIn: Array.from(assignedClassIds) }
    };

    const unassignedClassesRaw = await prisma.class.findMany({
      where: unassignedWhere,
      select: {
        id: true,
        classCode: true,
        className: true,
        grade: true,
        campusId: true,
        homeroomTeacherId: true,
        campus: { select: { campusCode: true, campusName: true } }
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }]
    });

    const unassignedGvcnIds = Array.from(new Set(unassignedClassesRaw.map(c => c.homeroomTeacherId).filter(Boolean))) as string[];
    const unassignedGvcns = await prisma.teacher.findMany({
      where: { id: { in: unassignedGvcnIds } },
      select: { id: true, teacherCode: true, teacherName: true, email: true, phone: true }
    });
    const unassignedGvcnMap = new Map(unassignedGvcns.map(t => [t.id, t]));

    const unassignedClasses = unassignedClassesRaw.map(c => ({
      ...c,
      homeroomTeacher: c.homeroomTeacherId ? unassignedGvcnMap.get(c.homeroomTeacherId) || null : null
    }));

    return NextResponse.json({ 
      assignments: enrichedAssignments,
      unassignedClasses,
      academicYearId,
      totalAssigned: enrichedAssignments.length,
      totalUnassigned: unassignedClasses.length
    });
  } catch (error: any) {
    console.error("[SpecialAssignments GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền phân công giảng dạy môn đặc thù" }, { status: 403 });
    }

    const body = await req.json();
    let { 
      mode, 
      subjectId, 
      teacherId, 
      classIds, 
      campusId, 
      grade, 
      academicYearId, 
      semester = 1 
    } = body;

    // Resolve active academic year if not supplied
    if (!academicYearId || academicYearId === "ACTIVE" || academicYearId === "CURRENT") {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      });
      academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
    }

    // Default subject to Financial Education (FIN_EDU) if not provided
    if (!subjectId) {
      const defaultSub = await (prisma as any).specialSubject.findFirst({
        where: { code: "FIN_EDU", status: "ACTIVE" }
      }) || await (prisma as any).specialSubject.findFirst({ where: { status: "ACTIVE" } });
      subjectId = defaultSub?.id;
    }

    if (!subjectId) {
      return NextResponse.json({ error: "Không tìm thấy môn học đặc thù để phân công" }, { status: 400 });
    }

    // =========================================================================
    // MODE 1: AUTO_GVCN - Phân công tự động theo GVCN của lớp
    // =========================================================================
    if (mode === "AUTO_GVCN" || mode === "ASSIGN_GVCN") {
      let targetClasses = [];

      if (classIds && Array.isArray(classIds) && classIds.length > 0) {
        targetClasses = await prisma.class.findMany({
          where: {
            id: { in: classIds },
            status: "ACTIVE"
          },
          select: { id: true, className: true, homeroomTeacherId: true }
        });
      } else {
        // Find all primary classes matching campusId / grade filter in current academic year
        targetClasses = await prisma.class.findMany({
          where: {
            status: "ACTIVE",
            academicYearId,
            grade: grade && grade !== "ALL" ? grade : { in: ["1", "2", "3", "4", "5"] },
            campusId: campusId && campusId !== "ALL" ? campusId : undefined
          },
          select: { id: true, className: true, homeroomTeacherId: true }
        });
      }

      if (targetClasses.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy lớp học phù hợp với bộ lọc để phân công" }, { status: 400 });
      }

      const assignedResults = [];
      const skippedClasses = [];

      for (const cls of targetClasses) {
        if (!cls.homeroomTeacherId) {
          skippedClasses.push(cls.className);
          continue;
        }

        // Delete any existing assignment for this class & subject in this semester to prevent duplicate conflict
        await (prisma as any).specialTeachingAssignment.deleteMany({
          where: {
            subjectId,
            classId: cls.id,
            academicYearId,
            semester
          }
        });

        // Create assignment for class's homeroom teacher
        const created = await (prisma as any).specialTeachingAssignment.create({
          data: {
            subjectId,
            teacherId: cls.homeroomTeacherId,
            classId: cls.id,
            academicYearId,
            semester,
            isLeadTeacher: true,
            status: "ACTIVE"
          }
        });
        assignedResults.push(created);
      }

      return NextResponse.json({
        success: true,
        message: `Đã phân công thành công ${assignedResults.length} lớp cho Giáo viên Chủ nhiệm (GVCN)` + 
                 (skippedClasses.length > 0 ? ` (Bỏ qua ${skippedClasses.length} lớp chưa có GVCN: ${skippedClasses.join(", ")})` : ""),
        assignedCount: assignedResults.length,
        skippedCount: skippedClasses.length
      });
    }

    // =========================================================================
    // MODE 2: Manual Specific Teacher Assignment
    // =========================================================================
    if (!teacherId || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin phân công (giáo viên hoặc danh sách lớp)" }, { status: 400 });
    }

    const results = [];
    for (const classId of classIds) {
      // Clear prior assignment for this class & subject in this semester to keep clean 1-to-1 mapping
      await (prisma as any).specialTeachingAssignment.deleteMany({
        where: {
          subjectId,
          classId,
          academicYearId,
          semester
        }
      });

      const assignment = await (prisma as any).specialTeachingAssignment.create({
        data: {
          subjectId,
          teacherId,
          classId,
          academicYearId,
          semester,
          isLeadTeacher: true,
          status: "ACTIVE"
        }
      });
      results.push(assignment);
    }

    return NextResponse.json({
      success: true,
      message: `Đã phân công thành công ${results.length} lớp học`,
      assignedCount: results.length
    });
  } catch (error: any) {
    console.error("[SpecialAssignments POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Không có quyền xóa phân công" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phân công" }, { status: 400 });
    }

    await (prisma as any).specialTeachingAssignment.deleteMany({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Đã hủy phân công" });
  } catch (error: any) {
    console.error("[SpecialAssignments DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
