import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId");
    const schoolBlock = searchParams.get("schoolBlock");
    const grade = searchParams.get("grade");
    const classId = searchParams.get("classId");
    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "15")));

    const where: any = {};

    if (campusId && campusId !== "all") {
      where.campusId = campusId;
    }
    if (classId && classId !== "all") {
      where.classId = classId;
    }
    if (status && status !== "all") {
      where.status = status;
    }

    const classWhere: any = {};
    if (grade && grade !== "all") {
      classWhere.grade = grade.toString();
    }
    if (schoolBlock === "MAM_NON") {
      classWhere.grade = {
        in: ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi", "Mam non", "0"],
      };
    } else if (schoolBlock === "TIEU_HOC") {
      classWhere.grade = { in: ["1", "2", "3", "4", "5"] };
    } else if (schoolBlock === "THCS") {
      classWhere.grade = { in: ["6", "7", "8", "9"] };
    } else if (schoolBlock === "THPT") {
      classWhere.grade = { in: ["10", "11", "12"] };
    }

    if (Object.keys(classWhere).length > 0) {
      where.class = classWhere;
    }

    if (q) {
      where.OR = [
        { studentName: { contains: q } },
        { studentCode: { contains: q } },
        {
          parents: {
            some: {
              parent: {
                OR: [
                  { fullName: { contains: q } },
                  { phone: { contains: q } },
                ],
              },
            },
          },
        },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ class: { grade: "asc" } }, { studentName: "asc" }],
        include: {
          class: true,
          campus: true,
          academicYear: true,
          parents: {
            include: {
              parent: true,
            },
          },
        },
      }),
    ]);

    const formatted = students.map((s) => {
      const primaryParent = s.parents[0]?.parent;
      return {
        id: s.id,
        studentId: s.studentCode,
        fullName: s.studentName,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        status: s.status,
        campusId: s.campusId,
        campusName: s.campus?.campusName || "Sky-Line",
        classId: s.classId,
        className: s.class?.className || "Chưa xếp lớp",
        grade: s.class?.grade ? parseInt(s.class.grade, 10) || null : null,
        schoolBlock: s.class?.level || "PHO_THONG",
        parentName: primaryParent?.fullName || null,
        parentPhone: primaryParent?.phone || null,
        parentEmail: primaryParent?.email || null,
        address: primaryParent?.address || s.campus?.address || null,
        enrollmentDate: s.convertedAt ? s.convertedAt.toISOString() : null,
        emergencyContact: primaryParent?.phone || null,
        allergies: s.studentTypeNote || null,
      };
    });

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      students: formatted,
    });
  } catch (error: any) {
    console.error("Lỗi API tra cứu hồ sơ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
