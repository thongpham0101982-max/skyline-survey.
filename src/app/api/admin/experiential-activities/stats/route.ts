import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDbJson } from "@/lib/experiential/formula";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const campusId = searchParams.get("campusId");
    const level = searchParams.get("level");
    const grade = searchParams.get("grade");
    const strand = searchParams.get("strand");

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (campusId && campusId !== "ALL") where.campusId = campusId;
    if (level && level !== "ALL") where.educationLevel = level;

    const activities = await prisma.activityRecord.findMany({
      where,
      include: {
        participants: true
      },
      orderBy: { createdAt: "desc" }
    });

    const filtered = activities.filter((act) => {
      const meta = parseDbJson<any>(act.locationId, {});
      if (strand && strand !== "ALL" && meta.strand !== strand) return false;
      if (grade && grade !== "ALL") {
        const gradesList = act.grades ? act.grades.split(",") : [];
        if (!gradesList.includes(grade)) return false;
      }
      return true;
    });

    let totalActivities = filtered.length;
    let totalClassesAssigned = 0;
    let totalStudentsEvaluated = 0;
    let completedClassesCount = 0;

    const ratingDistribution: Record<string, number> = {
      OUTSTANDING: 0,
      GOOD: 0,
      PASS: 0,
      NEEDS_SUPPORT: 0
    };

    const strandMap: Record<string, { count: number; totalScore: number; evaluatedCount: number }> = {
      BAN_THAN: { count: 0, totalScore: 0, evaluatedCount: 0 },
      XA_HOI: { count: 0, totalScore: 0, evaluatedCount: 0 },
      TU_NHIEN: { count: 0, totalScore: 0, evaluatedCount: 0 },
      HUONG_NGHIEP: { count: 0, totalScore: 0, evaluatedCount: 0 }
    };

    const criteriaStats: Record<string, { name: string; totalLevel: number; count: number }> = {};
    const classProgressList: any[] = [];

    filtered.forEach((act) => {
      const meta = parseDbJson<any>(act.locationId, {});
      const actStrand = meta.strand || "BAN_THAN";

      if (strandMap[actStrand]) {
        strandMap[actStrand].count += 1;
      }

      const assigned = meta.assignedClasses || [];
      totalClassesAssigned += assigned.length;

      assigned.forEach((cls: any) => {
        if (cls.status === "COMPLETED") completedClassesCount += 1;
        const totalSt = cls.totalStudents || 30;
        const evalSt = cls.evaluatedStudents || 0;
        const progressPct = totalSt > 0 ? Math.round((evalSt / totalSt) * 100) : 0;

        classProgressList.push({
          activityId: act.id,
          activityName: act.name,
          strand: actStrand,
          classId: cls.classId,
          className: cls.className,
          campusId: cls.campusId,
          campusCode: cls.campusCode,
          campusName: cls.campusName,
          grade: cls.grade,
          homeroomTeacherName: cls.homeroomTeacherName,
          totalStudents: totalSt,
          evaluatedStudents: evalSt,
          progressPercent: progressPct,
          status: cls.status || "DRAFT"
        });
      });

      act.participants.forEach((p) => {
        const pNote = parseDbJson<any>(p.note, {});
        if (pNote.finalResult && pNote.finalResult !== "CHUA_DANH_GIA") {
          totalStudentsEvaluated += 1;
          if (ratingDistribution[pNote.finalResult] !== undefined) {
            ratingDistribution[pNote.finalResult] += 1;
          }

          if (pNote.calculatedPercent !== null && strandMap[actStrand]) {
            strandMap[actStrand].totalScore += pNote.calculatedPercent;
            strandMap[actStrand].evaluatedCount += 1;
          }

          const scores = pNote.criteriaScores || {};
          Object.entries(scores).forEach(([critId, scoreVal]) => {
            const numScore = Number(scoreVal) || 0;
            if (numScore > 0) {
              if (!criteriaStats[critId]) {
                const critDef = (meta.criteria || []).find((c: any) => c.id === critId);
                criteriaStats[critId] = {
                  name: critDef?.name || critId,
                  totalLevel: 0,
                  count: 0
                };
              }
              criteriaStats[critId].totalLevel += numScore;
              criteriaStats[critId].count += 1;
            }
          });
        }
      });
    });

    const overallCompletionRate = totalClassesAssigned > 0 
      ? Math.round((completedClassesCount / totalClassesAssigned) * 100)
      : 0;

    const strandDistribution = Object.entries(strandMap).map(([k, v]) => ({
      strand: k,
      count: v.count,
      avgScore: v.evaluatedCount > 0 ? Math.round(v.totalScore / v.evaluatedCount) : 0
    }));

    const criteriaAverages = Object.entries(criteriaStats).map(([id, stat]) => ({
      id,
      name: stat.name,
      avgLevel: stat.count > 0 ? Number((stat.totalLevel / stat.count).toFixed(2)) : 0,
      count: stat.count
    }));

    return NextResponse.json({
      kpis: {
        totalActivities,
        totalClassesAssigned,
        totalStudentsEvaluated,
        overallCompletionRate
      },
      ratingDistribution,
      strandDistribution,
      criteriaAverages,
      classProgress: classProgressList
    });
  } catch (error: any) {
    console.error("GET /api/admin/experiential-activities/stats error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
  }
}
