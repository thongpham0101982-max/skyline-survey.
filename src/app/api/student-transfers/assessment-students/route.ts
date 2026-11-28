// @ts-nocheck
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaffSession } from "@/lib/security-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireStaffSession();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const campusId = searchParams.get("campusId");
    const grade = searchParams.get("grade");

    const where: any = {
      status: "ACTIVE",
    };

    if (ctx.isGDCS && ctx.allowedCampusIds.length > 0) {
      if (campusId && !ctx.allowedCampusIds.includes(campusId)) {
        return NextResponse.json({ error: "Bạn không có quyền truy cập dữ liệu cơ sở này" }, { status: 403 });
      }
      where.campusId = { in: ctx.allowedCampusIds };
    }

    if (classId) {
      where.classId = classId;
    } else if (campusId) {
      where.campusId = campusId;
      if (grade) {
        where.class = { grade };
      }
    } else {
      return NextResponse.json({ error: "classId or campusId is required" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [
        { studentName: "asc" }
      ],
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        dateOfBirth: true,
        gender: true,
        classId: true,
        campusId: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            educationSystem: true,
          }
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

