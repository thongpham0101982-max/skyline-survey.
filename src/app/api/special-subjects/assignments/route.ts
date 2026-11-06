import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendAssignmentNotificationEmails } from "@/lib/special-subjects/assignment-mail";
import { getSpecialSubjectGrades, isGradeApplicableForSubject } from "@/lib/specialSubjectsPortfolio";

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
    const educationSystem = searchParams.get("educationSystem");
    const versionCodeParam = searchParams.get("versionCode") || "v1.0";
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
    if (educationSystem && educationSystem !== "ALL") {
      where.class = { ...(where.class || {}), educationSystem };
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
            educationSystem: true,
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

    // Resolve active subject code and allowed grades
    let activeSubjectCode = subjectCode ? subjectCode.toUpperCase().trim() : "";
    if (!activeSubjectCode && subjectId && subjectId !== "ALL") {
      const sRec = await (prisma as any).specialSubject.findUnique({
        where: { id: subjectId },
        select: { code: true }
      });
      activeSubjectCode = (sRec?.code || "").toUpperCase().trim();
    }
    const allowedSubjectGrades = activeSubjectCode ? getSpecialSubjectGrades(activeSubjectCode) : null;

    // Requirement 2 & Grade validation: Lọc phân công theo đúng khối quy định của môn học
    const filteredAssignments = assignments.filter((a: any) => {
      const aGrade = String(a.class?.grade || "").replace(/\D/g, "");
      if (allowedSubjectGrades && !allowedSubjectGrades.includes(aGrade)) {
        return false;
      }
      if (a.subject?.code === "FIN_EDU" && aGrade === "1") {
        const eduSys = String(a.class?.educationSystem || "HNS").toUpperCase().trim();
        return eduSys === "HNS" || eduSys === "S";
      }
      return true;
    });

    const enrichedAssignments = filteredAssignments.map((a: any) => {
      const gvcn = a.class.homeroomTeacherId ? gvcnMap.get(a.class.homeroomTeacherId) : null;
      const isGvcn = a.teacherId === a.class.homeroomTeacherId;
      const gNum = parseInt(String(a.class.grade || "1"), 10) || 1;
      const eduSys = String(a.class.educationSystem || "HNS").toUpperCase().trim();
      const programCode =
        a.subject?.code === "FIN_EDU" && gNum >= 1 && gNum <= 5
          ? `TC0${gNum}S`
          : a.subject?.code === "FIN_EDU"
          ? `TC0${gNum}`
          : `${a.subject?.code || "SUB"}_K${gNum}`;
      return {
        ...a,
        isGvcn,
        educationSystem: eduSys,
        programCode,
        versionCode: versionCodeParam,
        homeroomTeacher: gvcn || null
      };
    });

    // Also find unassigned classes strictly within current filter and subject's allowed grades
    const assignedClassIds = new Set(enrichedAssignments.map((a: any) => a.classId));
    const unassignedWhere: any = {
      status: "ACTIVE",
      academicYearId,
      grade:
        grade && grade !== "ALL"
          ? grade
          : allowedSubjectGrades
          ? { in: allowedSubjectGrades }
          : undefined,
      educationSystem: educationSystem && educationSystem !== "ALL" ? educationSystem : undefined,
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
        educationSystem: true,
        campusId: true,
        homeroomTeacherId: true,
        campus: { select: { campusCode: true, campusName: true } }
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }]
    });

    const unassignedClassesFiltered = unassignedClassesRaw.filter(c => {
      const cGrade = String(c.grade || "").replace(/\D/g, "");
      if (allowedSubjectGrades && !allowedSubjectGrades.includes(cGrade)) return false;
      if (activeSubjectCode === "FIN_EDU" && cGrade === "1") {
        const eduSys = String(c.educationSystem || "HNS").toUpperCase().trim();
        return eduSys === "HNS" || eduSys === "S";
      }
      return true;
    });

    const unassignedGvcnIds = Array.from(new Set(unassignedClassesFiltered.map(c => c.homeroomTeacherId).filter(Boolean))) as string[];
    const unassignedGvcns = await prisma.teacher.findMany({
      where: { id: { in: unassignedGvcnIds } },
      select: { id: true, teacherCode: true, teacherName: true, email: true, phone: true }
    });
    const unassignedGvcnMap = new Map(unassignedGvcns.map(t => [t.id, t]));

    const unassignedClasses = unassignedClassesFiltered.map(c => ({
      ...c,
      homeroomTeacher: c.homeroomTeacherId ? unassignedGvcnMap.get(c.homeroomTeacherId) || null : null
    }));

    return NextResponse.json({ 
      assignments: enrichedAssignments,
      assignedSubjects,
      unassignedClasses,
      academicYearId,
      versionCode: versionCodeParam,
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
      educationSystem,
      versionCode = "v1.0",
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

    // Helper: Upsert assignment in-place to preserve existing SpecialGradeEntry history
    async function upsertClassAssignment(targetClassId: string, targetTeacherId: string) {
      const existing = await (prisma as any).specialTeachingAssignment.findFirst({
        where: {
          subjectId,
          classId: targetClassId,
          academicYearId,
          semester
        }
      });

      if (existing) {
        return await (prisma as any).specialTeachingAssignment.update({
          where: { id: existing.id },
          data: {
            teacherId: targetTeacherId,
            isLeadTeacher: true,
            status: "ACTIVE"
          }
        });
      }

      return await (prisma as any).specialTeachingAssignment.create({
        data: {
          subjectId,
          teacherId: targetTeacherId,
          classId: targetClassId,
          academicYearId,
          semester,
          isLeadTeacher: true,
          status: "ACTIVE"
        }
      });
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
          select: { id: true, className: true, grade: true, educationSystem: true, homeroomTeacherId: true }
        });
      } else {
        targetClasses = await prisma.class.findMany({
          where: {
            status: "ACTIVE",
            academicYearId,
            grade: grade && grade !== "ALL" ? grade : { in: defaultSubjectGrades },
            educationSystem: educationSystem && educationSystem !== "ALL" ? educationSystem : undefined,
            campusId: campusId && campusId !== "ALL" ? campusId : undefined
          },
          select: { id: true, className: true, grade: true, educationSystem: true, homeroomTeacherId: true }
        });
      }

      if (targetClasses.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy lớp học phù hợp với bộ lọc để phân công" }, { status: 400 });
      }

      const assignedResults = [];
      const skippedClasses = [];
      const skippedNonSystemSClasses = [];
      const skippedWrongGradeClasses = [];

      for (const cls of targetClasses) {
        const clsGrade = String(cls.grade || "").replace(/\D/g, "");
        const clsEduSys = String(cls.educationSystem || "HNS").toUpperCase().trim();
        // Quy tắc cốt lõi: Chỉ gán môn học đặc thù đúng theo khối quy định
        if (!defaultSubjectGrades.includes(clsGrade)) {
          skippedWrongGradeClasses.push(`${cls.className} (Khối ${clsGrade})`);
          continue;
        }

        // Requirement 2: Môn Giáo dục Tài chính cá nhân Khối 1 (TC01S) chỉ áp dụng cho Hệ đào tạo S (HNS).
        if (subjCodeUpper === "FIN_EDU" && clsGrade === "1" && clsEduSys !== "HNS" && clsEduSys !== "S") {
          skippedNonSystemSClasses.push(`${cls.className} (Hệ ${clsEduSys})`);
          continue;
        }

        if (!cls.homeroomTeacherId) {
          skippedClasses.push(cls.className);
          continue;
        }

        const upserted = await upsertClassAssignment(cls.id, cls.homeroomTeacherId);
        assignedResults.push(upserted);
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
        versionCode,
        message: `Đã phân công thành công ${assignedResults.length} lớp (Phiên bản ${versionCode}) cho Giáo viên Chủ nhiệm (GVCN)${emailNotice}` + 
                 (skippedClasses.length > 0 ? ` (Bỏ qua ${skippedClasses.length} lớp chưa có GVCN: ${skippedClasses.join(", ")})` : "") +
                 (skippedWrongGradeClasses.length > 0 ? ` (Bỏ qua ${skippedWrongGradeClasses.length} lớp không thuộc khối của môn: ${skippedWrongGradeClasses.join(", ")})` : "") +
                 (skippedNonSystemSClasses.length > 0 ? ` (Không tự động áp dụng TC01S cho ${skippedNonSystemSClasses.length} lớp ngoài Hệ S: ${skippedNonSystemSClasses.join(", ")})` : ""),
        assignedCount: assignedResults.length,
        skippedCount: skippedClasses.length,
        skippedWrongGradeCount: skippedWrongGradeClasses.length,
        skippedNonSystemSCount: skippedNonSystemSClasses.length
      });
    }

    // =========================================================================
    // MODE 2: Manual Specific Teacher Assignment
    // =========================================================================
    if (!teacherId || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin phân công (giáo viên hoặc danh sách lớp)" }, { status: 400 });
    }

    const selectedClassRecords = await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, className: true, grade: true, educationSystem: true }
    });
    const classRecordMap = new Map(selectedClassRecords.map(c => [c.id, c]));

    const results = [];
    for (const classId of classIds) {
      const clsInfo = classRecordMap.get(classId);
      if (clsInfo) {
        const clsGrade = String(clsInfo.grade || "").replace(/\D/g, "");
        // Quy tắc cốt lõi: Chỉ gán môn học đặc thù đúng theo khối quy định
        if (!defaultSubjectGrades.includes(clsGrade)) {
          return NextResponse.json({
            error: `Lớp ${clsInfo.className} thuộc Khối ${clsGrade}. Môn ${subjCodeUpper} chỉ áp dụng cho các khối: ${defaultSubjectGrades.join(", ")}.`
          }, { status: 400 });
        }
        if (subjCodeUpper === "FIN_EDU" && clsGrade === "1") {
          const eduSys = String(clsInfo.educationSystem || "HNS").toUpperCase().trim();
          if (eduSys !== "HNS" && eduSys !== "S") {
            return NextResponse.json({
              error: `Lớp ${clsInfo.className} thuộc hệ đào tạo ${eduSys}. Chương trình Giáo dục Tài chính cá nhân Khối 1 (TC01S) hiện chỉ áp dụng cho Hệ đào tạo S (HNS).`
            }, { status: 400 });
          }
        }
      }

      const assignment = await upsertClassAssignment(classId, teacherId);
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
