import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MILESTONES = [
  { key: "KSDV", label: "Khảo sát đầu vào" },
  { key: "KSDN", label: "Khảo sát đầu năm" },
  { key: "GK1", label: "Giữa kỳ 1" },
  { key: "CK1", label: "Cuối kỳ 1" },
  { key: "GK2", label: "Giữa kỳ 2" },
  { key: "CK2", label: "Cuối kỳ 2" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const evaluationPeriod = searchParams.get("evaluationPeriod");

    // Case 1: Individual Student 6-Period Progression
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          campus: true,
          class: true,
        },
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy học sinh" }, { status: 404 });
      }

      const gradeEntries = await prisma.subjectGradeEntry.findMany({
        where: {
          studentId: student.id,
          ...(evaluationPeriod && evaluationPeriod !== "all" ? { evaluationPeriod } : {}),
        },
        include: {
          subject: true,
        },
        orderBy: [{ evaluationPeriod: "asc" }, { subject: { subjectName: "asc" } }],
      });

      const periodAverages: Record<string, { sum: number; count: number }> = {
        KSDV: { sum: 0, count: 0 },
        KSDN: { sum: 0, count: 0 },
        GK1: { sum: 0, count: 0 },
        CK1: { sum: 0, count: 0 },
        GK2: { sum: 0, count: 0 },
        CK2: { sum: 0, count: 0 },
      };

      const subjectMap: Record<string, {
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        grades: Record<string, { score: number | null; teacherComment: string | null }>;
      }> = {};

      gradeEntries.forEach((entry) => {
        const pKey = entry.evaluationPeriod?.toUpperCase() || "";
        let norm = "";
        if (pKey.includes("KSDV") || pKey.includes("DAU_VAO")) norm = "KSDV";
        else if (pKey.includes("KSDN") || pKey.includes("DAU_NAM")) norm = "KSDN";
        else if (pKey.includes("GK1") || pKey.includes("GIUA_KY_1")) norm = "GK1";
        else if (pKey.includes("CK1") || pKey.includes("CUOI_KY_1")) norm = "CK1";
        else if (pKey.includes("GK2") || pKey.includes("GIUA_KY_2")) norm = "GK2";
        else if (pKey.includes("CK2") || pKey.includes("CUOI_KY_2")) norm = "CK2";

        const score = entry.compositeScore !== null ? Number(entry.compositeScore) : null;
        if (norm && score !== null) {
          if (periodAverages[norm]) {
            periodAverages[norm].sum += score;
            periodAverages[norm].count += 1;
          }
        }

        const subId = entry.subjectId;
        if (!subjectMap[subId]) {
          subjectMap[subId] = {
            subjectId: entry.subjectId,
            subjectName: entry.subject?.subjectName || "Môn học",
            subjectCode: entry.subject?.subjectCode || "",
            grades: {},
          };
        }

        if (norm) {
          subjectMap[subId].grades[norm] = {
            score,
            teacherComment: entry.remark || null,
          };
        }
      });

      let prevAvg: number | null = null;
      const trajectory = MILESTONES.map((m) => {
        const item = periodAverages[m.key];
        const avg = item && item.count > 0 ? Number((item.sum / item.count).toFixed(2)) : null;
        let delta: number | null = null;
        if (avg !== null && prevAvg !== null) {
          delta = Number((avg - prevAvg).toFixed(2));
        }
        if (avg !== null) prevAvg = avg;

        return {
          period: m.key,
          label: m.label,
          average: avg,
          count: item ? item.count : 0,
          delta,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          student: {
            id: student.id,
            studentId: student.studentCode,
            fullName: student.studentName,
            className: student.class?.className || "Chưa xếp lớp",
            campusName: student.campus?.campusName || "Sky-Line",
          },
          trajectory,
          subjects: Object.values(subjectMap),
        },
      });
    }

    // Case 2: Class Gradebook Matrix (6 periods)
    if (classId && classId !== "all") {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          campus: true,
          students: {
            where: { status: "ACTIVE" },
            orderBy: { studentName: "asc" },
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              gender: true,
            },
          },
        },
      });

      if (!cls) {
        return NextResponse.json({ success: false, error: "Không tìm thấy lớp học" }, { status: 404 });
      }

      const studentIds = cls.students.map((s) => s.id);
      const allGrades = await prisma.subjectGradeEntry.findMany({
        where: {
          studentId: { in: studentIds },
          ...(evaluationPeriod && evaluationPeriod !== "all" ? { evaluationPeriod } : {}),
        },
        include: {
          subject: true,
        },
      });

      const studentGradesMap: Record<string, Record<string, { sum: number; count: number }>> = {};
      studentIds.forEach((sId) => {
        studentGradesMap[sId] = {
          KSDV: { sum: 0, count: 0 },
          KSDN: { sum: 0, count: 0 },
          GK1: { sum: 0, count: 0 },
          CK1: { sum: 0, count: 0 },
          GK2: { sum: 0, count: 0 },
          CK2: { sum: 0, count: 0 },
        };
      });

      allGrades.forEach((g) => {
        const pKey = g.evaluationPeriod?.toUpperCase() || "";
        let norm = "";
        if (pKey.includes("KSDV") || pKey.includes("DAU_VAO")) norm = "KSDV";
        else if (pKey.includes("KSDN") || pKey.includes("DAU_NAM")) norm = "KSDN";
        else if (pKey.includes("GK1") || pKey.includes("GIUA_KY_1")) norm = "GK1";
        else if (pKey.includes("CK1") || pKey.includes("CUOI_KY_1")) norm = "CK1";
        else if (pKey.includes("GK2") || pKey.includes("GIUA_KY_2")) norm = "GK2";
        else if (pKey.includes("CK2") || pKey.includes("CUOI_KY_2")) norm = "CK2";

        const score = g.compositeScore !== null ? Number(g.compositeScore) : null;
        if (norm && score !== null && studentGradesMap[g.studentId]) {
          studentGradesMap[g.studentId][norm].sum += score;
          studentGradesMap[g.studentId][norm].count += 1;
        }
      });

      const matrix = cls.students.map((s) => {
        const pScores = studentGradesMap[s.id] || {};
        const scores: Record<string, number | null> = {};
        MILESTONES.forEach((m) => {
          const item = pScores[m.key];
          scores[m.key] = item && item.count > 0 ? Number((item.sum / item.count).toFixed(2)) : null;
        });

        return {
          id: s.id,
          studentId: s.studentCode,
          fullName: s.studentName,
          gender: s.gender,
          scores,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          classInfo: {
            id: cls.id,
            className: cls.className,
            grade: cls.grade,
            campusName: cls.campus?.campusName || "Sky-Line",
            totalStudents: cls.students.length,
          },
          milestones: MILESTONES,
          matrix,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Vui lòng chọn học sinh hoặc lớp học" }, { status: 400 });
  } catch (error: any) {
    console.error("Lỗi API tra cứu điểm 6 kỳ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
