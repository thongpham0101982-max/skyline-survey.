import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDbJson } from "@/lib/experiential/formula";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const campusId = searchParams.get("campusId");
    const level = searchParams.get("level");
    const grade = searchParams.get("grade");
    const monthFilter = searchParams.get("month"); // e.g. "8", "9", "10", ... or "ALL"
    const evalStatusFilter = searchParams.get("evalStatus"); // "DA_DANH_GIA" | "DANG_DANH_GIA" | "CHUA_DANH_GIA" | "ALL"
    const classIdFilter = searchParams.get("classId"); // "ALL" or specific classId

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (campusId && campusId !== "ALL") where.campusId = campusId;
    if (level && level !== "ALL") where.educationLevel = level;

    // Get Academic Year Name
    let academicYearName = "2026-2027";
    if (academicYearId) {
      const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
      if (ay) academicYearName = ay.name;
    }

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

    // 2. Fetch Activity Records
    const activities = await prisma.activityRecord.findMany({
      where,
      include: {
        participants: true,
        catalog: true
      },
      orderBy: { createdAt: "desc" }
    });

    const filtered = activities.filter((act) => {
      if (grade && grade !== "ALL") {
        const gradesList = act.grades ? act.grades.split(",") : [];
        if (!gradesList.includes(grade)) return false;
      }
      return true;
    });

    // 3. School Months Initialization (Tháng 8 -> Tháng 5)
    const SCHOOL_MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
    const monthlyStatsMap: Record<number, {
      month: string;
      monthNumber: number;
      totalActivities: number;
      totalClassesAssigned: number;
      completedCount: number;
      inProgressCount: number;
      notStartedCount: number;
      completionRate: number;
    }> = {};

    SCHOOL_MONTHS.forEach(m => {
      monthlyStatsMap[m] = {
        month: `Tháng ${m}`,
        monthNumber: m,
        totalActivities: 0,
        totalClassesAssigned: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        completionRate: 0
      };
    });

    let totalActivities = filtered.length;
    let totalClassesAssigned = 0;
    let totalStudentsEvaluated = 0;
    let totalCompletedAssignments = 0;
    let totalInProgressAssignments = 0;
    let totalNotStartedAssignments = 0;

    const ratingDistribution: Record<string, number> = {
      OUTSTANDING: 0,
      GOOD: 0,
      PASS: 0,
      NEEDS_SUPPORT: 0
    };

    const criteriaStats: Record<string, { name: string; totalLevel: number; count: number }> = {};
    const classProgressList: any[] = [];

    const themeAxisMap: Record<string, { id: string; name: string; count: number; color: string }> = {
      DI_SAN: { id: "DI_SAN", name: "Di sản & Lịch sử", count: 0, color: "#d97706" },
      MOI_TRUONG: { id: "MOI_TRUONG", name: "Môi trường xanh", count: 0, color: "#059669" },
      STEM: { id: "STEM", name: "Khoa học & STEM", count: 0, color: "#0284c7" },
      NGON_NGU: { id: "NGON_NGU", name: "Ngôn ngữ & Hội nhập", count: 0, color: "#7c3aed" }
    };

    // Class Aggregate Summary Map
    const classSummaryMap: Record<string, {
      classId: string;
      className: string;
      campusName: string;
      campusCode: string;
      grade: string;
      level: string;
      homeroomTeacherName: string;
      subjectTeachersSet: Set<string>;
      totalAssigned: number;
      target: number;
      completedCount: number;
      inProgressCount: number;
      notStartedCount: number;
      totalStudents: number;
      evaluatedStudents: number;
      activities: any[];
    }> = {};

    filtered.forEach((act) => {
      const meta = parseDbJson<any>(act.locationId, {});
      const catMeta = parseDbJson<any>(act.catalog?.description, {});

      // Extract month
      let monthNumber: number | null = null;
      if (meta.month && typeof meta.month === 'number' && meta.month >= 1 && meta.month <= 12) {
        monthNumber = meta.month;
      } else {
        const timeCandidate = meta.timeRange || meta.timeFrame || meta.dateStr || act.name || '';
        const timeInfo = formatTimeFrameAndSemester(timeCandidate, academicYearName, meta.semester || act.semester);
        if (timeInfo && timeInfo.month !== null) {
          monthNumber = timeInfo.month;
        } else if (act.date) {
          const d = new Date(act.date);
          if (!isNaN(d.getTime())) {
            monthNumber = d.getMonth() + 1;
          }
        }
      }

      const monthLabel = monthNumber !== null ? `Tháng ${monthNumber}` : "Trong năm";

      // Register in monthly stats
      if (monthNumber !== null && monthlyStatsMap[monthNumber]) {
        monthlyStatsMap[monthNumber].totalActivities += 1;
      }

      // 4 Core Educational Themes
      const actThemeAxis = meta.themeAxis || catMeta.themeAxis || (() => {
        const text = `${act.name} ${meta.themeName || ''} ${meta.primarySubjectName || ''}`.toLowerCase();
        if (text.includes('di sản') || text.includes('lịch sử') || text.includes('bảo tàng') || text.includes('làng nghề') || text.includes('quân đội') || text.includes('trung thu')) return 'DI_SAN';
        if (text.includes('môi trường') || text.includes('nông nghiệp') || text.includes('sinh thái') || text.includes('thiên nhiên') || text.includes('xanh') || text.includes('vườn')) return 'MOI_TRUONG';
        if (text.includes('stem') || text.includes('khoa học') || text.includes('toán') || text.includes('công nghệ') || text.includes('robot')) return 'STEM';
        if (text.includes('tiếng anh') || text.includes('english') || text.includes('toàn cầu') || text.includes('văn hóa') || text.includes('ngôn ngữ')) return 'NGON_NGU';
        return 'DI_SAN';
      })();

      if (themeAxisMap[actThemeAxis]) {
        themeAxisMap[actThemeAxis].count += 1;
      }

      const assigned = meta.assignedClasses || [];
      totalClassesAssigned += assigned.length;

      assigned.forEach((cls: any) => {
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
            evalStatus = "CHUA_DANH_GIA";
          }
        }

        if (evalStatus === "DA_DANH_GIA") {
          totalCompletedAssignments += 1;
        } else if (evalStatus === "DANG_DANH_GIA") {
          totalInProgressAssignments += 1;
        } else {
          totalNotStartedAssignments += 1;
        }

        // Monthly bucket for assignments
        if (monthNumber !== null && monthlyStatsMap[monthNumber]) {
          monthlyStatsMap[monthNumber].totalClassesAssigned += 1;
          if (evalStatus === "DA_DANH_GIA") {
            monthlyStatsMap[monthNumber].completedCount += 1;
          } else if (evalStatus === "DANG_DANH_GIA") {
            monthlyStatsMap[monthNumber].inProgressCount += 1;
          } else {
            monthlyStatsMap[monthNumber].notStartedCount += 1;
          }
        }

        const isPreschoolClass = ['12 đến 18 tháng', '18 đến 24 tháng', '24 đến 36 tháng', '3 đến 4 tuổi', '4 đến 5 tuổi', '5 đến 6 tuổi'].includes(cls.grade) || (cls.className && cls.className.toLowerCase().includes('mầm non'));
        const target = isPreschoolClass ? 5 : 2;
        const classKey = cls.classId || cls.className;

        if (!classSummaryMap[classKey]) {
          classSummaryMap[classKey] = {
            classId: cls.classId || classKey,
            className: cls.className,
            campusName: cls.campusName || cls.campusCode,
            campusCode: cls.campusCode,
            grade: cls.grade,
            level: isPreschoolClass ? 'MAM_NON' : 'K12',
            homeroomTeacherName: cls.homeroomTeacherName || '',
            subjectTeachersSet: new Set<string>(),
            totalAssigned: 0,
            target,
            completedCount: 0,
            inProgressCount: 0,
            notStartedCount: 0,
            totalStudents: totalSt,
            evaluatedStudents: 0,
            activities: []
          };
        }

        const cSummary = classSummaryMap[classKey];
        cSummary.totalAssigned += 1;
        cSummary.evaluatedStudents += evalSt;
        if (cls.homeroomTeacherName && !cSummary.homeroomTeacherName) {
          cSummary.homeroomTeacherName = cls.homeroomTeacherName;
        }
        const leadT = cls.subjectTeacherName || cls.teacherName || meta.leadTeacherName;
        if (leadT) {
          cSummary.subjectTeachersSet.add(leadT);
        }

        if (evalStatus === 'DA_DANH_GIA') {
          cSummary.completedCount += 1;
        } else if (evalStatus === 'DANG_DANH_GIA') {
          cSummary.inProgressCount += 1;
        } else {
          cSummary.notStartedCount += 1;
        }

        const themeDisplayName = meta.themeName || catMeta.themeName || themeAxisMap[actThemeAxis]?.name || "Chủ đề giáo dục";
        const integratedSubs = Array.isArray(meta.integratedSubjects)
          ? meta.integratedSubjects.join(", ")
          : (meta.integratedSubjects || cls.subjectName || meta.primarySubjectName || "Liên môn");

        const activityItemSummary = {
          activityId: act.id,
          activityName: act.name,
          month: monthLabel,
          monthNumber,
          themeName: themeDisplayName,
          integratedSubjects: integratedSubs,
          location: meta.location || "Sky-Line",
          evalMode: meta.evalMode || "Bảng kiểm quan sát",
          homeroomTeacherName: cls.homeroomTeacherName || cSummary.homeroomTeacherName || "—",
          subjectTeacherName: leadT || "—",
          totalStudents: totalSt,
          evaluatedStudents: evalSt,
          progressPercent: progressPct,
          evalStatus,
          status: cls.status || "DRAFT"
        };

        cSummary.activities.push(activityItemSummary);

        // Class Progress detailed row
        classProgressList.push({
          activityId: act.id,
          activityName: act.name,
          month: monthLabel,
          monthNumber,
          date: act.date,
          themeName: themeDisplayName,
          educationalContent: meta.educationalContent || catMeta.educationalContent || "",
          integratedSubjects: integratedSubs,
          location: meta.location || "Sky-Line",
          evalMode: meta.evalMode || "Bảng kiểm quan sát",
          themeAxis: actThemeAxis,
          classId: cls.classId,
          className: cls.className,
          campusId: cls.campusId,
          campusCode: cls.campusCode,
          campusName: cls.campusName,
          grade: cls.grade,
          homeroomTeacherName: cls.homeroomTeacherName || cSummary.homeroomTeacherName || "—",
          subjectTeacherName: leadT || "—",
          totalStudents: totalSt,
          evaluatedStudents: evalSt,
          progressPercent: progressPct,
          evalStatus, // "DA_DANH_GIA" | "DANG_DANH_GIA" | "CHUA_DANH_GIA"
          status: cls.status || "DRAFT"
        });
      });

      // Student participants rating breakdown
      act.participants.forEach((p) => {
        const pNote = parseDbJson<any>(p.note, {});
        if (pNote.finalResult && pNote.finalResult !== "CHUA_DANH_GIA") {
          totalStudentsEvaluated += 1;
          if (ratingDistribution[pNote.finalResult] !== undefined) {
            ratingDistribution[pNote.finalResult] += 1;
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

    // Compute monthly completion rates
    Object.values(monthlyStatsMap).forEach(m => {
      m.completionRate = m.totalClassesAssigned > 0 
        ? Math.round((m.completedCount / m.totalClassesAssigned) * 100) 
        : 0;
    });

    const overallCompletionRate = totalClassesAssigned > 0 
      ? Math.round((totalCompletedAssignments / totalClassesAssigned) * 100)
      : 0;

    const criteriaAverages = Object.entries(criteriaStats).map(([id, stat]) => ({
      id,
      name: stat.name,
      avgLevel: stat.count > 0 ? Number((stat.totalLevel / stat.count).toFixed(2)) : 0,
      count: stat.count
    }));

    // Finalize Class Summary List
    const classSummaryList = Object.values(classSummaryMap).map((c) => {
      const isTargetMet = c.totalAssigned >= c.target;
      const missingCount = Math.max(0, c.target - c.totalAssigned);
      const overallProgressPercent = c.totalAssigned > 0 
        ? Math.round((c.completedCount / c.totalAssigned) * 100) 
        : 0;
      const subjectTeachers = Array.from(c.subjectTeachersSet).filter(Boolean);

      return {
        classId: c.classId,
        className: c.className,
        campusName: c.campusName,
        campusCode: c.campusCode,
        grade: c.grade,
        level: c.level,
        homeroomTeacherName: c.homeroomTeacherName || "—",
        subjectTeachersList: subjectTeachers,
        subjectTeachersText: subjectTeachers.join(", ") || "Chưa phân công",
        totalAssigned: c.totalAssigned,
        target: c.target,
        isTargetMet,
        missingCount,
        completedCount: c.completedCount,
        inProgressCount: c.inProgressCount,
        notStartedCount: c.notStartedCount,
        overallProgressPercent,
        totalStudents: c.totalStudents,
        evaluatedStudents: c.evaluatedStudents,
        activities: c.activities
      };
    });

    // Target compliance analytics
    const classesMeetingTarget = classSummaryList.filter(c => c.isTargetMet).length;
    const targetComplianceRate = classSummaryList.length > 0 
      ? Math.round((classesMeetingTarget / classSummaryList.length) * 100) 
      : 0;
    const atRiskClasses = classSummaryList.filter(c => !c.isTargetMet);

    // Apply secondary filters if requested (Month, Class, EvalStatus)
    let filteredClassProgress = classProgressList;
    if (monthFilter && monthFilter !== "ALL") {
      const targetMonthNum = Number(monthFilter.replace(/\D/g, ""));
      filteredClassProgress = filteredClassProgress.filter(cp => cp.monthNumber === targetMonthNum);
    }
    if (classIdFilter && classIdFilter !== "ALL") {
      filteredClassProgress = filteredClassProgress.filter(cp => cp.classId === classIdFilter || cp.className === classIdFilter);
    }
    if (evalStatusFilter && evalStatusFilter !== "ALL") {
      filteredClassProgress = filteredClassProgress.filter(cp => cp.evalStatus === evalStatusFilter);
    }

    return NextResponse.json({
      kpis: {
        totalActivities,
        totalClassesAssigned,
        totalStudentsEvaluated,
        overallCompletionRate,
        classesMeetingTarget,
        totalClassesTracked: classSummaryList.length,
        targetComplianceRate,
        totalCompletedAssignments,
        totalInProgressAssignments,
        totalNotStartedAssignments
      },
      monthlyStats: Object.values(monthlyStatsMap),
      evaluationStats: {
        completed: totalCompletedAssignments,
        inProgress: totalInProgressAssignments,
        notStarted: totalNotStartedAssignments,
        total: totalClassesAssigned,
        completedRate: totalClassesAssigned > 0 ? Math.round((totalCompletedAssignments / totalClassesAssigned) * 100) : 0,
        inProgressRate: totalClassesAssigned > 0 ? Math.round((totalInProgressAssignments / totalClassesAssigned) * 100) : 0,
        notStartedRate: totalClassesAssigned > 0 ? Math.round((totalNotStartedAssignments / totalClassesAssigned) * 100) : 0
      },
      classSummary: classSummaryList,
      classProgress: filteredClassProgress, // Detailed activities per class (supports client filtering)
      campusTLHNProgress, // 2-tier monitoring: GV Tổ TLHN theo cơ sở
      ratingDistribution,
      themeAxisDistribution: Object.values(themeAxisMap),
      targetCompliance: {
        totalClasses: classSummaryList.length,
        classesMeetingTarget,
        targetComplianceRate,
        preschoolTarget: 5,
        k12Target: 2,
        atRiskClassesCount: atRiskClasses.length,
        atRiskClasses: atRiskClasses.slice(0, 15)
      },
      criteriaAverages
    });
  } catch (error: any) {
    console.error("GET /api/admin/experiential-activities/stats error:", error);
    return NextResponse.json({ error: "Loi he thong: " + error.message }, { status: 500 });
  }
}
