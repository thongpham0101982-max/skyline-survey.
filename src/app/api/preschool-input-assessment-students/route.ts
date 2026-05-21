import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("get_max_code") === "true") {
      const allStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s: any) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n: number) => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      return NextResponse.json({ nextCode: "MN" + (maxNum + 1).toString().padStart(3, "0") });
    }
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    
    if (!periodId && searchParams.get("fetch_all") !== "true") {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const where: any = periodId ? { periodId } : {};
    if (batchId) where.batchId = batchId;
    
    const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
      where,
      include: { batch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    if (action === "CREATE") {
      const result = await (prisma as any).preschoolInputAssessmentStudent.create({
        data: {
           studentCode: data.studentCode,
           fullName: data.fullName,
           dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
           grade: data.grade || null,
           admissionCriteria: null,
           admissionCampus: data.admissionCampus || null,
           surveySystem: data.surveySystem || null,
           surveyFormType: data.surveyFormType || null,
           signatureName: data.signatureName || null,
           periodId: data.periodId,
           batchId: data.batchId || null,
           admissionResult: data.admissionResult || null,
        }
      });
      return NextResponse.json(result);
    }
    

    if (action === "BULK_CREATE") {
      const results = [];
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        try {
          const existing = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
            where: { studentCode_periodId: { studentCode: d.studentCode, periodId: d.periodId } }
          });

          const studentData = {
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
            gender: d.gender || null,
            grade: d.grade || null,
            admissionCriteria: null,
            admissionCampus: d.admissionCampus || null,
            surveySystem: d.surveySystem || null,
            surveyFormType: d.surveyFormType || null,
            signatureName: d.signatureName || null,
            batchId: d.batchId || null,
          };

          let result;
          if (existing) {
            result = await (prisma as any).preschoolInputAssessmentStudent.update({
              where: { id: existing.id },
              data: studentData
            });
          } else {
            result = await (prisma as any).preschoolInputAssessmentStudent.create({
              data: {
                studentCode: d.studentCode,
                periodId: d.periodId,
                ...studentData
              }
            });
          }
          results.push(result);
        } catch (err) {
          errors.push({ row: i + 1, code: d.studentCode, error: err.message });
        }
      }
      return NextResponse.json({ success: true, created: results.length, errors });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, data } = body;

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    
    const result = await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id },
      data: {
         fullName: data.fullName,
         dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
         gender: data.gender || null,
         grade: data.grade || null,
         admissionCriteria: null,
         admissionCampus: data.admissionCampus || null,
         surveySystem: data.surveySystem || null,
         surveyFormType: data.surveyFormType || null,
         signatureName: data.signatureName || null,
         batchId: data.batchId || null,
         ...(data.admissionResult !== undefined && { admissionResult: data.admissionResult }),
         ...(data.directorNote !== undefined && { directorNote: data.directorNote }),
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",");
      await (prisma as any).preschoolInputAssessmentStudent.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await (prisma as any).preschoolInputAssessmentStudent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
