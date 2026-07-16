// @ts-nocheck
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { studentName: "asc" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        dateOfBirth: true,
        gender: true,
        classId: true,
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
