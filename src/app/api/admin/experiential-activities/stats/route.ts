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

    // 1. Fetch Activity Catalogs for Campus TLHN Progress
    const catalogs = await prisma.activityCatalog.findMany({
      orderBy: { createdAt: "desc" }
    });

    const campusMap: Record<string, any> = {};

    catalogs.forEach((c) => {
      let meta: any = {};
      if (c.description && c.description.startsWith("{")) {
        try { meta = JSON.parse(c.description); } catch {}
      }
      if (academicYearId && meta.academicYearId && meta.academicYearId !== academicYearId) return;

      const allocated = meta.allocatedCampuses || [];
      allocated.forEach((alloc: any) => {
        const cKey = alloc.campusId || alloc.campusCode || "CHUNG";
        if (!campusMap[cKey]) {
          campusMap[cKey] = {
            campusId: alloc.campusId,
            campusCode: alloc.campusCode,
            campusName: alloc.campusName,
            tlhnTeacherName: alloc.tlhnTeacherName || "GV Tổ TLHN",
            totalDispatched: 0,
            pendingCount: 0, // CHUA_TIEP_NHAN
            receivedCount: 0, // DA_TIEP_NHAN
            deployedCount: 0, // DA_TRIEN_KHAI
            totalClassesDeployed: 0,
            activities: []
          };
        }

        campusMap[cKey].totalDispatched += 1;
        if (alloc.status === "DA_TRIEN_KHAI") {
          campusMap[cKey].deployedCount += 1;
          campusMap[cKey].totalClassesDeployed += (alloc.assignedClassesCount || 0);
        } else if (alloc.status === "DA_TIEP_NHAN") {
          campusMap[cKey].receivedCount += 1;
        } else {
          campusMap[cKey].pendingCount += 1;
        }

        campusMap[cKey].activities.push({
          catalogId: c.id,
          activityName: c.name,
          educationLevel: meta.educationLevel || c.level,
          status: alloc.status || "CHUA_TIEP_NHAN",
          receivedAt: alloc.receivedAt,
          deployedAt: alloc.deployedAt
        });
      });
    });

    const campusTLHNProgress = Object.values(campusMap).map((cm: any) => ({
      ...cm,
      deployRate: cm.totalDispatched > 0 ? Math.round((cm.deployedCount / cm.totalDispatched) * 100) : 0
    }));

    // 2. Fetch Activity Records for Class GVCN & GVBM Evaluation Progress
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
        const progressPct = cls.progressPercent !== undefined ? cls.progressPercent : (totalSt > 0 ? Math.round((evalSt / totalSt) * 100) : 0);

        let evalStatus = cls.evalStatus;
        if (!evalStatus) {
          if (cls.status === "COMPLETED" || progressPct >= 100) {
            evalStatus = "DA_DANH_GIA";
          } else if (evalSt > 0) {
            evalStatus = "DANG_DANH_GIA";
          } else {
            evalStatus = "DA_TIEP_NHAN";
          }
        }

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
          homeroomTeacherName: cls.homeroomTeacherName || "",
          subjectTeacherName: cls.subjectTeacherName || cls.teacherName || "",
          subjectName: cls.subjectName || meta.primarySubjectName || "",
          totalStudents: totalSt,
          evaluatedStudents: evalSt,
          progressPercent: progressPct,
          evalStatus, // "DA_TIEP_NHAN" | "DANG_DANH_GIA" | "DA_DANH_GIA"
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
      campusTLHNProgress, // 2-tier monitoring: GV Tổ TLHN theo cơ sở
      ratingDistribution,
      strandDistribution,
      criteriaAverages,
      classProgress: classProgressList // 2-tier monitoring: GVCN & GVBM theo lớp
    });
  } catch (error: any) {
    console.error("GET /api/admin/experiential-activities/stats error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
  }
}
