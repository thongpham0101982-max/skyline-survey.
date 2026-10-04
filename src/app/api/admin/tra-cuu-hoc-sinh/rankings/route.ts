import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get("campusId");
    const grade = searchParams.get("grade");
    const classId = searchParams.get("classId");
    const term = searchParams.get("term") || "HK1"; // HK1, HK2, CN
    const rating = searchParams.get("rating");
    const q = searchParams.get("q")?.trim() || "";

    const studentWhere: any = {
      status: "ACTIVE",
    };

    if (campusId && campusId !== "all") {
      studentWhere.campusId = campusId;
    }
    if (classId && classId !== "all") {
      studentWhere.classId = classId;
    } else if (grade && grade !== "all") {
      studentWhere.class = { grade: grade.toString() };
    }

    if (q) {
      studentWhere.OR = [
        { studentName: { contains: q } },
        { studentCode: { contains: q } },
      ];
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        campus: true,
        class: true,
        termSummaries: {
          where: { semester: term },
          take: 1,
        },
        termScores: {
          where: { semester: term },
        },
      },
      orderBy: [{ class: { className: "asc" } }, { studentName: "asc" }],
      take: 200,
    });

    const distribution = {
      XUAT_SAC: 0,
      GIOI: 0,
      KHA: 0,
      DAT: 0,
      CHUA_DAT: 0,
    };

    const results = students.map((stu) => {
      const summary = stu.termSummaries[0];
      let gpa: number | null = summary?.gpa ? Number(summary.gpa) : null;
      let academicRating: string | null = summary?.academicRating || null;
      let conductRating: string = summary?.conductRating || "Tốt";
      let absences: number = summary?.absencesPermitted ?? 0;

      if (gpa === null && stu.termScores.length > 0) {
        const valid = stu.termScores.filter((t) => t.score !== null);
        if (valid.length > 0) {
          const sum = valid.reduce((acc, item) => acc + Number(item.score), 0);
          gpa = Number((sum / valid.length).toFixed(2));
        }
      }

      if (!academicRating && gpa !== null) {
        if (gpa >= 9.0) academicRating = "Xuất sắc";
        else if (gpa >= 8.0) academicRating = "Giỏi";
        else if (gpa >= 6.5) academicRating = "Khá";
        else if (gpa >= 5.0) academicRating = "Đạt";
        else academicRating = "Chưa đạt";
      }

      if (academicRating?.includes("Xuất sắc") || academicRating === "XUAT_SAC") distribution.XUAT_SAC += 1;
      else if (academicRating?.includes("Giỏi") || academicRating === "GIOI") distribution.GIOI += 1;
      else if (academicRating?.includes("Khá") || academicRating === "KHA") distribution.KHA += 1;
      else if (academicRating?.includes("Chưa đạt") || academicRating === "CHUA_DAT") distribution.CHUA_DAT += 1;
      else if (academicRating?.includes("Đạt") || academicRating === "DAT") distribution.DAT += 1;

      return {
        id: stu.id,
        studentId: stu.studentCode,
        fullName: stu.studentName,
        gender: stu.gender,
        className: stu.class?.className || "---",
        grade: stu.class?.grade,
        campusName: stu.campus?.campusName || "---",
        term,
        gpa,
        academicRating: academicRating || "Chưa xếp loại",
        conductRating,
        absences,
        feedback: summary?.notes || null,
      };
    });

    const filtered = rating && rating !== "all"
      ? results.filter((r) => {
          if (rating === "XUAT_SAC") return r.academicRating.includes("Xuất sắc");
          if (rating === "GIOI") return r.academicRating.includes("Giỏi");
          if (rating === "KHA") return r.academicRating.includes("Khá");
          if (rating === "DAT") return r.academicRating === "Đạt";
          if (rating === "CHUA_DAT") return r.academicRating.includes("Chưa đạt");
          return true;
        })
      : results;

    return NextResponse.json({
      success: true,
      data: {
        term,
        total: filtered.length,
        distribution,
        students: filtered,
      },
    });
  } catch (error: any) {
    console.error("Lỗi API tra cứu xếp loại:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
