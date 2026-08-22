import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const modelMap: any = {
  grade: "assessmentGrade",
  system: "assessmentSystem",
  subject: "assessmentSubject"
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;
    
    if (type === "subject") {
      try {
        const items = await pAny[modelMap[type]].findMany({ orderBy: { sortOrder: 'asc' } });
        return NextResponse.json(items);
      } catch (e: any) {
        if (e.message.includes("exemptCriteria") || e.message.includes("columnNames")) {
          const items = await pAny[modelMap[type]].findMany({ 
            select: { 
              id: true, code: true, name: true, subjectType: true, 
              scoreColumns: true, commentColumns: true, sortOrder: true, 
              status: true, createdAt: true 
            },
            orderBy: { sortOrder: 'asc' } 
          });
          return NextResponse.json(items);
        }
        throw e;
      }
    }

    const items = await pAny[modelMap[type]].findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { type, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;

    if (type === "subject" && data?.action === "sync_from_main_subjects") {
      const mainSubjects = [
        { code: 'TOA', name: 'Toán học', level: 'ALL', evaluationType: 'SCORE' },
        { code: 'TVI', name: 'Tiếng Việt', level: 'ALL', evaluationType: 'SCORE' },
        { code: 'NVA', name: 'Ngữ Văn', level: 'ALL', evaluationType: 'SCORE' },
        { code: 'TLY', name: 'Tâm lý', level: 'ALL', evaluationType: 'SCORE' },
        { code: 'TAV', name: 'Tiếng Anh', level: 'ALL', evaluationType: 'SCORE' },
      ];

      const createdMainSubjects = {};

      for (const sub of mainSubjects) {
        const upserted = await pAny.subject.upsert({
          where: { subjectCode: sub.code },
          update: { subjectName: sub.name, level: sub.level, evaluationType: sub.evaluationType, status: 'ACTIVE' },
          create: { subjectCode: sub.code, subjectName: sub.name, level: sub.level, evaluationType: sub.evaluationType, status: 'ACTIVE' }
        });
        createdMainSubjects[sub.code] = upserted.id;
      }

      const subEnglish = [
        { code: 'TAv', name: 'Tiếng Anh (viết)', parentId: createdMainSubjects['TAV'] },
        { code: 'TAvd', name: 'Tiếng Anh (vấn đáp)', parentId: createdMainSubjects['TAV'] }
      ];

      for (const sub of subEnglish) {
        await pAny.subject.upsert({
          where: { subjectCode: sub.code },
          update: { subjectName: sub.name, parentId: sub.parentId, status: 'ACTIVE' },
          create: { subjectCode: sub.code, subjectName: sub.name, parentId: sub.parentId, status: 'ACTIVE' }
        });
      }

      const assessmentSubjects = [
        { code: 'TOA', name: 'Toán học', scoreColumns: 1, commentColumns: 1, sortOrder: 1 },
        { code: 'TVI', name: 'Tiếng Việt', scoreColumns: 1, commentColumns: 1, sortOrder: 2 },
        { code: 'NVA', name: 'Ngữ Văn', scoreColumns: 1, commentColumns: 1, sortOrder: 3 },
        { code: 'TLY', name: 'Tâm lý', scoreColumns: 7, commentColumns: 2, sortOrder: 4 },
        { code: 'TAv', name: 'Tiếng Anh (viết)', scoreColumns: 1, commentColumns: 1, sortOrder: 5 },
        { code: 'TAvd', name: 'Tiếng Anh (vấn đáp)', scoreColumns: 1, commentColumns: 1, sortOrder: 6 },
      ];

      for (const assSub of assessmentSubjects) {
        const existing = await pAny.assessmentSubject.findUnique({ where: { code: assSub.code } });
        if (existing) {
          await pAny.assessmentSubject.update({
            where: { code: assSub.code },
            data: { name: assSub.name, status: 'ACTIVE' }
          });
        } else {
          await pAny.assessmentSubject.create({
            data: {
              code: assSub.code,
              name: assSub.name,
              scoreColumns: assSub.scoreColumns,
              commentColumns: assSub.commentColumns,
              sortOrder: assSub.sortOrder,
              status: 'ACTIVE'
            }
          });
        }
      }

      return NextResponse.json({ success: true, message: "Đã cập nhật/đồng bộ thành công danh mục Môn học & Môn KS" });
    }

    const count = await pAny[modelMap[type]].count();
    const result = await pAny[modelMap[type]].create({
      data: { ...data, sortOrder: count + 1 }
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { type, id, data } = await req.json();
    if (!type || !modelMap[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const pAny = prisma as any;
    const result = await pAny[modelMap[type]].update({ where: { id }, data });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!type || !modelMap[type] || !id) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const pAny = prisma as any;
    await pAny[modelMap[type]].delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
