import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDbJson } from "@/lib/experiential/formula";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { classId, students, isCompleted } = body;

    if (!Array.isArray(students)) {
      return NextResponse.json({ error: "Danh sach hoc sinh khong hop le" }, { status: 400 });
    }

    const activity = await prisma.activityRecord.findUnique({
      where: { id }
    });

    if (!activity) {
      return NextResponse.json({ error: "Khong tim thay hoat dong" }, { status: 404 });
    }

    const meta = parseDbJson<any>(activity.locationId, {});
    if (meta.status === "LOCKED") {
      return NextResponse.json({ error: "Hoat dong da bi khoa, khong the cap nhat diem" }, { status: 403 });
    }

    // Update each participant note JSON
    await prisma.$transaction(
      students.map((st: any) => {
        const notePayload = {
          attendance: st.attendance || "PRESENT",
          roles: st.roles || ["THANH_VIEN"],
          criteriaScores: st.criteriaScores || {},
          calculatedPercent: st.calculatedPercent !== undefined ? st.calculatedPercent : null,
          finalResult: st.finalResult || "CHUA_DANH_GIA",
          remarksQuick: st.remarksQuick || [],
          remarksCustom: st.remarksCustom || ""
        };

        return prisma.activityParticipant.update({
          where: { id: st.participantId || st.id },
          data: {
            note: JSON.stringify(notePayload),
            roleId: Array.isArray(st.roles) && st.roles.length > 0 ? st.roles[0] : "THANH_VIEN",
            evalLevelId: st.finalResult || "DA"
          }
        });
      })
    );

    // Update class status in meta assignedClasses
    const assignedClasses = meta.assignedClasses || [];
    let allClassCompleted = true;

    const updatedAssignedClasses = assignedClasses.map((cls: any) => {
      if (!classId || cls.classId === classId) {
        const evaluatedCount = students.filter((s: any) => s.isCompleted || (s.finalResult && s.finalResult !== "CHUA_DANH_GIA")).length;
        const newStatus = isCompleted ? "COMPLETED" : (evaluatedCount > 0 ? "IN_PROGRESS" : "DRAFT");
        if (newStatus !== "COMPLETED") allClassCompleted = false;
        return {
          ...cls,
          evaluatedStudents: evaluatedCount,
          status: newStatus
        };
      }
      if (cls.status !== "COMPLETED") allClassCompleted = false;
      return cls;
    });

    const newActivityStatus = allClassCompleted ? "COMPLETED" : "IN_PROGRESS";

    const updatedMeta = {
      ...meta,
      status: newActivityStatus,
      assignedClasses: updatedAssignedClasses
    };

    await prisma.activityRecord.update({
      where: { id },
      data: {
        locationId: JSON.stringify(updatedMeta)
      }
    });

    return NextResponse.json({
      success: true,
      activityStatus: newActivityStatus,
      assignedClasses: updatedAssignedClasses
    });
  } catch (error: any) {
    console.error("PUT /api/experiential-activities/[id]/results error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
  }
}
