import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("get_max_code") === "true") {
      const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s: any) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n: number) => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      return NextResponse.json({ nextCode: "HS" + (maxNum + 1).toString().padStart(3, "0") });
    }
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    
    if (!periodId) {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const where: any = { periodId };
    if (batchId) where.batchId = batchId;
    
    const students = await (prisma as any).inputAssessmentStudent.findMany({
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
      const result = await (prisma as any).inputAssessmentStudent.create({
        data: {
           studentCode: data.studentCode,
           fullName: data.fullName,
           dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
           className: data.className || null,
           grade: data.grade || null,
           academicRating: data.academicRating || null,
           conductRating: data.conductRating || null,
           admissionCriteria: data.admissionCriteria || null,
           surveySystem: data.surveySystem || null,
           targetType: data.targetType || null,
           surveyFormType: data.surveyFormType || null,
           signatureName: data.signatureName || null,
           hocKy: data.hocKy || null,
           kqgdTieuHoc: data.kqgdTieuHoc || null,
           kqHocTap: data.kqHocTap || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
           kqRenLuyen: data.kqRenLuyen || null,
           psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
           writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
           oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
           mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
           literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
           periodId: data.periodId,
           batchId: data.batchId || null,
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
          const existing = await (prisma as any).inputAssessmentStudent.findUnique({
            where: { studentCode_periodId: { studentCode: d.studentCode, periodId: d.periodId } }
          });

          const studentData = {
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
            gender: d.gender || null,
            className: d.className || null,
            grade: d.grade || null,
            academicRating: d.academicRating || null,
            conductRating: d.conductRating || null,
            admissionCriteria: d.admissionCriteria || null,
            surveySystem: d.surveySystem || null,
            targetType: d.targetType || null,
            surveyFormType: d.surveyFormType || null,
            signatureName: d.signatureName || null,
            hocKy: d.hocKy || null,
            kqgdTieuHoc: d.kqgdTieuHoc || null,
            kqHocTap: d.kqHocTap || null,
            hoSoCtQuocTe: d.hoSoCtQuocTe || null,
            kqRenLuyen: d.kqRenLuyen || null,
            psychologyScore: d.psychologyScore ? parseFloat(d.psychologyScore) : null,
            writtenEnglishScore: d.writtenEnglishScore ? parseFloat(d.writtenEnglishScore) : null,
            oralEnglishScore: d.oralEnglishScore ? parseFloat(d.oralEnglishScore) : null,
            mathScore: d.mathScore ? parseFloat(d.mathScore) : null,
            literatureScore: d.literatureScore ? parseFloat(d.literatureScore) : null,
            batchId: d.batchId || null,
          };

          let result;
          if (existing) {
            result = await (prisma as any).inputAssessmentStudent.update({
              where: { id: existing.id },
              data: studentData
            });
          } else {
            result = await (prisma as any).inputAssessmentStudent.create({
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
    
    const result = await (prisma as any).inputAssessmentStudent.update({
      where: { id },
      data: {
         fullName: data.fullName,
         dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
         className: data.className || null,
           grade: data.grade || null,
         academicRating: data.academicRating || null,
         conductRating: data.conductRating || null,
         admissionCriteria: data.admissionCriteria || null,
         surveySystem: data.surveySystem || null,
         targetType: data.targetType || null,
         surveyFormType: data.surveyFormType || null,
         signatureName: data.signatureName || null,
         hocKy: data.hocKy || null,
         kqgdTieuHoc: data.kqgdTieuHoc || null,
         kqHocTap: data.kqHocTap || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
         kqRenLuyen: data.kqRenLuyen || null,
         psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
         writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
         oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
         mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
         literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
         batchId: data.batchId || null,
         ...(data.admissionResult !== undefined && { admissionResult: data.admissionResult }),
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
      await (prisma as any).inputAssessmentStudent.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await (prisma as any).inputAssessmentStudent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}