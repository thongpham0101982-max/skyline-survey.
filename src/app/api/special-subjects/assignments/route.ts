import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendAssignmentNotificationEmails } from "@/lib/special-subjects/assignment-mail";

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
    const subjectCode = searchParams.get("subjectCode");
    const classId = searchParams.get("classId");
    const grade = searchParams.get("grade");
    const departmentId = searchParams.get("departmentId");
    const teacherIdParam = searchParams.get("teacherId");
    const scope = (searchParams.get("scope") || "").toUpperCase();
    const isPersonalTeacherScope = scope === "TEACHER" || searchParams.get("personal") === "true";

    // Dynamic resolution of active academic year if not provided or set to 'ACTIVE' / 'CURRENT'
    if (!academicYearId || academicYearId === "ACTIVE" || academicYearId === "CURRENT") {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      });
      academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
    }

    const where: any = {
      academicYearId,
      status: "ACTIVE"
    };

    if (subjectId && subjectId !== "ALL") where.subjectId = subjectId;
    if (subjectCode && subjectCode !== "ALL") {
      where.subject = { code: subjectCode.toUpperCase().trim() };
    }
    if (classId && classId !== "ALL") where.classId = classId;
    if (departmentId && departmentId !== "ALL") {
      where.teacher = { ...(where.teacher || {}), departmentId };
    }

    // Scoping:
    // 1. When called from Teacher portal (scope=TEACHER / personal=true), strictly filter by the logged-in teacher's ID
    //    even if the teacher also holds a management position (QLCM, TTCM, TBP, GĐCS).
    if (isPersonalTeacherScope) {
      where.teacherId = session.teacherId || "__NO_TEACHER_PROFILE__";
      if (campusId && campusId !== "ALL") {
        where.class = { ...(where.class || {}), campusId };
      }
    } else if (teacherIdParam && teacherIdParam !== "ALL") {
      where.teacherId = teacherIdParam;
      if (campusId && campusId !== "ALL") {
        where.class = { ...(where.class || {}), campusId };
      }
    } else if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      where.teacherId = session.teacherId || "__NO_TEACHER_PROFILE__";
      if (campusId && campusId !== "ALL") {
        where.class = { ...(where.class || {}), campusId };
      }
    } else if (session.isGDCS && session.allowedCampusIds?.length > 0) {
      if (campusId && campusId !== "ALL" && session.allowedCampusIds.includes(campusId)) {
        where.class = { campusId };
      } else {
        where.class = { campusId: { in: session.allowedCampusIds } };
      }
    } else if (campusId && campusId !== "ALL") {
      where.class = { campusId };
    }

    if (grade && grade !== "ALL") {
      where.class = { ...(where.class || {}), grade };
    }

    // Also resolve all special subjects assigned to this teacher in the active academic year
    let assignedSubjects: Array<{ id: string; code: string; name: string }> = [];
    if (session.teacherId) {
      const teacherAllSubjectAssigns = await (prisma as any).specialTeachingAssignment.findMany({
        where: {
          academicYearId,
          teacherId: session.teacherId,
          status: "ACTIVE"
        },
        select: {
          subject: {
            select: { id: true, code: true, name: true }
          }
        }
      });
      const subjMap = new Map<string, { id: string; code: string; name: string }>();
      for (const item of teacherAllSubjectAssigns) {
        if (item.subject?.code && !subjMap.has(item.subject.code)) {
          subjMap.set(item.subject.code, item.subject);
        }
      }
      assignedSubjects = Array.from(subjMap.values());
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
          select: {
            id: true,
            teacherCode: true,
            teacherName: true,
            email: true,
            phone: true,
            departmentId: true,
            departmentRel: { select: { id: true, code: true, name: true } }
          }
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
      grade: grade && grade !== "ALL" ? grade : undefined,
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
      assignedSubjects,
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
      semester = 1,
      sendNotificationEmail = false
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

    const targetSubjectRecord = await (prisma as any).specialSubject.findUnique({
      where: { id: subjectId },
      select: { code: true }
    }).catch(() => null);
    const subjCodeUpper = (targetSubjectRecord?.code || "").toUpperCase();
    const defaultSubjectGrades =
      subjCodeUpper === "GDHN"
        ? ["6", "7", "8", "9", "10", "11", "12"]
        : subjCodeUpper === "GDGT"
        ? ["6", "7", "8", "9"]
        : ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

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
        // Find all classes matching campusId / grade filter in current academic year for this subject's grade range
        targetClasses = await prisma.class.findMany({
          where: {
            status: "ACTIVE",
            academicYearId,
            grade: grade && grade !== "ALL" ? grade : { in: defaultSubjectGrades },
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

      let emailNotice = "";
      if (sendNotificationEmail && assignedResults.length > 0) {
        try {
          const mailRes = await sendAssignmentNotificationEmails({
            assignmentIds: assignedResults.map(a => a.id),
            semester
          });
          if (mailRes.sentCount > 0) {
            emailNotice = ` và đã gửi email thông báo cho ${mailRes.sentCount} GV`;
          }
        } catch (e) {
          console.error("Auto email notification error:", e);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã phân công thành công ${assignedResults.length} lớp cho Giáo viên Chủ nhiệm (GVCN)${emailNotice}` + 
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

    let emailNotice = "";
    if (sendNotificationEmail && results.length > 0) {
      try {
        const mailRes = await sendAssignmentNotificationEmails({
          assignmentIds: results.map(a => a.id),
          semester
        });
        if (mailRes.sentCount > 0) {
          emailNotice = ` và đã gửi email thông báo cho ${mailRes.sentCount} GV`;
        }
      } catch (e) {
        console.error("Auto email notification error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã phân công thành công ${results.length} lớp học${emailNotice}`,
      assignedCount: results.length
    });
  } catch (error: any) {
    console.error("[SpecialAssignments POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Bạn không có quyền hiệu chỉnh phân công" }, { status: 403 });
    }

    const body = await req.json();
    const { id, teacherId, subjectId, sendNotificationEmail = false } = body;
    if (!id || !teacherId) {
      return NextResponse.json({ error: "Thiếu ID phân công hoặc giáo viên phụ trách" }, { status: 400 });
    }

    const updated = await (prisma as any).specialTeachingAssignment.update({
      where: { id },
      data: {
        teacherId,
        ...(subjectId ? { subjectId } : {})
      },
      include: {
        teacher: true,
        subject: true,
        class: true
      }
    });

    let emailNotice = "";
    if (sendNotificationEmail) {
      try {
        const mailRes = await sendAssignmentNotificationEmails({
          assignmentIds: [id],
          semester: updated.semester || 1
        });
        if (mailRes.sentCount > 0) {
          emailNotice = " và đã gửi email thông báo cho GV mới";
        }
      } catch (e) {
        console.error("Edit notification email error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật phân công thành công${emailNotice}`,
      assignment: updated
    });
  } catch (error: any) {
    console.error("[SpecialAssignments PUT Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi hiệu chỉnh phân công" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Không có quyền xóa phân công" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let ids: string[] = [];

    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      ids = idsParam.split(",").map(s => s.trim()).filter(Boolean);
    } else if (id) {
      ids = [id];
    } else {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          ids = body.ids;
        } else if (body.id) {
          ids = [body.id];
        }
      } catch {}
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "Thiếu ID phân công cần xóa" }, { status: 400 });
    }

    const deleteResult = await (prisma as any).specialTeachingAssignment.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công ${deleteResult.count} phân công`,
      count: deleteResult.count
    });
  } catch (error: any) {
    console.error("[SpecialAssignments DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
