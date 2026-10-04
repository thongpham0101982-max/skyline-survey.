import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const campusId = searchParams.get("campusId");
    const grade = searchParams.get("grade");
    const classId = searchParams.get("classId");
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim() || "";

    const where: any = {};
    if (academicYearId && academicYearId !== "all") {
      where.academicYearId = academicYearId;
    }
    if (level && level !== "all") {
      where.level = level;
    }
    if (category && category !== "all") {
      where.category = category;
    }

    const studentWhere: any = {};
    if (campusId && campusId !== "all") studentWhere.campusId = campusId;
    if (classId && classId !== "all") studentWhere.classId = classId;
    if (grade && grade !== "all") studentWhere.class = { grade: grade.toString() };

    if (Object.keys(studentWhere).length > 0) {
      where.students = {
        some: {
          student: studentWhere,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        {
          students: {
            some: {
              student: {
                OR: [
                  { studentName: { contains: search } },
                  { studentCode: { contains: search } },
                ],
              },
            },
          },
        },
      ];
    }

    const achievements = await prisma.achievement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: { select: { id: true, name: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                class: { select: { id: true, className: true, grade: true } },
                campus: { select: { id: true, campusName: true } },
              },
            },
          },
        },
      },
    });

    const counts = {
      quocTe: 0,
      quocGia: 0,
      thanhPho: 0,
      quan: 0,
      truong: 0,
      total: achievements.length,
    };

    achievements.forEach((ach) => {
      const lvl = (ach.level || "").toUpperCase();
      if (lvl.includes("QUOC_TE") || lvl.includes("VANG") || lvl === "5") counts.quocTe++;
      else if (lvl.includes("QUOC_GIA") || lvl.includes("BAC") || lvl === "4") counts.quocGia++;
      else if (lvl.includes("THANH_PHO") || lvl.includes("TINH") || lvl === "3") counts.thanhPho++;
      else if (lvl.includes("QUAN") || lvl.includes("HUYEN") || lvl === "2") counts.quan++;
      else counts.truong++;
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: counts,
        achievements,
      },
    });
  } catch (error: any) {
    console.error("Lỗi API tra cứu thành tích:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi tra cứu thành tích học sinh: " + error.message },
      { status: 500 }
    );
  }
}
