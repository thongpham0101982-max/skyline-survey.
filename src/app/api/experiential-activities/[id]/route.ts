import { sendExperientialActivityNotification } from "@/lib/experiential/email-notification";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const activity = await prisma.activityRecord.findUnique({
      where: { id },
      include: {
        catalog: true,
        academicYear: true,
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
      return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role || '';
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN'].includes(userRole);

    let teacherRecord: any = null;
    if (session?.user?.id) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    }

    const isMyCreated = !!(teacherRecord && (activity.teacherId === teacherRecord.id || activity.teacher?.userId === session?.user?.id));
    const canManage = isManagement || isMyCreated;

    const meta = parseDbJson<any>(activity.locationId, {});

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
      status: meta.status || activity.status || "ASSIGNED",
      deadline: meta.deadline || "",
      assignedClasses: meta.assignedClasses || [],
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

    const existing = await prisma.activityRecord.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role || '';
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'GV_HDTN'].includes(userRole);

    let teacherRecord: any = null;
    if (session?.user?.id) {
      teacherRecord = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    }

    const isMyCreated = !!(teacherRecord && (existing.teacherId === teacherRecord.id || existing.teacher?.userId === session?.user?.id));
    const canManage = isManagement || isMyCreated;

    if (!canManage) {
      return NextResponse.json({ error: "Bạn không có quyền hiệu chỉnh kế hoạch hoạt động được giao từ cấp trên" }, { status: 403 });
    }

    const currentMeta = parseDbJson<any>(existing.locationId, {});

    if (action === "LOCK" || action === "UNLOCK") {
      const newStatus = action === "LOCK" ? "LOCKED" : "ASSIGNED";
      const updatedMeta = { ...currentMeta, status: newStatus };
      await prisma.activityRecord.update({
        where: { id },
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
      deadline: body.deadline !== undefined ? body.deadline : currentMeta.deadline,
      status: body.status !== undefined ? body.status : currentMeta.status,
      assignedClasses: body.assignedClasses !== undefined ? body.assignedClasses : currentMeta.assignedClasses,
      subjectId: body.subjectId !== undefined ? body.subjectId : currentMeta.subjectId,
      subjectName: body.subjectName !== undefined ? body.subjectName : currentMeta.subjectName
    };

    // Update ActivityRecord safely without any invalid columns
    const updated = await prisma.activityRecord.update({
      where: { id },
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
          status: "ACTIVE"
        },
        select: { id: true, classId: true }
      });

      const newStudents = students.filter(s => !existingStudentIds.has(s.id));
      if (newStudents.length > 0) {
        const evalMode = updatedMeta.evalMode || "CRITERIA";
        const participantRows = newStudents.map(s => ({
          recordId: id,
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
    if (body.status !== 'DRAFT' && assignedClasses.length > 0) {
      sendExperientialActivityNotification({
        activityId: updated.id,
        activityCode: existing.code || 'HDTN',
        activityName: updated.name,
        strand: updatedMeta.strand,
        activityTypeName: updatedMeta.activityTypeName,
        subjectId: updatedMeta.subjectId,
        subjectName: updatedMeta.subjectName,
        date: body.date || (existing.date ? existing.date.toISOString().split('T')[0] : null),
        timeRange: updatedMeta.timeRange,
        location: updatedMeta.location,
        deadline: updatedMeta.deadline,
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
    const { id } = await params;

    await prisma.activityParticipant.deleteMany({
      where: { recordId: id }
    });

    await prisma.activityRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 });
  }
}
