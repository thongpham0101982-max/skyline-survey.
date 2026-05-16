import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await prisma.inputAssessmentStudent.findMany({
      orderBy: { fullName: "asc" },
      take: 100
    });
    return NextResponse.json({ students, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
