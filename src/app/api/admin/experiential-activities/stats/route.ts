import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Missing academicYearId" }, { status: 400 });
    }

    // Fetch all Activity Groups registered in categories
    const allActivityGroups = await prisma.activityCategory.findMany({
      where: { type: "GROUP", status: "ACTIVE" },
      orderBy: { sortOrder: "asc" }
    });

    // Fetch GVBM Activities (ActivityRecord)
    const activityRecords = await prisma.activityRecord.findMany({
      where: { academicYearId },
      include: {
        teacher: true,
        catalog: { include: { group: true } },
        participants: {
          include: {
            student: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });

    // Fetch GVCB Projects (StudentProjectExperience)
    const projectExperiences = await prisma.studentProjectExperience.findMany({
      where: {
        student: {
          academicYearId
        }
      },
      include: {
        student: {
          include: {
            class: true
          }
        }
      }
    });

    // Set up stats trackers
    const gvbmTeacherNames = new Set<string>();
    const gvcnTeacherNames = new Set<string>();
    const gradeNames = new Set<string>();
    const uniqueActivities = new Set<string>();

    activityRecords.forEach(record => {
      const actName = record.name || record.catalog?.name;
      if (actName) uniqueActivities.add(actName.trim());
      
      if (record.teacher?.teacherName) {
        gvbmTeacherNames.add(record.teacher.teacherName.trim());
      }
      
      record.participants.forEach(p => {
        if (p.student?.class?.grade) {
          gradeNames.add(p.student.class.grade.trim());
        }
      });
    });

    projectExperiences.forEach(pe => {
      if (pe.projectName) uniqueActivities.add(pe.projectName.trim());
      
      if (pe.teacherName) {
        gvcnTeacherNames.add(pe.teacherName.trim());
      }
      
      if (pe.student?.class?.grade) {
        gradeNames.add(pe.student.class.grade.trim());
      }
    });

    // Group by Grade
    const gradeStats: Record<string, { grade: string, gvbmCount: number, gvcbCount: number, studentCount: Set<string> }> = {};

    activityRecords.forEach(record => {
      record.participants.forEach(p => {
        const grade = p.student?.class?.grade?.trim() || "Khác";
        if (!gradeStats[grade]) {
          gradeStats[grade] = { grade, gvbmCount: 0, gvcbCount: 0, studentCount: new Set() };
        }
        gradeStats[grade].studentCount.add(p.studentId);
      });
      
      const recordGrades = new Set(record.participants.map(p => p.student?.class?.grade?.trim() || "Khác"));
      recordGrades.forEach(grade => {
        if (!gradeStats[grade]) {
          gradeStats[grade] = { grade, gvbmCount: 0, gvcbCount: 0, studentCount: new Set() };
        }
        gradeStats[grade].gvbmCount += 1;
      });
    });

    projectExperiences.forEach(pe => {
      const grade = pe.student?.class?.grade?.trim() || "Khác";
      if (!gradeStats[grade]) {
        gradeStats[grade] = { grade, gvbmCount: 0, gvcbCount: 0, studentCount: new Set() };
      }
      gradeStats[grade].studentCount.add(pe.studentId);
      gradeStats[grade].gvcbCount += 1;
    });

    const statsByGrade = Object.values(gradeStats).map(g => ({
      grade: g.grade,
      gvbmCount: g.gvbmCount,
      gvcbCount: g.gvcbCount,
      totalCount: g.gvbmCount + g.gvcbCount,
      studentCount: g.studentCount.size
    })).sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));

    // Group by Activity Group (Nhóm hoạt động)
    const groupStatsMap: Record<string, { code: string, name: string, gvbmCount: number, gvcnCount: number, studentCount: Set<string> }> = {};

    allActivityGroups.forEach(g => {
      groupStatsMap[g.id] = {
        code: g.code,
        name: g.name,
        gvbmCount: 0,
        gvcnCount: 0,
        studentCount: new Set<string>()
      };
    });

    activityRecords.forEach(record => {
      const group = record.catalog?.group;
      const key = group?.id || "OTHER";
      if (!groupStatsMap[key]) {
        groupStatsMap[key] = {
          code: group?.code || "KHAC",
          name: group?.name || "Chưa phân nhóm",
          gvbmCount: 0,
          gvcnCount: 0,
          studentCount: new Set<string>()
        };
      }
      groupStatsMap[key].gvbmCount += 1;
      record.participants.forEach(p => {
        groupStatsMap[key].studentCount.add(p.studentId);
      });
    });

    projectExperiences.forEach(pe => {
      const matchedGroup = allActivityGroups.find(g => 
        (pe as any).category && (g.name.toLowerCase().includes((pe as any).category.toLowerCase()) || g.code.toLowerCase() === (pe as any).category.toLowerCase())
      );
      const key = matchedGroup?.id || "OTHER";
      if (!groupStatsMap[key]) {
        groupStatsMap[key] = {
          code: matchedGroup?.code || "GVCN",
          name: matchedGroup?.name || "Dự án GVCN / Khác",
          gvbmCount: 0,
          gvcnCount: 0,
          studentCount: new Set<string>()
        };
      }
      groupStatsMap[key].gvcnCount += 1;
      groupStatsMap[key].studentCount.add(pe.studentId);
    });

    const statsByGroup = Object.values(groupStatsMap).map(g => ({
      code: g.code,
      name: g.name,
      gvbmCount: g.gvbmCount,
      gvcnCount: g.gvcnCount,
      totalCount: g.gvbmCount + g.gvcnCount,
      studentCount: g.studentCount.size
    })).sort((a, b) => b.totalCount - a.totalCount);

    // Group by GVBM
    const gvbmStats: Record<string, { teacherName: string, activityCount: number, studentCount: Set<string> }> = {};
    activityRecords.forEach(record => {
      const teacherName = record.teacher?.teacherName?.trim() || "Chưa rõ";
      if (!gvbmStats[teacherName]) {
        gvbmStats[teacherName] = { teacherName, activityCount: 0, studentCount: new Set() };
      }
      gvbmStats[teacherName].activityCount += 1;
      record.participants.forEach(p => {
        gvbmStats[teacherName].studentCount.add(p.studentId);
      });
    });
    const statsByGvbm = Object.values(gvbmStats).map(g => ({
      teacherName: g.teacherName,
      activityCount: g.activityCount,
      studentCount: g.studentCount.size
    })).sort((a, b) => b.activityCount - a.activityCount);

    // Group by GVCN
    const gvcnStats: Record<string, { teacherName: string, projectCount: number, studentCount: Set<string> }> = {};
    projectExperiences.forEach(pe => {
      const teacherName = pe.teacherName?.trim() || "Chưa rõ";
      if (!gvcnStats[teacherName]) {
        gvcnStats[teacherName] = { teacherName, projectCount: 0, studentCount: new Set() };
      }
      gvcnStats[teacherName].projectCount += 1;
      gvcnStats[teacherName].studentCount.add(pe.studentId);
    });
    const statsByGvcn = Object.values(gvcnStats).map(g => ({
      teacherName: g.teacherName,
      projectCount: g.projectCount,
      studentCount: g.studentCount.size
    })).sort((a, b) => b.projectCount - a.projectCount);

    // Group by Activity
    const activityStats: Record<string, { name: string, creatorType: string, participantCount: number }> = {};
    activityRecords.forEach(record => {
      const name = (record.name || record.catalog?.name || "Hoạt động không tên").trim();
      if (!activityStats[name]) {
        activityStats[name] = { name, creatorType: "GVBM", participantCount: 0 };
      }
      activityStats[name].participantCount += record.participants.length;
    });
    projectExperiences.forEach(pe => {
      const name = (pe.projectName || "Dự án không tên").trim();
      if (!activityStats[name]) {
        activityStats[name] = { name, creatorType: "GVCN", participantCount: 0 };
      }
      activityStats[name].participantCount += 1;
    });
    const statsByActivity = Object.values(activityStats).map(a => ({
      name: a.name,
      creatorType: a.creatorType,
      participantCount: a.participantCount
    })).sort((a, b) => b.participantCount - a.participantCount);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalActivities: uniqueActivities.size,
          totalGrades: gradeNames.size,
          totalGvcn: gvcnTeacherNames.size,
          totalGvbm: gvbmTeacherNames.size,
        },
        statsByGrade,
        statsByGroup,
        statsByGvbm,
        statsByGvcn,
        statsByActivity
      }
    });

  } catch (error: any) {
    console.error("Error in experiential activities statistics API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
