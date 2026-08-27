import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rawCampuses = await prisma.campus.findMany({
      orderBy: { campusName: 'asc' }
    });

    const activeCampuses = rawCampuses.filter(c => c.status === 'ACTIVE' || !c.status);
    const result = activeCampuses.length > 0 ? activeCampuses : rawCampuses;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching campuses:", error);
    return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
  }
}
