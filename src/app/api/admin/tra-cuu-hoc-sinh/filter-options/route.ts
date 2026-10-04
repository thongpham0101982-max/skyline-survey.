import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [academicYears, campuses, classes] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { name: "desc" },
        select: { id: true, name: true, status: true },
      }),
      prisma.campus.findMany({
        orderBy: { campusName: "asc" },
        select: { id: true, campusName: true, campusCode: true },
      }),
      prisma.class.findMany({
        orderBy: [{ grade: "asc" }, { className: "asc" }],
        select: {
          id: true,
          className: true,
          grade: true,
          level: true,
          campusId: true,
          academicYearId: true,
        },
      }),
    ]);

    const activeYear = academicYears.find((y) => y.status === "ACTIVE") || academicYears[0];

    return NextResponse.json({
      success: true,
      data: {
        academicYears,
        campuses,
        classes,
        activeYearId: activeYear?.id || "",
        activeYearName: activeYear?.name || "",
      },
    });
  } catch (error: any) {
    console.error("Error fetching student lookup filter options:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi tải bộ lọc tra cứu: " + error.message },
      { status: 500 }
    );
  }
}
