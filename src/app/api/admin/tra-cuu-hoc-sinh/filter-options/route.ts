import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffSession } from "@/lib/security-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireStaffSession();
    if (!ctx) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const campusFilter = ctx.isGDCS && ctx.allowedCampusIds.length > 0 ? { id: { in: ctx.allowedCampusIds } } : {};
    const classCampusFilter = ctx.isGDCS && ctx.allowedCampusIds.length > 0 ? { campusId: { in: ctx.allowedCampusIds } } : {};

    const [academicYears, campuses, classes, exams] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { name: "desc" },
        select: { id: true, name: true, status: true },
      }),
      prisma.campus.findMany({
        where: campusFilter,
        orderBy: { campusName: "asc" },
        select: { id: true, campusName: true, campusCode: true },
      }),
      prisma.class.findMany({
        where: classCampusFilter,
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
      prisma.exam.findMany({
        orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
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
        exams,
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
