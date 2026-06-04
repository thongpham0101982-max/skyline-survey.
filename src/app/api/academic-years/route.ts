import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const years = await prisma.academicYear.findMany({
      where: { isOff: false },
      orderBy: { startDate: 'desc' }
    });
    return NextResponse.json(years);
  } catch (error) {
    console.error("Error fetching academic years:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
