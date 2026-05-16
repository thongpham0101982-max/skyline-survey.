import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await prisma.inputAssessmentStudent.findMany({
      orderBy: { fullName: "asc" },
      take: 1000,
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        dateOfBirth: true,
        admissionResult: true,
        admissionCampus: true
      }
    });
    
    return NextResponse.json(students);
  } catch (error) {
    console.error("Error in API /api/student-transfers/assessment-students:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
