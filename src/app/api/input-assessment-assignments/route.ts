import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");
    
    if (!periodId) {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
      where: { periodId },
      include: {
        batch: true,
        user: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, periodId, batchId, assignments } = body;
    
    if (action === "BULK_ASSIGN") {
       let successCount = 0;
       
       for (const a of assignments) {
          try {
             const existing = await prisma.inputAssessmentTeacherAssignment.findFirst({
                where: {
                   periodId,
                   batchId: batchId || null,
                   userId: a.teacherId,
                   subjectId: a.subjectId,
                   grade: a.grade,
                   educationSystem: a.educationSystem
                }
             });
             if (!existing) {
                await prisma.inputAssessmentTeacherAssignment.create({
                   data: {
                      periodId,
                      batchId: batchId || null,
                      userId: a.teacherId,
                      subjectId: a.subjectId,
                      grade: a.grade,
                      educationSystem: a.educationSystem
                   }
                });
             }
             successCount++;
             if (!existing) {
                await prisma.inputAssessmentTeacherAssignment.create({
                   data: {
                      periodId,
                      batchId: batchId || null,
                      userId: a.teacherId,
                      subjectId: a.subjectId,
                      grade: a.grade,
                      educationSystem: a.educationSystem
                   }
                });
             }
             successCount++;
          } catch(err) {
             console.error("Assignment err", err);
             return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
          }
       }
       
       return NextResponse.json({ success: true, count: successCount });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",");
      await prisma.inputAssessmentTeacherAssignment.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.inputAssessmentTeacherAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { action, id, status } = body;
    
    if (action === "RESOLVE_UNLOCK") {
       await prisma.inputAssessmentTeacherAssignment.update({
          where: { id },
          data: { unlockRequestStatus: status }
       });
       return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
