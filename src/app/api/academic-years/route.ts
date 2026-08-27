import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rawYears = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' }
    });

    const activeYears = rawYears.filter(y => y.status === 'ACTIVE');
    
    // Deduplicate by name
    const seenNames = new Set();
    let years = activeYears.filter(y => {
      if (seenNames.has(y.name)) return false;
      seenNames.add(y.name);
      return true;
    });

    // Fallback: if no active years exist, return the most recent one (or first one)
    if (years.length === 0 && rawYears.length > 0) {
      const fallbackSeen = new Set();
      years = rawYears.filter(y => {
        if (fallbackSeen.has(y.name)) return false;
        fallbackSeen.add(y.name);
        return true;
      }).slice(0, 1);
    }

    return NextResponse.json(years);
  } catch (error) {
    console.error("Error fetching academic years:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
