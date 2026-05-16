import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await prisma.inputAssessmentStudent.findMany({
      orderBy: { fullName: "asc" },
      take: 1000
    });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
