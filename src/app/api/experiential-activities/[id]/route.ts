import { sendExperientialActivityNotification } from "@/lib/experiential/email-notification";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasModulePermission } from "@/lib/permissions";
function parseDbJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let activity = await prisma.activityRecord.findUnique({
      where: { id },
      include: {
        catalog: true,
        academicYear: true,
        teacher: {
          include: { user: true }
        },
        participants: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!activity) {
      activity = await prisma.activityRecord.findFirst({
        where: { catalogId: id },
        include: {
          catalog: true,
          academicYear: true,
          teacher: {
            include: { user: true }
          },
          participants: {
            include: {
              student: {
                include: {
                  class: {
                    include: {
                      campus: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    if (!activity) {
      // Tìm trong ActivityCatalog nếu chưa có ActivityRecord
      const catalog = await prisma.activityCatalog.findUnique({
        where: { id },
        include: {
          group: true,
          type: true,
          theme: true
        }
      });

      if (!catalog) {
        return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
      }

      const catMeta = parseDbJson<any>(catalog.description, {});
      const evalCfg = catMeta.evaluationConfig || {};
      const isEvent = catMeta.activityCategory === 'HOAT_DONG_SU_KIEN';

      return NextResponse.json({
        id: catalog.id,
        code: catalog.code,
        name: catalog.name,
        academicYearId: catMeta.academicYearId || "",
        campusId: "",
        campusCode: "Toàn trường",
        campusName: "Toàn trường",
        selectedCampusIds: [],
        educationLevel: catMeta.educationLevels?.[0] || catalog.level || "PHO_THONG",
        activityCategory: catMeta.activityCategory || (isEvent ? 'HOAT_DONG_SU_KIEN' : 'TRAI_NGHIEM_DU_AN'),
        themeName: catMeta.themeName || "",
        deliverables: catMeta.deliverables || "",
        cthsTeachers: catMeta.cthsTeachers || [],
        evaluationConfig: evalCfg,
        grades: catMeta.grades || [],
        subjectId: null,
        subjectName: catMeta.primarySubjectName || null,
        date: "",
        timeRange: catMeta.timeFrame || "",
        location: catMeta.expectedLocation || "Theo kế hoạch",
        description: catMeta.notes || catMeta.educationalContent || "",
        objectives: catMeta.learningOutcomes || "",
        evidenceUrls: [],
        strand: "BAN_THAN",
        activityTypeId: isEvent ? "SU_KIEN" : "DU_AN",
        activityTypeName: isEvent ? "Hoạt động sự kiện" : "Trải nghiệm / Dự án",
        scale: "TOAN_TRUONG",
        evalMode: evalCfg.mode || (isEvent ? "ROLE_BASED" : "CRITERIA"),
        formulaType: evalCfg.formulaType === 'AVERAGE' ? 'EQUAL_WEIGHT' : 'WEIGHTED',
        criteria: evalCfg.criteria || [],
        thresholds: { outstanding: 85, good: 70, pass: 50 },
        mandatoryRules: [],
        hasRoleAssessment: true,
        rolesList: evalCfg.rolesList || [],
        completionBenchmark: evalCfg.completionBenchmark || '',
        status: "ASSIGNED",
        deadline: "",
        assignedClasses: [],
        emailSettings: null,
        creatorName: catMeta.cthsTeacherName || "BP HĐNGLL - Tổ CTHS",
        creatorEmail: catMeta.cthsTeacherEmail || null,
        creatorRole: "CTHS",
        creatorUserId: null,
        canManage: true,
        isMyCreated: true,
        students: []
      });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role || '';
    const upperRole = (userRole || '').toUpperCase().trim();
    const hasExpManageRead = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canRead");
    const hasExpManageUpdate = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canUpdate");
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS'].includes(upperRole) || hasExpManageRead;

    let teacherRecord: any = null;
    if (session?.user?.id) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    }

    const isMyCreated = !!(teacherRecord && (activity.teacherId === teacherRecord.id || activity.teacher?.userId === session?.user?.id));
    const canManage = isManagement || isMyCreated || hasExpManageUpdate;

    const catalogMeta = parseDbJson<any>(activity.catalog?.description, {});
    const meta = parseDbJson<any>(activity.locationId, {});

    // Determine activity category: ưu tiên meta -> catalogMeta -> evalMode
    const activityCategory = meta.activityCategory || catalogMeta.activityCategory || (meta.evalMode === 'ROLE_BASED' ? 'HOAT_DONG_SU_KIEN' : 'TRAI_NGHIEM_DU_AN');
    const themeName = meta.themeName || catalogMeta.themeName || "";
    const deliverables = meta.deliverables || catalogMeta.deliverables || "";
    const cthsTeachers = meta.cthsTeachers || catalogMeta.cthsTeachers || [];
    const evaluationConfig = meta.evaluationConfig || catalogMeta.evaluationConfig || null;

    // Parse students from participants
    const students = activity.participants.map((p) => {
      const pNote = parseDbJson<any>(p.note, {});
      return {
        id: p.studentId,
        participantId: p.id,
        studentCode: p.student.studentCode,
        fullName: p.student.studentName,
        classId: p.student.classId,
        className: p.student.class?.className || "",
        campusName: p.student.class?.campus?.campusName || "",
        attendance: pNote.attendance || (p.evalLevelId === "DAT" ? "PRESENT" : "PRESENT"),
        roles: pNote.roles || (p.roleId ? [p.roleId] : ["Thành viên"]),
        criteriaScores: pNote.criteriaScores || {},
        calculatedPercent: pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : null,
        finalResult: pNote.finalResult || "CHUA_DANH_GIA",
        remarksQuick: pNote.remarksQuick || [],
        remarksCustom: pNote.remarksCustom || "",
        isCompleted: pNote.finalResult && pNote.finalResult !== "CHUA_DANH_GIA"
      };
    });

    return NextResponse.json({
      id: activity.id,
      code: activity.code,
      name: activity.name,
      academicYearId: activity.academicYearId,
      campusId: meta.campusId || activity.organizerId || "",
      campusCode: meta.campusCode || "",
      campusName: meta.campusName || "",
      selectedCampusIds: meta.selectedCampusIds || (meta.campusId ? [meta.campusId] : []),
      educationLevel: meta.educationLevel || activity.levelId || "PHO_THONG",
      activityCategory,
      themeName,
      deliverables,
      cthsTeachers,
      evaluationConfig,
      grades: meta.grades || [],
      subjectId: meta.subjectId || null,
      subjectName: meta.subjectName || null,
      date: activity.date ? activity.date.toISOString().split("T")[0] : "",
      timeRange: meta.timeRange || "",
      location: meta.location || meta.locationText || "",
      description: meta.description || "",
      objectives: meta.objectives || "",
      evidenceUrls: meta.evidenceUrls || [],
      strand: meta.strand || "BAN_THAN",
      activityTypeId: meta.activityTypeId || "",
      activityTypeName: meta.activityTypeName || activity.catalog?.name || "",
      scale: meta.scale || activity.formatId || "KHOI",
      evalMode: meta.evalMode || "CRITERIA",
      formulaType: meta.formulaType || "EQUAL_WEIGHT",
      criteria: meta.criteria || [],
      thresholds: meta.thresholds || { outstanding: 85, good: 70, pass: 50 },
      mandatoryRules: meta.mandatoryRules || [],
      hasRoleAssessment: meta.hasRoleAssessment !== undefined ? meta.hasRoleAssessment : true,
      rolesList: meta.rolesList || [],
      completionBenchmark: meta.completionBenchmark || '',
      status: meta.status || activity.status || "ASSIGNED",
      deadline: meta.deadline || "",
      assignedClasses: meta.assignedClasses || [],
      emailSettings: meta.emailSettings || null,
      creatorName: meta.creatorName || activity.teacher?.teacherName || activity.teacher?.user?.fullName || null,
      creatorEmail: meta.creatorEmail || activity.teacher?.email || activity.teacher?.user?.email || null,
      creatorRole: meta.creatorRole || activity.teacher?.user?.role || null,
      creatorUserId: meta.creatorUserId || activity.teacher?.userId || null,
      canManage,
      isMyCreated,
      students
    });
  } catch (error: any) {
    console.error("GET /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    let existing = await prisma.activityRecord.findUnique({
      where: { id },
      include: { participants: true, teacher: true }
    });

    if (!existing) {
      existing = await prisma.activityRecord.findFirst({
        where: { catalogId: id },
        include: { participants: true, teacher: true }
      });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role || '';
    const upperRole = (userRole || '').toUpperCase().trim();
    const hasExpManageUpdate = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canUpdate");
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS', 'TEACHER', 'GV_MN', 'GVNN', 'GIAO_VIEN'].includes(upperRole) || hasExpManageUpdate;

    if (!existing) {
      // Trường hợp ID là từ ActivityCatalog và người dùng đang triển khai/phát hành từ Catalog
      const catalog = await prisma.activityCatalog.findUnique({
        where: { id }
      });

      if (!catalog) {
        return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
      }

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!isManagement) {
        return NextResponse.json({ error: "Bạn không có quyền triển khai hoặc hiệu chỉnh kế hoạch hoạt động này" }, { status: 403 });
      }

      let teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacher && session.user.email) {
        teacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              { email: session.user.email },
              { teacherCode: session.user.email },
              { teacherName: session.user.name || undefined }
            ]
          }
        });
        if (teacher && !teacher.userId) {
          await prisma.teacher.update({
            where: { id: teacher.id },
            data: { userId: session.user.id }
          });
        }
      }

      if (!teacher) {
        let defaultCampus = await prisma.campus.findFirst();
        if (!defaultCampus) {
          defaultCampus = await prisma.campus.create({
            data: { id: 'cs1', campusCode: 'CS1', campusName: 'Sky-Line Riverside (CS1)' }
          });
        }
        teacher = await prisma.teacher.create({
          data: {
            teacherCode: upperRole.includes('CTHS') ? `CTHS_${session.user.id.slice(-6)}` : `GV_${session.user.id.slice(-6)}`,
            teacherName: session.user.name || session.user.email || 'Cán bộ CTHS',
            email: session.user.email || '',
            user: { connect: { id: session.user.id } },
            campus: { connect: { id: defaultCampus.id } }
          }
        });
      }

      // Resolve valid AcademicYear
      let validAcademicYearId = body.academicYearId;
      if (!validAcademicYearId) {
        const catMeta = parseDbJson<any>(catalog.description, {});
        validAcademicYearId = catMeta.academicYearId;
      }
      if (!validAcademicYearId) {
        const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.academicYear.findFirst();
        validAcademicYearId = activeYear?.id || '';
      }

      // Record Code
      let recordCode = body.code || catalog.code;
      if (!recordCode || !recordCode.trim()) {
        recordCode = `HDTN-${Date.now().toString().slice(-6)}`;
      }
      const existingCode = await prisma.activityRecord.findUnique({ where: { code: recordCode } });
      if (existingCode) {
        recordCode = `${recordCode}-${Date.now().toString().slice(-4)}`;
      }

      const assignedClasses = body.assignedClasses || [];
      const actualCampusCodes = Array.from(new Set(
        assignedClasses.map((c: any) => {
          if (c.campusCode) return c.campusCode;
          if (c.className && c.className.includes('_')) return c.className.split('_').pop();
          return null;
        }).filter(Boolean)
      ));
      const actualGrades = Array.from(new Set(
        assignedClasses.map((c: any) => c.grade).filter(Boolean)
      ));

      const resolvedCampusCode = actualCampusCodes.length > 0 ? actualCampusCodes.join(', ') : (body.campusCode || '');
      const resolvedCampusName = actualCampusCodes.length > 0 ? actualCampusCodes.map((code: any) => `Sky-Line ${code}`).join(', ') : (body.campusName || '');
      const resolvedGrades = actualGrades.length > 0 ? actualGrades : (body.grades || []);

      const catMeta = parseDbJson<any>(catalog.description, {});

      const fullMetadata = {
        campusId: body.campusId || teacher.campusId || '',
        campusCode: resolvedCampusCode,
        campusName: resolvedCampusName,
        selectedCampusIds: body.selectedCampusIds || (actualCampusCodes.length > 0 ? actualCampusCodes : []),
        educationLevel: body.educationLevel || catalog.level || 'PHO_THONG',
        activityCategory: body.activityCategory || catMeta.activityCategory || 'TRAI_NGHIEM_DU_AN',
        themeName: body.themeName || catMeta.themeName || '',
        deliverables: body.deliverables || catMeta.deliverables || '',
        cthsTeachers: body.cthsTeachers || catMeta.cthsTeachers || [],
        evaluationConfig: body.evaluationConfig || catMeta.evaluationConfig || null,
        grades: resolvedGrades,
        creatorName: session.user.name || teacher.teacherName || session.user.email || 'Giáo viên',
        creatorEmail: session.user.email || teacher.email || '',
        creatorUserId: session.user.id,
        departmentId: body.departmentId || null,
        departmentName: body.departmentName || null,
        subjectId: body.subjectId || null,
        subjectName: body.subjectName || null,
        timeRange: body.timeRange || '',
        location: body.location || '',
        locationText: body.location || '',
        description: body.description || '',
        objectives: body.objectives || '',
        evidenceUrls: body.evidenceUrls || [],
        strand: body.strand || 'BAN_THAN',
        activityTypeId: body.activityTypeId || 'SU_KIEN',
        activityTypeName: body.activityTypeName || catalog.name || 'Hoạt động trải nghiệm',
        scale: body.scale || 'LOP',
        evalMode: body.evalMode || 'CRITERIA',
        criteria: body.criteria || [],
        formulaType: body.formulaType || 'EQUAL_WEIGHT',
        thresholds: body.thresholds || { outstanding: 85, good: 70, pass: 50 },
        mandatoryRules: body.mandatoryRules || [],
        hasRoleAssessment: body.hasRoleAssessment !== undefined ? body.hasRoleAssessment : true,
        rolesList: body.rolesList || [],
        completionBenchmark: body.completionBenchmark || '',
        deadline: body.deadline || '',
        emailSettings: body.emailSettings || {},
        status: body.status || 'ASSIGNED',
        assignedClasses: assignedClasses.map((cls: any) => ({
          ...cls,
          status: cls.status || 'DRAFT',
          evaluatedStudents: cls.evaluatedStudents || 0
        }))
      };

      const newRecord = await prisma.activityRecord.create({
        data: {
          code: recordCode,
          name: (body.name || catalog.name).trim(),
          catalogId: catalog.id,
          date: body.date ? new Date(body.date) : new Date(),
          semester: 1,
          academicYearId: validAcademicYearId,
          levelId: body.educationLevel || catalog.level || null,
          formatId: body.scale || null,
          organizerId: body.campusId || teacher.campusId || null,
          teacherId: teacher.id,
          locationId: JSON.stringify(fullMetadata),
          status: body.status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
        }
      });

      // Populate initial ActivityParticipant records
      const classIds = assignedClasses.map((c: any) => c.classId).filter(Boolean);
      if (classIds.length > 0) {
        const students = await prisma.student.findMany({
          where: {
            classId: { in: classIds },
            NOT: { status: { in: ['INACTIVE', 'DELETED', 'CHUYEN_TRUONG', 'THOI_HOC'] } }
          },
          select: { id: true, classId: true }
        });

        if (students.length > 0) {
          const evalMode = fullMetadata.evalMode || "CRITERIA";
          const participantRows = students.map(s => ({
            recordId: newRecord.id,
            studentId: s.id,
            roleId: "TV",
            evalLevelId: evalMode === "PARTICIPATION_ONLY" ? "DAT" : null,
            note: JSON.stringify({
              attendance: "PRESENT",
              roles: ["Thành viên"],
              criteriaScores: {},
              calculatedPercent: evalMode === "PARTICIPATION_ONLY" ? 100 : 0,
              finalResult: evalMode === "PARTICIPATION_ONLY" ? "THAM_GIA" : "CAN_HO_TRO",
              remarksQuick: [],
              remarksCustom: ""
            })
          }));

          await prisma.activityParticipant.createMany({
            data: participantRows
          });
        }
      }

      // Email settings
      const emailSettings = body.emailSettings || {};
      if (body.status !== 'DRAFT' && assignedClasses.length > 0 && emailSettings.sendEmail !== false) {
        sendExperientialActivityNotification({
          activityId: newRecord.id,
          activityCode: recordCode,
          activityName: newRecord.name,
          strand: fullMetadata.strand,
          activityTypeId: fullMetadata.activityTypeId,
          activityTypeName: fullMetadata.activityTypeName,
          subjectId: fullMetadata.subjectId,
          subjectName: fullMetadata.subjectName,
          departmentId: fullMetadata.departmentId,
          departmentName: fullMetadata.departmentName,
          scale: fullMetadata.scale,
          evalMode: fullMetadata.evalMode,
          criteria: fullMetadata.criteria,
          date: body.date || null,
          timeRange: fullMetadata.timeRange,
          location: fullMetadata.location,
          deadline: fullMetadata.deadline,
          senderName: emailSettings.senderName,
          senderEmail: emailSettings.senderEmail,
          replyTo: emailSettings.replyTo,
          customMessage: emailSettings.customMessage,
          includeGdcs: emailSettings.includeGdcs !== false,
          gdcsEmails: emailSettings.gdcsEmails || [],
          assignedClasses: fullMetadata.assignedClasses
        }).catch(e => console.error('[HĐTN Email Trigger Error]:', e));
      }

      return NextResponse.json({
        success: true,
        id: newRecord.id,
        name: newRecord.name
      });
    }

    let teacherRecord: any = null;
    if (session?.user?.id) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    }

    const isMyCreated = !!(teacherRecord && (existing.teacherId === teacherRecord.id || existing.teacher?.userId === session?.user?.id));
    const canManage = isManagement || isMyCreated || hasExpManageUpdate;

    if (!canManage) {
      return NextResponse.json({ error: "Bạn không có quyền hiệu chỉnh kế hoạch hoạt động được giao từ cấp trên" }, { status: 403 });
    }

    const currentMeta = parseDbJson<any>(existing.locationId, {});

    if (action === "LOCK" || action === "UNLOCK") {
      const newStatus = action === "LOCK" ? "LOCKED" : "ASSIGNED";
      const updatedMeta = { ...currentMeta, status: newStatus };
      await prisma.activityRecord.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          locationId: JSON.stringify(updatedMeta)
        }
      });
      return NextResponse.json({ success: true, status: newStatus });
    }

    if (action === "DUPLICATE") {
      const { academicYearId } = body;
      const targetYearId = academicYearId || existing.academicYearId;
      const dupCode = "HDTN_" + Math.random().toString(36).substring(2, 6).toUpperCase();
      const dupMeta = {
        ...currentMeta,
        status: "DRAFT",
        assignedClasses: (currentMeta.assignedClasses || []).map((c: any) => ({
          ...c,
          status: "DRAFT",
          evaluatedStudents: 0
        }))
      };

      const duplicated = await prisma.activityRecord.create({
        data: {
          code: dupCode,
          name: existing.name + " (Bản sao)",
          catalogId: existing.catalogId,
          date: new Date(),
          academicYearId: targetYearId,
          levelId: existing.levelId,
          formatId: existing.formatId,
          organizerId: existing.organizerId,
          teacherId: existing.teacherId,
          locationId: JSON.stringify(dupMeta),
          status: "DRAFT"
        }
      });

      return NextResponse.json(duplicated);
    }

    // Comprehensive Meta update
    const updatedMeta = {
      ...currentMeta,
      campusId: body.campusId !== undefined ? body.campusId : currentMeta.campusId,
      campusCode: body.campusCode !== undefined ? body.campusCode : currentMeta.campusCode,
      campusName: body.campusName !== undefined ? body.campusName : currentMeta.campusName,
      selectedCampusIds: body.selectedCampusIds !== undefined ? body.selectedCampusIds : currentMeta.selectedCampusIds,
      educationLevel: body.educationLevel !== undefined ? body.educationLevel : currentMeta.educationLevel,
      activityCategory: body.activityCategory !== undefined ? body.activityCategory : currentMeta.activityCategory,
      themeName: body.themeName !== undefined ? body.themeName : currentMeta.themeName,
      deliverables: body.deliverables !== undefined ? body.deliverables : currentMeta.deliverables,
      cthsTeachers: body.cthsTeachers !== undefined ? body.cthsTeachers : currentMeta.cthsTeachers,
      evaluationConfig: body.evaluationConfig !== undefined ? body.evaluationConfig : currentMeta.evaluationConfig,
      grades: body.grades !== undefined ? body.grades : currentMeta.grades,
      description: body.description !== undefined ? body.description : currentMeta.description,
      objectives: body.objectives !== undefined ? body.objectives : currentMeta.objectives,
      evidenceUrls: body.evidenceUrls !== undefined ? body.evidenceUrls : currentMeta.evidenceUrls,
      timeRange: body.timeRange !== undefined ? body.timeRange : currentMeta.timeRange,
      location: body.location !== undefined ? body.location : currentMeta.location,
      locationText: body.location !== undefined ? body.location : currentMeta.locationText,
      strand: body.strand !== undefined ? body.strand : currentMeta.strand,
      activityTypeId: body.activityTypeId !== undefined ? body.activityTypeId : currentMeta.activityTypeId,
      activityTypeName: body.activityTypeName !== undefined ? body.activityTypeName : currentMeta.activityTypeName,
      scale: body.scale !== undefined ? body.scale : currentMeta.scale,
      evalMode: body.evalMode !== undefined ? body.evalMode : currentMeta.evalMode,
      formulaType: body.formulaType !== undefined ? body.formulaType : currentMeta.formulaType,
      criteria: body.criteria !== undefined ? body.criteria : currentMeta.criteria,
      thresholds: body.thresholds !== undefined ? body.thresholds : currentMeta.thresholds,
      mandatoryRules: body.mandatoryRules !== undefined ? body.mandatoryRules : currentMeta.mandatoryRules,
      hasRoleAssessment: body.hasRoleAssessment !== undefined ? body.hasRoleAssessment : currentMeta.hasRoleAssessment,
      rolesList: body.rolesList !== undefined ? body.rolesList : currentMeta.rolesList,
      completionBenchmark: body.completionBenchmark !== undefined ? body.completionBenchmark : currentMeta.completionBenchmark,
      deadline: body.deadline !== undefined ? body.deadline : currentMeta.deadline,
      status: body.status !== undefined ? body.status : currentMeta.status,
      assignedClasses: body.assignedClasses !== undefined ? body.assignedClasses : currentMeta.assignedClasses,
      departmentId: body.departmentId !== undefined ? body.departmentId : currentMeta.departmentId,
      departmentName: body.departmentName !== undefined ? body.departmentName : currentMeta.departmentName,
      subjectId: body.subjectId !== undefined ? body.subjectId : currentMeta.subjectId,
      subjectName: body.subjectName !== undefined ? body.subjectName : currentMeta.subjectName,
      emailSettings: body.emailSettings !== undefined ? body.emailSettings : currentMeta.emailSettings
    };

    // Update ActivityRecord safely without any invalid columns
    const updated = await prisma.activityRecord.update({
      where: { id: existing.id },
      data: {
        name: body.name !== undefined ? body.name.trim() : existing.name,
        date: body.date ? new Date(body.date) : existing.date,
        levelId: body.educationLevel || existing.levelId,
        formatId: body.scale || existing.formatId,
        organizerId: body.campusId || existing.organizerId,
        locationId: JSON.stringify(updatedMeta),
        status: body.status === "DRAFT" ? "DRAFT" : "SUBMITTED"
      }
    });

    // Auto-populate ActivityParticipant records for any newly assigned classes
    const assignedClasses = updatedMeta.assignedClasses || [];
    const classIds = assignedClasses.map((c: any) => c.classId).filter(Boolean);
    if (classIds.length > 0) {
      const existingStudentIds = new Set(existing.participants.map(p => p.studentId));
      const students = await prisma.student.findMany({
        where: {
          classId: { in: classIds },
          NOT: { status: { in: ['INACTIVE', 'DELETED', 'CHUYEN_TRUONG', 'THOI_HOC'] } }
        },
        select: { id: true, classId: true }
      });

      const newStudents = students.filter(s => !existingStudentIds.has(s.id));
      if (newStudents.length > 0) {
        const evalMode = updatedMeta.evalMode || "CRITERIA";
        const participantRows = newStudents.map(s => ({
          recordId: existing.id,
          studentId: s.id,
          roleId: "TV",
          evalLevelId: evalMode === "PARTICIPATION_ONLY" ? "DAT" : null,
          note: JSON.stringify({
            attendance: "PRESENT",
            roles: ["Thành viên"],
            criteriaScores: {},
            calculatedPercent: evalMode === "PARTICIPATION_ONLY" ? 100 : 0,
            finalResult: evalMode === "PARTICIPATION_ONLY" ? "THAM_GIA" : "CAN_HO_TRO",
            remarksQuick: [],
            remarksCustom: ""
          })
        }));

        await prisma.activityParticipant.createMany({
          data: participantRows
        });
      }
    }

    // Send email notification to GVCN & GVBM if updated and assigned
    const emailSettings = body.emailSettings || updatedMeta.emailSettings || {};
    if (body.status !== 'DRAFT' && assignedClasses.length > 0 && emailSettings.sendEmail !== false) {
      sendExperientialActivityNotification({
        activityId: updated.id,
        activityCode: existing.code || 'HDTN',
        activityName: updated.name,
        strand: updatedMeta.strand,
        activityTypeId: updatedMeta.activityTypeId,
        activityTypeName: updatedMeta.activityTypeName,
        subjectId: updatedMeta.subjectId,
        subjectName: updatedMeta.subjectName,
        departmentId: updatedMeta.departmentId,
        departmentName: updatedMeta.departmentName,
        scale: updatedMeta.scale,
        evalMode: updatedMeta.evalMode,
        criteria: updatedMeta.criteria,
        date: body.date || (existing.date ? existing.date.toISOString().split('T')[0] : null),
        timeRange: updatedMeta.timeRange,
        location: updatedMeta.location,
        deadline: updatedMeta.deadline,
        senderName: emailSettings.senderName,
        senderEmail: emailSettings.senderEmail,
        replyTo: emailSettings.replyTo,
        customMessage: emailSettings.customMessage,
        includeGdcs: emailSettings.includeGdcs !== false,
        gdcsEmails: emailSettings.gdcsEmails || [],
        assignedClasses: updatedMeta.assignedClasses
      }).catch(e => console.error('[HĐTN Email Trigger Error]:', e));
    }

    return NextResponse.json({
      success: true,
      id: updated.id,
      name: updated.name
    });
  } catch (error: any) {
    console.error("PUT /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role || '';
    const upperRole = (userRole || '').toUpperCase().trim();
    const hasExpDeletePerm = await hasModulePermission(userRole, ["EXPERIENTIAL_ACTIVITIES", "EXP_ACT_MANAGE"], "canDelete");
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS'].includes(upperRole) || hasExpDeletePerm;

    const { id } = await params;
    let existing = await prisma.activityRecord.findUnique({ where: { id } });
    if (!existing) {
      existing = await prisma.activityRecord.findFirst({ where: { catalogId: id } });
    }

    if (!existing) {
      const cat = await prisma.activityCatalog.findUnique({ where: { id } });
      if (cat) {
        if (!isManagement) {
          return NextResponse.json({ error: "Bạn không có quyền xóa danh mục hoạt động này" }, { status: 403 });
        }
        await prisma.activityCatalog.update({
          where: { id },
          data: { status: 'DELETED' }
        });
        return NextResponse.json({ success: true, message: 'Đã xóa danh mục hoạt động' });
      }
      return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
    }

    let teacherRecord: any = null;
    if (session.user.id) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    }
    const isMyCreated = !!(teacherRecord && (existing.teacherId === teacherRecord.id || existing.teacher?.userId === session.user.id));
    const canDelete = isManagement || isMyCreated || hasExpDeletePerm;

    if (!canDelete) {
      return NextResponse.json({ error: "Bạn không có quyền xóa hoạt động này" }, { status: 403 });
    }

    await prisma.activityParticipant.deleteMany({
      where: { recordId: existing.id }
    });

    await prisma.activityRecord.delete({
      where: { id: existing.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 });
  }
}
