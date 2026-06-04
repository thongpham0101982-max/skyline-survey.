// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  try {
    const { searchParams } = new URL(req.url);
    
    if (searchParams.get("get_next_code") === "true") {
      const surveyType = searchParams.get("surveyType") || "KHAO_SAT_LE";
      const periods = await (prisma as any).preschoolInputAssessmentPeriod.findMany({
        select: { code: true }
      });
      let maxNum = 0;
      const prefix = surveyType === "OPEN_DAY" ? "KSĐV_OP_" : "KSĐV_LE_";
      for (const p of periods) {
        if (p.code && p.code.startsWith(prefix)) {
          const suffix = p.code.substring(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      const nextNum = maxNum + 1;
      const nextCode = prefix + nextNum.toString().padStart(2, "0");
      return NextResponse.json({ nextCode });
    }
    
    const academicYearId = searchParams.get("academicYearId");
    
    if (!academicYearId) {
       return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 });
    }
    
    const periods = await (prisma as any).preschoolInputAssessmentPeriod.findMany({
      where: { academicYearId },
      include: {
        assignedUser: { select: { fullName: true } },
        batches: {
          include: {
            assignedUser: { select: { id: true, fullName: true } }
          },
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
      const result = await (prisma as any).preschoolInputAssessmentPeriod.create({
        data: {
           code: data.code,
           name: data.name,
           academicYearId: data.academicYearId,
           description: data.description,
           assignedUserId: data.assignedUserId || null,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           status: data.status || "ACTIVE",
           surveyType: data.surveyType || "KHAO_SAT_LE",
        }
      });
      return NextResponse.json(result);
    } 
    else if (action === "CREATE_BATCH") {
      const result = await (prisma as any).preschoolInputAssessmentBatch.create({
        data: {
           periodId: data.periodId,
           batchNumber: parseInt(data.batchNumber),
           name: data.name,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           campusId: data.campusId || null,
           assignedUserId: data.assignedUserId || null,
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
      const result = await (prisma as any).preschoolInputAssessmentPeriod.update({
        where: { id },
        data: {
           ...(data.name !== undefined && { name: data.name }),
           ...(data.description !== undefined && { description: data.description }),
           ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId || null }),
           ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
           ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
           ...(data.status !== undefined && { status: data.status })
           ,...(data.surveyType !== undefined && { surveyType: data.surveyType || "KHAO_SAT_LE" })
        }
      });
      return NextResponse.json(result);
    }
    else if (action === "UPDATE_BATCH") {
      const result = await (prisma as any).preschoolInputAssessmentBatch.update({
        where: { id },
        data: {
           ...(data.name !== undefined && { name: data.name }),
           ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
           ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
           ...(data.campusId !== undefined && { campusId: data.campusId || null }),
           ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId || null }),
           ...(data.status !== undefined && { status: data.status }),
           ...(data.batchNumber !== undefined && { batchNumber: typeof data.batchNumber === 'string' ? parseInt(data.batchNumber) : data.batchNumber }),
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
       await (prisma as any).preschoolInputAssessmentPeriod.delete({ where: { id } });
    } else if (type === 'batch') {
       await (prisma as any).preschoolInputAssessmentBatch.delete({ where: { id } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
