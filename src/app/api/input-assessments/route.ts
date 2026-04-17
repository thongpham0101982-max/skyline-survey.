import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    
    if (!academicYearId) {
       return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 });
    }
    
    const periods = await (prisma as any).inputAssessmentPeriod.findMany({
      where: { academicYearId },
      include: {
        campus: true,
        InputAssessmentTeacherAssignment: { select: { id: true, unlockRequestStatus: true, unlockReason: true, user: { select: { fullName: true, id: true } } } },
        assignedUser: { select: { fullName: true } },
        batches: {
          orderBy: { batchNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(periods);
  } catch (error) {
    console.error("API GET ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    if (action === "CREATE_PERIOD") {
      const result = await (prisma as any).inputAssessmentPeriod.create({
        data: {
           code: data.code,
           name: data.name,
           academicYearId: data.academicYearId,
           description: data.description,
           campusId: data.campusId || null,
           assignedUserId: data.assignedUserId || null,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           status: data.status || "ACTIVE",
        }
      });
      return NextResponse.json(result);
    } 
    else if (action === "CREATE_BATCH") {
      const result = await (prisma as any).inputAssessmentBatch.create({
        data: {
           periodId: data.periodId,
           batchNumber: parseInt(data.batchNumber),
           name: data.name,
           startDate: new Date(data.startDate),
           endDate: new Date(data.endDate),
           status: data.status || "ACTIVE"
        }
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("API POST ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { action, id, data } = body;
    
    if (action === "UPDATE_PERIOD") {
      const result = await (prisma as any).inputAssessmentPeriod.update({
        where: { id },
        data: {
           name: data.name,
           description: data.description,
           campusId: data.campusId || null,
           assignedUserId: data.assignedUserId || null,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           status: data.status || "ACTIVE"
        }
      });
      return NextResponse.json(result);
    }
    else if (action === "UPDATE_BATCH") {
      const result = await (prisma as any).inputAssessmentBatch.update({
        where: { id },
        data: {
           name: data.name,
           startDate: new Date(data.startDate),
           endDate: new Date(data.endDate),
           status: data.status
        }
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // 'period' or 'batch'
    
    if (!id || !type) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    
    if (type === 'period') {
       await (prisma as any).inputAssessmentPeriod.delete({ where: { id } });
    } else if (type === 'batch') {
       await (prisma as any).inputAssessmentBatch.delete({ where: { id } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}


