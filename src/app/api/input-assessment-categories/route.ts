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
