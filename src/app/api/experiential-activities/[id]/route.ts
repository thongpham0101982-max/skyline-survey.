import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDbJson } from "@/lib/experiential/formula";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const activity = await prisma.activityRecord.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true,
                class: { select: { id: true, className: true } }
              }
            }
          }
        },
        catalog: true
      }
    });

    if (!activity) {
      return NextResponse.json({ error: "Khong tim thay hoat dong" }, { status: 404 });
    }

    const meta = parseDbJson<any>(activity.locationId, {});

    const students = activity.participants.map((p) => {
      const pNote = parseDbJson<any>(p.note, {});
      return {
        id: p.id,
        participantId: p.id,
        studentId: p.studentId,
        studentCode: p.student?.studentCode || "",
        fullName: p.student?.studentName || "",
        classId: p.student?.classId || p.student?.class?.id || "",
        className: p.student?.class?.className || "",
        attendance: pNote.attendance || "PRESENT",
        roles: pNote.roles || ["THANH_VIEN"],
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
      campusId: activity.campusId,
      educationLevel: activity.educationLevel,
      grades: activity.grades ? activity.grades.split(",") : [],
      date: activity.date ? activity.date.toISOString().split("T")[0] : "",
      timeRange: meta.timeRange || "",
      location: meta.location || "",
      description: activity.description,
      objectives: meta.objectives || "",
      evidenceUrls: meta.evidenceUrls || [],
      strand: meta.strand || "BAN_THAN",
      activityTypeId: meta.activityTypeId || "",
      activityTypeName: meta.activityTypeName || activity.catalog?.name || "",
      scale: meta.scale || "KHOI",
      evalMode: meta.evalMode || "CRITERIA",
      formulaType: meta.formulaType || "EQUAL_WEIGHT",
      criteria: meta.criteria || [],
      thresholds: meta.thresholds || { outstanding: 85, good: 70, pass: 50 },
      mandatoryRules: meta.mandatoryRules || [],
      status: meta.status || "ASSIGNED",
      deadline: meta.deadline || "",
      assignedClasses: meta.assignedClasses || [],
      students
    });
  } catch (error: any) {
    console.error("GET /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
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
      return NextResponse.json({ error: "Khong tim thay hoat dong" }, { status: 404 });
    }

    const currentMeta = parseDbJson<any>(existing.locationId, {});

    if (action === "LOCK" || action === "UNLOCK") {
      const newStatus = action === "LOCK" ? "LOCKED" : "ASSIGNED";
      const updatedMeta = { ...currentMeta, status: newStatus };
      await prisma.activityRecord.update({
        where: { id },
        data: { locationId: JSON.stringify(updatedMeta) }
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
          name: existing.name + " (Ban sao)",
          description: existing.description,
          date: existing.date,
          academicYearId: targetYearId,
          campusId: existing.campusId,
          educationLevel: existing.educationLevel,
          grades: existing.grades,
          locationId: JSON.stringify(dupMeta),
          participants: existing.participants
        }
      });

      return NextResponse.json(duplicated);
    }

    const updatedMeta = {
      ...currentMeta,
      timeRange: body.timeRange ?? currentMeta.timeRange,
      location: body.location ?? currentMeta.location,
      objectives: body.objectives ?? currentMeta.objectives,
      evidenceUrls: body.evidenceUrls ?? currentMeta.evidenceUrls,
      strand: body.strand ?? currentMeta.strand,
      activityTypeId: body.activityTypeId ?? currentMeta.activityTypeId,
      activityTypeName: body.activityTypeName ?? currentMeta.activityTypeName,
      scale: body.scale ?? currentMeta.scale,
      evalMode: body.evalMode ?? currentMeta.evalMode,
      formulaType: body.formulaType ?? currentMeta.formulaType,
      criteria: body.criteria ?? currentMeta.criteria,
      thresholds: body.thresholds ?? currentMeta.thresholds,
      mandatoryRules: body.mandatoryRules ?? currentMeta.mandatoryRules,
      deadline: body.deadline ?? currentMeta.deadline,
      assignedClasses: body.assignedClasses ?? currentMeta.assignedClasses
    };

    const updated = await prisma.activityRecord.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        date: body.date ? new Date(body.date) : existing.date,
        grades: Array.isArray(body.grades) ? body.grades.join(",") : existing.grades,
        educationLevel: body.educationLevel ?? existing.educationLevel,
        locationId: JSON.stringify(updatedMeta)
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/experiential-activities/[id] error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
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
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
  }
}
