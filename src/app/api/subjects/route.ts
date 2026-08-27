import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true,
        level: true
      },
      orderBy: { subjectName: "asc" }
    });

    return NextResponse.json(subjects);
  } catch (error: any) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
